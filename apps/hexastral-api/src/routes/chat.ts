/**
 * Reading Chat Routes
 *
 * POST /api/chat               — 发送消息（创建/继续对话）
 * GET  /api/chat/:type/:id     — 加载阅读的对话历史
 *
 * 计费/分层 (ADR-0013 §3):
 *   - tier 由 user_entitlements 决定 (resolveChatTier): free 试用 / pro 订阅 / universe 跨 app
 *   - free: 每 reading 前 FREE_TASTE_MESSAGES_PER_READING 条免费，超出 → 402 upsell
 *   - 订阅 (fate/yuan/cycle/universe): 应用内无限，由 K.4 日 guard 限滥用（无月度计量），超 → 429 fair_use_limited
 * */

import { and, asc, eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { nanoid } from 'nanoid'
import { z } from 'zod/v4'
import { conversationMessages, conversations, users } from '../db/schema'
import type { AppEnv } from '../infra-types'
import { FREE_TASTE_MESSAGES_PER_READING, resolveChatTier } from '../lib/access/capabilities'
import { callAstro } from '../lib/astro-client'
import { requireUserId } from '../lib/auth'
import { resolvePortfolioTargetApp } from '../lib/portfolio-target-app'
import { buildReadingContext, trimContextBundle } from '../lib/reading-context-builder'
import { getActiveEntitlements } from '../services/entitlements'
import {
  evaluateLlmGuard,
  type LlmGuardConfig,
  type LlmGuardSubject,
  recordLlmGuardGrant,
} from '../services/shared/llm-guard'

export const chatRoutes = new Hono<AppEnv>()

/**
 * Fair-use abuse cap for subscription chat (ADR-0013 §3). Subscriptions are
 * "unlimited" within the app; this only stops abuse via a generous daily ceiling —
 * it is NOT a metered allowance. A non-`allow_llm` decision → 429 (try later),
 * never a template or upsell (the user already pays). Tune limits with real data.
 */
const CHAT_FAIRUSE_GUARD_CONFIG: LlmGuardConfig = {
  app: 'chat',
  dailyLimitAnon: 0, // anon/free never reach the guard (free-taste 402s earlier)
  dailyLimitSigned: 120, // generous — only a heavy-abuse ceiling, not normal use
  lifetimePeakPass: 0, // subscribers get no peak pass — they are already unlimited
  globalDailyBudget: 50_000, // platform-wide chat abuse ceiling
  noRollover: true,
  noPeriodicRefill: true,
}

const sendMessageSchema = z.object({
  readingType: z.enum([
    'natal',
    'stellar',
    'yiching',
    'pair',
    'physiognomy',
    'report',
    'feng',
    'cycle',
  ]),
  readingId: z.string().min(1),
  message: z.string().min(1).max(2000),
  requestId: z.string().min(1),
})

/** POST /api/chat — 发送消息，获取 AI 回复 */
chatRoutes.post('/', async (c) => {
  const userId = requireUserId(c)
  const body = await c.req.json()
  const input = sendMessageSchema.parse(body)
  const db = c.get('db')
  const targetApp = resolvePortfolioTargetApp(c.req.header('x-target-app'))

  // Rate limiting
  const { success: rateLimitOk } = await c.env.RATE_LIMITER.limit({ key: userId })
  if (!rateLimitOk) throw new HTTPException(429, { message: 'Rate limited' })

  const user = await db
    .select({
      locale: users.locale,
      portfolioMemoryEnabled: users.portfolioMemoryEnabled,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get()
  if (!user) throw new HTTPException(404, { message: 'User not found' })

  const entitlements = await getActiveEntitlements(db, userId)
  const activeEntitlements = entitlements.map((e) => e.key)
  const subscriberPlan =
    entitlements.find((e) => e.plan === 'monthly' || e.plan === 'annual')?.plan ?? 'free'
  const access = resolveChatTier({
    entitlements: activeEntitlements,
    readingType: input.readingType,
    targetApp,
  })
  const chatTier = access.tier
  const isPaid = chatTier !== 'free'

  const freeCap = FREE_TASTE_MESSAGES_PER_READING

  // Read (don't create) the conversation so the free-taste cap is enforced before
  // any side effects (conversation create, context build, LLM call).
  let conv = await db
    .select({ id: conversations.id, freeMessagesUsed: conversations.freeMessagesUsed })
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, userId),
        eq(conversations.readingId, input.readingId),
        eq(conversations.targetApp, targetApp)
      )
    )
    .get()

  // Free-taste exhausted → surface this app's paywall product (no LLM, no writes).
  if (!isPaid && (conv?.freeMessagesUsed ?? 0) >= freeCap) {
    return c.json(
      {
        error: 'upgrade_required',
        tier: 'free',
        capability: access.capability,
        upsell: access.upsellProductId,
      },
      402
    )
  }

  // Build the layered reading-context bundle (L1 primary + L2 user brief + L4 memory).
  const bundle = await buildReadingContext({
    db,
    env: c.env,
    userId,
    readingType: input.readingType,
    readingId: input.readingId,
    query: input.message,
    targetApp,
    subscriberPlan,
    tier: chatTier,
  })

  if (!conv) {
    const convId = nanoid()
    await db.insert(conversations).values({
      id: convId,
      userId,
      targetApp,
      readingType: input.readingType,
      readingId: input.readingId,
      messageCount: 0,
      freeMessagesUsed: 0,
    })
    conv = { id: convId, freeMessagesUsed: 0 }
  }

  // Load recent message history (last 20)
  const history = await db
    .select({ role: conversationMessages.role, content: conversationMessages.content })
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conv.id))
    .orderBy(asc(conversationMessages.createdAt))
    .limit(6)

  // Build Gemini-format message history + new user message
  const geminiMessages = [
    ...history.map((m) => ({
      role: m.role as 'user' | 'model',
      content: m.content,
    })),
    { role: 'user' as const, content: input.message },
  ]

  let chatBillingMode: 'free' | 'subscription' = 'free'
  let incrementFreeMessages = false
  let recordFairUseGrant = false
  const guardSubject: LlmGuardSubject = { kind: 'user', id: userId }

  if (!isPaid) {
    chatBillingMode = 'free'
    incrementFreeMessages = true
  } else {
    const guard = await evaluateLlmGuard(c.env, {
      subject: guardSubject,
      config: CHAT_FAIRUSE_GUARD_CONFIG,
    })
    if (guard.decision !== 'allow_llm') {
      throw new HTTPException(429, { message: 'fair_use_limited' })
    }
    chatBillingMode = 'subscription'
    recordFairUseGrant = true
  }

  // CC.6 — trim the bundle to the context budget before sending (L2 always kept).
  const { bundle: trimmedBundle, droppedLayers } = trimContextBundle(bundle, chatTier)
  if (droppedLayers.length > 0) {
    c.header('x-chat-context-dropped', droppedLayers.join(','))
  }

  // Call svc-astro chat with the structured context bundle (CC.5).
  const astroResp = await callAstro<{ reply: string }>(c.env.SVC_ASTRO, '/chat', {
    context: trimmedBundle,
    messages: geminiMessages,
    isPro: isPaid,
    locale: user.locale ?? 'zh-CN',
  })

  const userMsgId = nanoid()
  const assistantMsgId = nanoid()
  const now = new Date().toISOString()

  // Persist user message + assistant reply + update counts
  await db.batch([
    db.insert(conversationMessages).values({
      id: userMsgId,
      conversationId: conv.id,
      targetApp,
      role: 'user',
      content: input.message,
      createdAt: now,
    }),
    db.insert(conversationMessages).values({
      id: assistantMsgId,
      conversationId: conv.id,
      targetApp,
      role: 'assistant',
      content: astroResp.reply,
      createdAt: new Date(Date.now() + 1).toISOString(),
    }),
    db
      .update(conversations)
      .set({
        messageCount: history.length + 2,
        freeMessagesUsed: incrementFreeMessages
          ? sql`${conversations.freeMessagesUsed} + 1`
          : conversations.freeMessagesUsed,
        updatedAt: now,
      })
      .where(eq(conversations.id, conv.id)),
  ])

  // Fair-use accounting: count this subscription message against the daily abuse
  // ceiling only AFTER the reply succeeded (svc-astro throws above on failure).
  if (recordFairUseGrant) {
    await recordLlmGuardGrant(c.env, {
      subject: guardSubject,
      config: CHAT_FAIRUSE_GUARD_CONFIG,
      consumesPeakPass: false,
    })
  }

  // Per-reading free-taste remaining (free tier only; subscriptions are unlimited).
  const freeUsed = (conv.freeMessagesUsed ?? 0) + (incrementFreeMessages ? 1 : 0)

  return c.json({
    conversationId: conv.id,
    reply: astroResp.reply,
    isPro: isPaid,
    tier: chatTier,
    billingMode: chatBillingMode,
    freeMessagesRemaining: chatBillingMode === 'free' ? Math.max(0, freeCap - freeUsed) : null,
    portfolioMemory: {
      enabled: Boolean(user.portfolioMemoryEnabled),
      hitCount: bundle.memory.hitCount,
    },
  })
})

/** GET /api/chat/:type/:readingId — 加载对话历史 */
chatRoutes.get('/:type/:readingId', async (c) => {
  const userId = requireUserId(c)
  const readingId = c.req.param('readingId')
  const db = c.get('db')
  const targetApp = resolvePortfolioTargetApp(c.req.header('x-target-app'))

  const conv = await db
    .select({ id: conversations.id, messageCount: conversations.messageCount })
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, userId),
        eq(conversations.readingId, readingId),
        eq(conversations.targetApp, targetApp)
      )
    )
    .get()

  if (!conv) {
    return c.json({ conversationId: null, messages: [] })
  }

  const messages = await db
    .select({
      id: conversationMessages.id,
      role: conversationMessages.role,
      content: conversationMessages.content,
      createdAt: conversationMessages.createdAt,
    })
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conv.id))
    .orderBy(asc(conversationMessages.createdAt))

  return c.json({ conversationId: conv.id, messages, messageCount: conv.messageCount })
})
