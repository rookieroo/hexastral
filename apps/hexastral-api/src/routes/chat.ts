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
import { conversationMessages, conversations, portfolioReadings, users } from '../db/schema'
import type { AppEnv } from '../infra-types'
import { FREE_TASTE_MESSAGES_PER_READING, resolveChatTier } from '../lib/access/capabilities'
import { alertAdmin } from '../lib/admin-alert'
import { callAstro } from '../lib/astro-client'
import { requireUserId } from '../lib/auth'
import { moderationRefusal, screenChatText } from '../lib/chat-moderation'
import {
  portfolioTargetBrandLabel,
  resolvePortfolioTargetApp,
} from '../lib/portfolio-target-app'
import { buildReadingContext, trimContextBundle } from '../lib/reading-context-builder'
import { auditFengChatReply, fengChatComplianceRefusal } from '../lib/feng-chat-compliance'
import { checkFengChatAccess, isFengDevProBypass } from '../lib/feng-chat-access'
import { getActiveEntitlements } from '../services/entitlements'
import { consumeProAllowance } from '../services/pro-allowance'
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
  /** Optional reply-tone steer (client chat config); forwarded to svc-astro. */
  tone: z.enum(['warm', 'balanced', 'direct']).optional(),
  /**
   * Device / UI locale from the satellite app. Prefer over users.locale —
   * many clients never sync profile locale (Syel UI can be zh while D1 is en).
   */
  locale: z.string().min(2).max(16).optional(),
})

