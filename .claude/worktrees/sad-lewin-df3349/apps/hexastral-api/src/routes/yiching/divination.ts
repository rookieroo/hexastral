/**
 * 易经占卜路由 — 六爻 / 梅花易数
 */

import { and, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod/v4'
import { dailyActivity, divinations, users } from '../../db/schema'
import type { AppEnv } from '../../infra-types'
import { checkReadingAccess, isProUser } from '../../lib/access-check'
import { callAstro, callAstroGet } from '../../lib/astro-client'
import { requireUserId } from '../../lib/auth'
import { logEvent } from '../../lib/event-log'
import { singlePurchases } from '../../db/schema'
import {
  checkDivinationGuard,
  recordDivinationSuccess,
} from '../../services/shared/divination-guard'

const divinationInputSchema = z.object({
  question: z.string().min(2).max(500),
  entropy: z.string().min(16),
  userId: z.string().min(1),
  language: z.string().optional().default('zh-CN'),
  method: z.enum(['liuyao', 'meihua']).optional().default('liuyao'),
  requestId: z.string().min(1),
})

const bookmarkSchema = z.object({
  bookmarked: z.boolean(),
})

const ratingSchema = z.object({
  rating: z.int().min(1).max(5),
})

/** 占卜 — 核心接口 */
export const divinationRoutes = new Hono<AppEnv>()
  .post('/', async (c) => {
    const body = await c.req.json()
    const input = divinationInputSchema.parse(body)
    input.userId = requireUserId(c)
    const db = c.get('db')

    // 检查用户
    const user = await db.select().from(users).where(eq(users.id, input.userId)).get()
    if (!user) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    // ── 禁忌守卫 ──────────────────────────────────────────────────
    const guard = await checkDivinationGuard(input.question, input.userId, {
      GUARD_KV: c.env.GUARD_KV,
      AI: c.env.AI,
    })
    if (!guard.allowed) {
      return c.json({ error: 'guard_blocked', guardKey: guard.guardKey, reason: guard.reason }, 429)
    }

    // ── 访问鉴权（Pro 配额 or 单次购买）──────────────────────────────────────
    const access = await checkReadingAccess(db, input.userId, 'divination')
    if (!access.granted) {
      return c.json(
        { error: 'purchase_required', iapProductId: access.iapProductId, price: access.price },
        402
      )
    }
    const purchaseId = access.via === 'single_purchase' ? access.purchaseId : null

    const isPro = isProUser(user)

    // 执行占卜 (via svc-astro)
    const reading = await callAstro<{
      hexagram: { number: number; name: string; changingLines: number[] }
      interpretation: string
      advice: string
      summary: string
      fortune: string
    }>(c.env.SVC_ASTRO, '/yiching/cast', {
      question: input.question,
      entropy: input.entropy,
      userId: input.userId,
      language: input.language,
      method: input.method,
      isPro,
    })

    // 保存记录
    const divinationId = crypto.randomUUID()
    await db.insert(divinations).values({
      id: divinationId,
      userId: input.userId,
      question: input.question,
      hexagramNumber: reading.hexagram.number,
      hexagramName: reading.hexagram.name,
      changingLines: JSON.stringify(reading.hexagram.changingLines),
      interpretation: reading.interpretation,
      advice: reading.advice,
      summary: reading.summary,
      fortune: reading.fortune as
        | 'great-fortune'
        | 'fortune'
        | 'neutral'
        | 'caution'
        | 'misfortune',
      method: input.method,
      entropySource: input.entropy,
    })

    // 核销单次购买（如果是单次付费路径）
    if (purchaseId) {
      await db
        .update(singlePurchases)
        .set({ status: 'consumed', readingId: divinationId, consumedAt: new Date().toISOString() })
        .where(eq(singlePurchases.id, purchaseId))
    }

    // 更新用户统计
    await db
      .update(users)
      .set({
        totalDivinations: (user.totalDivinations ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, input.userId))

    // 记录守卫成功（精确哈希 + 语义向量 + 日计数）
    c.executionCtx.waitUntil(
      Promise.all([
        recordDivinationSuccess(input.question, input.userId, {
          GUARD_KV: c.env.GUARD_KV,
          AI: c.env.AI,
        }),
        logEvent(db, input.userId, 'divination_yiching', { divinationId }),
      ])
    )

    // 更新每日活跃
    const today = new Date().toISOString().split('T')[0]!
    const existingActivity = await db
      .select()
      .from(dailyActivity)
      .where(and(eq(dailyActivity.userId, input.userId), eq(dailyActivity.date, today)))
      .get()

    if (existingActivity) {
      await db
        .update(dailyActivity)
        .set({ divinationCount: existingActivity.divinationCount + 1 })
        .where(eq(dailyActivity.id, existingActivity.id))
    } else {
      await db.insert(dailyActivity).values({
        id: crypto.randomUUID(),
        userId: input.userId,
        date: today,
        divinationCount: 1,
      })
    }

    return c.json({
      data: {
        id: divinationId,
        ...reading,
        disclaimer: 'reading_disclaimer',
      },
      meta: {
        isPro,
      },
    })
  })

  /** 获取占卜历史 */
  .get('/history/:userId', async (c) => {
    const userId = requireUserId(c)
    const limit = Math.min(Number(c.req.query('limit') ?? '20') || 20, 100)
    const offset = Math.min(Number(c.req.query('offset') ?? '0') || 0, 10000)
    const db = c.get('db')

    const history = await db
      .select()
      .from(divinations)
      .where(eq(divinations.userId, userId))
      .orderBy(desc(divinations.createdAt))
      .limit(limit)
      .offset(offset)

    return c.json({ data: history })
  })

  /** 获取单条占卜详情 */
  .get('/:id', async (c) => {
    const id = c.req.param('id')
    const db = c.get('db')

    const record = await db.select().from(divinations).where(eq(divinations.id, id)).get()
    if (!record) {
      throw new HTTPException(404, { message: 'Divination not found' })
    }

    const userId = requireUserId(c)
    if (record.userId !== userId) throw new HTTPException(403, { message: 'Forbidden' })

    // 附上完整卦象数据 (via svc-astro)
    const hexagram = await callAstroGet<Record<string, unknown>>(
      c.env.SVC_ASTRO,
      `/yiching/hexagrams/${record.hexagramNumber}`
    ).catch((err) => {
      console.warn(`[yiching] Hexagram ${record.hexagramNumber} fetch failed:`, err)
      return null
    })

    return c.json({
      data: {
        ...record,
        changingLines: JSON.parse(record.changingLines),
        hexagramData: hexagram ?? null,
      },
    })
  })

  /** 收藏/取消收藏 */
  .patch('/:id/bookmark', zValidator('json', bookmarkSchema), async (c) => {
    const userId = requireUserId(c)
    const id = c.req.param('id')
    const { bookmarked } = c.req.valid('json')
    const db = c.get('db')

    const record = await db
      .select({ userId: divinations.userId })
      .from(divinations)
      .where(eq(divinations.id, id))
      .get()
    if (!record) throw new HTTPException(404, { message: 'Reading not found' })
    if (record.userId !== userId) throw new HTTPException(403, { message: 'Forbidden' })

    await db.update(divinations).set({ bookmarked }).where(eq(divinations.id, id))

    return c.json({ data: { bookmarked } })
  })

  /** 评分 */
  .patch('/:id/rating', zValidator('json', ratingSchema), async (c) => {
    const userId = requireUserId(c)
    const id = c.req.param('id')
    const { rating } = c.req.valid('json')
    const db = c.get('db')

    const record = await db
      .select({ userId: divinations.userId })
      .from(divinations)
      .where(eq(divinations.id, id))
      .get()
    if (!record) throw new HTTPException(404, { message: 'Reading not found' })
    if (record.userId !== userId) throw new HTTPException(403, { message: 'Forbidden' })

    await db.update(divinations).set({ rating }).where(eq(divinations.id, id))

    return c.json({ data: { rating } })
  })

  /** DELETE /:id — remove own divination row (history list) */
  .delete('/:id', async (c) => {
    const userId = requireUserId(c)
    const id = c.req.param('id')
    const db = c.get('db')

    const record = await db
      .select({ userId: divinations.userId })
      .from(divinations)
      .where(eq(divinations.id, id))
      .get()
    if (!record) throw new HTTPException(404, { message: 'Divination not found' })
    if (record.userId !== userId) throw new HTTPException(403, { message: 'Forbidden' })

    await db.delete(divinations).where(eq(divinations.id, id))

    return c.json({ ok: true })
  })

  /** 获取用户配额 (credits + 订阅状态) */
  .get('/quota/:userId', async (c) => {
    const userId = requireUserId(c)
    const db = c.get('db')

    const user = await db.select().from(users).where(eq(users.id, userId)).get()
    if (!user) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    const isPremium = isProUser(user)

    return c.json({
      data: {
        isPremium,
        canGenerate: isPremium,
      },
    })
  })

  /** 获取收藏列表 */
  .get('/bookmarks/:userId', async (c) => {
    const userId = requireUserId(c)
    const db = c.get('db')

    const bookmarks = await db
      .select()
      .from(divinations)
      .where(and(eq(divinations.userId, userId), eq(divinations.bookmarked, true)))
      .orderBy(desc(divinations.createdAt))

    return c.json({ data: bookmarks })
  })
