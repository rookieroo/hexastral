/**
 * Reading Chat Routes
 *
 * POST /api/chat               — 发送消息（创建/继续对话）
 * GET  /api/chat/:type/:id     — 加载阅读的对话历史
 *
 * 计费逻辑:
 *   1. 每条阅读前 CHAT_FREE_PER_READING 条免费（记录在 conversations.freeMessagesUsed）
 *   2. Pro 用户超出免费限后从月度 chatPool 配额扣减
 *   3. chatPool 耗尽或非 Pro 用户: 消耗 users.chatCreditsRemaining（hexastral_chat_5 IAP）
 * */

import { and, asc, eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { nanoid } from 'nanoid'
import { z } from 'zod/v4'
import {
  conversationMessages,
  conversations,
  divinations,
  pairReadings,
  physiognomyReadings,
  reportChapters,
  userCharts,
  users,
} from '../db/schema'
import type { AppDb, AppEnv } from '../infra-types'
import { isProUser } from '../lib/access-check'
import { callAstro } from '../lib/astro-client'
import { requireUserId } from '../lib/auth'
import {
  type PortfolioMemoryTargetApp,
  searchPortfolioReadingMemory,
} from '../lib/portfolio-memory'
import { resolvePortfolioTargetApp } from '../lib/portfolio-target-app'
import type { SubscriptionPlan } from '../services/quota'
import { consumeChatCredit, consumeProChatPool, PLAN_QUOTA_LIMITS } from '../services/quota'

export const chatRoutes = new Hono<AppEnv>()

const sendMessageSchema = z.object({
  readingType: z.enum(['natal', 'stellar', 'yiching', 'pair', 'physiognomy', 'report']),
  readingId: z.string().min(1),
  message: z.string().min(1).max(2000),
  requestId: z.string().min(1),
})

type ReadingType = 'natal' | 'stellar' | 'yiching' | 'pair' | 'physiognomy' | 'report'

/**
 * Fetch reading interpretation text to supply as chat context.
 * Returns only the AI text snapshot — not raw coordinates.
 */
async function getReadingContext(
  db: AppDb,
  readingType: ReadingType,
  readingId: string,
  userId: string
): Promise<string> {
  switch (readingType) {
    case 'natal': {
      const row = await db
        .select({
          interpretationFree: userCharts.interpretationFree,
          interpretationPro: userCharts.interpretationPro,
        })
        .from(userCharts)
        .where(and(eq(userCharts.id, readingId), eq(userCharts.userId, userId)))
        .get()
      if (!row) throw new HTTPException(404, { message: 'Reading not found' })
      const interp = row.interpretationPro ?? row.interpretationFree ?? ''
      return typeof interp === 'string' ? interp : JSON.stringify(interp)
    }
    case 'stellar': {
      const row = await db
        .select({
          interpretationFree: userCharts.interpretationFree,
          interpretationPro: userCharts.interpretationPro,
        })
        .from(userCharts)
        .where(and(eq(userCharts.id, readingId), eq(userCharts.userId, userId)))
        .get()
      if (!row) throw new HTTPException(404, { message: 'Reading not found' })
      const interp = row.interpretationPro ?? row.interpretationFree ?? ''
      return typeof interp === 'string' ? interp : JSON.stringify(interp)
    }
    case 'yiching': {
      const row = await db
        .select({ interpretation: divinations.interpretation, advice: divinations.advice })
        .from(divinations)
        .where(and(eq(divinations.id, readingId), eq(divinations.userId, userId)))
        .get()
      if (!row) throw new HTTPException(404, { message: 'Reading not found' })
      return `${row.interpretation ?? ''}\n\n${row.advice ?? ''}`
    }
    case 'pair': {
      const row = await db
        .select({ interpretation: pairReadings.interpretation })
        .from(pairReadings)
        .where(and(eq(pairReadings.id, readingId), eq(pairReadings.userId, userId)))
        .get()
      if (!row) throw new HTTPException(404, { message: 'Reading not found' })
      return row.interpretation
    }
    case 'physiognomy': {
      const row = await db
        .select({ interpretation: physiognomyReadings.interpretation })
        .from(physiognomyReadings)
        .where(and(eq(physiognomyReadings.id, readingId), eq(physiognomyReadings.userId, userId)))
        .get()
      if (!row) throw new HTTPException(404, { message: 'Reading not found' })
      return row.interpretation ?? ''
    }
    case 'report': {
      const sep = readingId.indexOf('-')
      if (sep <= 0) throw new HTTPException(400, { message: 'Invalid report reading id' })
      const ownerUserId = readingId.slice(0, sep)
      const chapter = readingId.slice(sep + 1)
      if (ownerUserId !== userId) throw new HTTPException(403, { message: 'Forbidden' })
      const row = await db
        .select({ contentJson: reportChapters.contentJson })
        .from(reportChapters)
        .where(
          and(
            eq(reportChapters.userId, userId),
            eq(reportChapters.chapter, chapter),
            eq(reportChapters.isCurrent, true)
          )
        )
        .get()
      if (!row) throw new HTTPException(404, { message: 'Reading not found' })
      return row.contentJson
    }
  }
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

  // Get user for pro check (+ free Flash quota for icebreaker strategy)
  const user = await db
    .select({
      subscriptionStatus: users.subscriptionStatus,
      subscriptionPlan: users.subscriptionPlan,
      locale: users.locale,
      freeChatQuota: users.freeChatQuota,
      portfolioMemoryEnabled: users.portfolioMemoryEnabled,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get()
  if (!user) throw new HTTPException(404, { message: 'User not found' })

  const isPro = isProUser(user)

  const plan = (user.subscriptionPlan as SubscriptionPlan | null) ?? 'monthly'
  const chatFreePerReading = PLAN_QUOTA_LIMITS[plan].chatFreePerReading

  // Get reading context
  const readingContext = await getReadingContext(db, input.readingType, input.readingId, userId)

  // Find or create conversation
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

  // ── 分层计费 ────────────────────────────────────────────────────────────────────────
  // chatBillingMode: 'free' | 'pool' | 'chat_credits' | 'flash_quota'
  //   'flash_quota' — Free 用户终身 3 次破冰 Flash 对话（账户级强核销，归零后弹 Paywall）
  let chatBillingMode: 'free' | 'pool' | 'chat_credits' | 'flash_quota' = 'chat_credits'
  let incrementFreeMessages = false
  let consumeFlashQuota = false

  if (isPro) {
    // Pro users: first chatFreePerReading messages per reading are free, then monthly chatPool
    if ((conv.freeMessagesUsed ?? 0) < chatFreePerReading) {
      chatBillingMode = 'free'
      incrementFreeMessages = true
    } else {
      const { decided } = await consumeProChatPool(db, userId)
      if (decided === 'free') {
        chatBillingMode = 'pool'
      } else {
        // Pool exhausted — consume IAP credits
        const creditResult = await consumeChatCredit(db, userId)
        if (!creditResult.success) {
          throw new HTTPException(402, { message: 'no_chat_credits' })
        }
        chatBillingMode = 'chat_credits'
      }
    }
  } else {
    // Free 用户：先消费每条阅读的 2 次 in-thread 体验额度，
    // 再消费终身 3 次 Flash 破冰额度 (freeChatQuota)，
    // 最后才看是否还有付费 chat credits（IAP）。
    const perReadingLimit = 2
    const lifetimeQuota = user.freeChatQuota ?? 0

    if ((conv.freeMessagesUsed ?? 0) < perReadingLimit) {
      chatBillingMode = 'free'
      incrementFreeMessages = true
    } else if (lifetimeQuota > 0) {
      chatBillingMode = 'flash_quota'
      consumeFlashQuota = true
    } else {
      // Lifetime Flash quota exhausted — try IAP credits, otherwise prompt Paywall
      const creditResult = await consumeChatCredit(db, userId)
      if (!creditResult.success) {
        throw new HTTPException(402, { message: 'flash_quota_exhausted' })
      }
      chatBillingMode = 'chat_credits'
    }
  }

  // Optional portfolio-memory recall — pulls past reading excerpts that match the
  // user's question and injects them into the system prompt.  No-op if user opted out
  // or if PORTFOLIO_MEMORY_AI_SEARCH is unbound (sandbox / preview).
  let memoryContext = ''
  let memoryHitCount = 0
  if (user.portfolioMemoryEnabled) {
    const memoryTarget = (
      targetApp === 'coincast' || targetApp === 'dreamoracle' ? targetApp : 'hexastral'
    ) as PortfolioMemoryTargetApp
    const mem = await searchPortfolioReadingMemory(c.env, {
      userId,
      targetApp: memoryTarget,
      query: input.message,
      requestId: input.requestId,
      locale: user.locale ?? undefined,
    })
    memoryContext = mem.context
    memoryHitCount = mem.hitCount
  }

  // Call svc-astro chat
  const astroResp = await callAstro<{ reply: string }>(c.env.SVC_ASTRO, '/chat', {
    readingContext,
    memoryContext: memoryContext.length > 0 ? memoryContext : undefined,
    messages: geminiMessages,
    isPro,
    locale: user.locale ?? 'zh-CN',
  })

  const userMsgId = nanoid()
  const assistantMsgId = nanoid()
  const now = new Date().toISOString()

  // Persist user message + assistant reply + update counts (+ atomic Flash quota decrement)
  const writes = [
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
  ] as const
  if (consumeFlashQuota) {
    await db.batch([
      ...writes,
      // WHERE freeChatQuota > 0 prevents underflow if a parallel write already drained it
      db
        .update(users)
        .set({ freeChatQuota: sql`${users.freeChatQuota} - 1` })
        .where(and(eq(users.id, userId), sql`${users.freeChatQuota} > 0`)),
    ])
  } else {
    await db.batch([...writes])
  }

  // Compute remaining free messages for response
  const effectiveFreeLimit = isPro ? chatFreePerReading : 2
  const freeUsed = (conv.freeMessagesUsed ?? 0) + (incrementFreeMessages ? 1 : 0)
  const flashQuotaRemaining = isPro
    ? null
    : Math.max(0, (user.freeChatQuota ?? 0) - (consumeFlashQuota ? 1 : 0))

  return c.json({
    conversationId: conv.id,
    reply: astroResp.reply,
    isPro,
    billingMode: chatBillingMode,
    freeMessagesRemaining: Math.max(0, effectiveFreeLimit - freeUsed),
    flashQuotaRemaining,
    portfolioMemory: { enabled: Boolean(user.portfolioMemoryEnabled), hitCount: memoryHitCount },
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