/** Prefer request locale, then reading locale, then profile, then zh. */
function resolveChatLocale(opts: {
  requestLocale: string | undefined
  readingLocale: string | null | undefined
  userLocale: string | null | undefined
}): string {
  const pick = (raw: string | null | undefined): string | null => {
    const t = raw?.trim()
    return t && t.length >= 2 ? t : null
  }
  return pick(opts.requestLocale) ?? pick(opts.readingLocale) ?? pick(opts.userLocale) ?? 'zh'
}

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

  // Reading locale (portfolio) — Syel faceoracle rows store the job locale here.
  let readingLocale: string | null = null
  if (input.readingType === 'physiognomy' || input.readingType === 'report') {
    const row = await db
      .select({ locale: portfolioReadings.locale })
      .from(portfolioReadings)
      .where(and(eq(portfolioReadings.id, input.readingId), eq(portfolioReadings.userId, userId)))
      .get()
    readingLocale = row?.locale ?? null
  }

  const chatLocale = resolveChatLocale({
    requestLocale: input.locale,
    readingLocale,
    userLocale: user.locale,
  })

  // Self-heal profile locale when the client sends a device locale that differs
  // (kindred/Syel historically never sync users.locale on open).
  if (input.locale && input.locale.trim() && input.locale.trim() !== (user.locale ?? '')) {
    c.executionCtx.waitUntil(
      db
        .update(users)
        .set({ locale: input.locale.trim() })
        .where(eq(users.id, userId))
        .then(() => undefined)
        .catch((err) => {
          console.warn('[chat] failed to sync users.locale', err)
        })
    )
  }

  // Content moderation (App Store 1.2) — screen the user message BEFORE any LLM
  // call / billing / writes. Blocked input → a safe refusal, no side effects.
  const inputScreen = screenChatText(input.message)
  if (!inputScreen.allowed) {
    c.executionCtx.waitUntil(
      alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
        title: 'Chat input blocked by moderation',
        message: 'A user chat message was blocked before reaching the LLM.',
        level: 'warning',
        context: { userId, category: inputScreen.category ?? '', targetApp },
      }).catch(() => {})
    )
    return c.json({
      conversationId: '',
      reply: moderationRefusal(chatLocale),
      isPro: false,
      tier: 'free',
      billingMode: 'free',
      freeMessagesRemaining: null,
      moderated: true,
    })
  }

  const entitlements = await getActiveEntitlements(db, userId)
  const activeEntitlements = entitlements.map((e) => e.key)
  const subscriberPlan =
    entitlements.find((e) => e.plan === 'monthly' || e.plan === 'annual')?.plan ?? 'free'
  const access = resolveChatTier({
    entitlements: activeEntitlements,
    readingType: input.readingType,
    targetApp,
  })

  // Fēng: chat is bundled with a purchased / subscribed report — no free taste.
  let fengChatGranted = false
  if (input.readingType === 'feng') {
    const env = c.env as { ALLOW_DEV_PRO?: string; DEV_PRO_USER_IDS?: string }
    const devPro = isFengDevProBypass(env, userId, c.req.header('x-feng-dev-pro'))
    const fengAccess = await checkFengChatAccess(db, userId, input.readingId, { devPro })
    if (!fengAccess.granted) {
      const code =
        fengAccess.code === 'FENG_ANALYZE_PENDING'
          ? 'FENG_ANALYZE_PENDING'
          : 'FENG_CHAT_REQUIRES_PURCHASE'
      return c.json(
        {
          error: code,
          tier: 'free',
          capability: access.capability,
          upsell: access.upsellProductId,
        },
        402
      )
    }
    fengChatGranted = true
  }

  const chatTier = fengChatGranted ? 'pro' : access.tier
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

  // Yuel Pro monthly chat allowance — Pro is "更宽裕的额度", not unlimited. Meter the
  // kindred 追问 at PRO_MONTHLY_LIMITS.chat/month (the shared daily abuse guard still
  // applies on top). Soft cap → a structured 'quota_exhausted' (with resetsOn), no LLM
  // and no writes. Scoped to kindred so other apps' chat is unaffected.
  if (isPaid && access.capability === 'kindred') {
    const allowance = await consumeProAllowance(db, userId, 'chat')
    if (!allowance.granted) {
      return c.json(
        {
          error: 'quota_exhausted',
          feature: 'chat',
          used: allowance.used,
          limit: allowance.limit,
          resetsOn: allowance.resetsOn,
        },
        429
      )
    }
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

  // Call svc-astro chat with the structured context bundle (CC.5). If the LLM
  // chain is exhausted / times out, surface a clean retryable envelope ('chat_
  // unavailable') rather than letting the throw become a raw 500/504 — the
  // client can parse this and show an error + retry instead of a silent hang.
  let astroResp: { reply: string }
  try {
    astroResp = await callAstro<{ reply: string }>(c.env.SVC_ASTRO, '/chat', {
      context: {
        ...trimmedBundle,
        user: { ...trimmedBundle.user, locale: chatLocale },
      },
      messages: geminiMessages,
      isPro: isPaid,
      locale: chatLocale,
      tone: input.tone,
    })
  } catch (err) {
    console.warn('[chat] svc-astro chat failed', err)
    throw new HTTPException(503, { message: 'chat_unavailable' })
  }

  // Output moderation — replace an objectionable AI reply with a safe refusal
  // before it is persisted or returned.
  const outputScreen = screenChatText(astroResp.reply)
  if (!outputScreen.allowed) {
    c.executionCtx.waitUntil(
      alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
        title: 'Chat AI reply blocked by moderation',
        message: 'An AI reply was blocked and replaced before persist.',
        level: 'error',
        context: { userId, category: outputScreen.category ?? '', targetApp },
      }).catch(() => {})
    )
    astroResp = { reply: moderationRefusal(chatLocale) }
  }

  // Kanyu feng-forbidden tier (金蟾/文昌塔/提升运势…) — synthesis already audits;
  // chat must match so App Review samples on follow-ups do not slip talismans.
  if (input.readingType === 'feng') {
    const fengAudit = auditFengChatReply(astroResp.reply)
    if (fengAudit.blocked) {
      console.warn('[chat] feng forbidden phrases in reply', {
        userId,
        hits: fengAudit.hits,
        targetApp,
      })
      c.executionCtx.waitUntil(
        alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
          title: 'Feng chat reply blocked by portfolio voice audit',
          message: 'A feng chat reply contained forbidden talisman/outcome phrasing.',
          level: 'warning',
          context: {
            userId,
            patterns: fengAudit.hits.map((h) => h.pattern).join(','),
            targetApp,
          },
        }).catch(() => {})
      )
      astroResp = { reply: fengChatComplianceRefusal(chatLocale) }
    }
  }

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
    assistantMessageId: assistantMsgId,
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

/**
 * POST /api/chat/feedback — thumbs up/down on an assistant message (D1).
 * `feedback: null` clears the rating. User-role messages are rejected.
 */
const feedbackSchema = z.object({
  messageId: z.string().min(1),
  feedback: z.enum(['up', 'down']).nullable(),
})

chatRoutes.post('/feedback', async (c) => {
  const userId = requireUserId(c)
  const { messageId, feedback } = feedbackSchema.parse(await c.req.json())
  const db = c.get('db')

  const row = await db
    .select({
      role: conversationMessages.role,
      ownerId: conversations.userId,
    })
    .from(conversationMessages)
    .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
    .where(eq(conversationMessages.id, messageId))
    .get()

  if (!row || row.ownerId !== userId) {
    throw new HTTPException(404, { message: 'message not found' })
  }
  if (row.role !== 'assistant') {
    throw new HTTPException(400, { message: 'feedback_assistant_only' })
  }

  await db
    .update(conversationMessages)
    .set({ feedback })
    .where(eq(conversationMessages.id, messageId))

  return c.json({ ok: true, feedback })
})

/**
 * POST /api/chat/report — flag an AI message as objectionable (App Store 1.2).
 * Verifies the message belongs to the caller, then dispatches to admin-notify.
 * Telegram gets targetApp + messageId for triage; full body stays in D1.
 */
const reportSchema = z.object({
  messageId: z.string().min(1),
  reason: z.string().max(500).optional(),
})

chatRoutes.post('/report', async (c) => {
  const userId = requireUserId(c)
  const { messageId } = reportSchema.parse(await c.req.json())
  const db = c.get('db')
  const targetApp = resolvePortfolioTargetApp(c.req.header('x-target-app'))
  const brand = portfolioTargetBrandLabel(targetApp)

  const row = await db
    .select({
      role: conversationMessages.role,
      ownerId: conversations.userId,
    })
    .from(conversationMessages)
    .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
    .where(eq(conversationMessages.id, messageId))
    .get()

  if (!row || row.ownerId !== userId) {
    throw new HTTPException(404, { message: 'message not found' })
  }

  c.executionCtx.waitUntil(
    alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
      title: `[${brand}] Chat message reported`,
      message: 'A user reported an AI chat message as objectionable.',
      level: 'warning',
      context: {
        targetApp,
        brand,
        userId,
        messageId,
        role: row.role,
      },
    }).catch(() => {})
  )

  return c.json({ ok: true })
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
      feedback: conversationMessages.feedback,
      createdAt: conversationMessages.createdAt,
    })
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conv.id))
    .orderBy(asc(conversationMessages.createdAt))

  return c.json({ conversationId: conv.id, messages, messageCount: conv.messageCount })
})

/**
 * DELETE /api/chat/:type/:readingId — 开始新对话.
 *
 * Clears this reading's conversation context (deletes its messages, resets the
 * display count) but KEEPS the conversation row, so `freeMessagesUsed` survives:
 * a new conversation gives a fresh context, never a way to refill the free-taste
 * cap. Idempotent — a no-op when no conversation exists yet.
 */
chatRoutes.delete('/:type/:readingId', async (c) => {
  const userId = requireUserId(c)
  const readingId = c.req.param('readingId')
  const db = c.get('db')
  const targetApp = resolvePortfolioTargetApp(c.req.header('x-target-app'))

  const conv = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, userId),
        eq(conversations.readingId, readingId),
        eq(conversations.targetApp, targetApp)
      )
    )
    .get()

  if (conv) {
    await db.batch([
      db.delete(conversationMessages).where(eq(conversationMessages.conversationId, conv.id)),
      db
        .update(conversations)
        .set({ messageCount: 0, updatedAt: new Date().toISOString() })
        .where(eq(conversations.id, conv.id)),
    ])
  }

  return c.json({ ok: true })
})
