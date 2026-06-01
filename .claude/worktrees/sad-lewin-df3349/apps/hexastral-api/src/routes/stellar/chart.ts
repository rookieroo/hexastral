/**
 * 星宫命盘路由
 */

import { calcGlobalTrueSolarTime } from '@zhop/astro-core/geo-time'
import { and, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod/v4'
import { dailyActivity, userCharts, users } from '../../db/schema'
import type { AppEnv } from '../../infra-types'
import { callAstro } from '../../lib/astro-client'
import { isProUser } from '../../lib/access-check'
import { requireUserId } from '../../lib/auth'
import {
  CURRENT_ENGINE_VERSION,
  computeInputHash,
  getCachedChart,
  getGlobalCachedInterpretation,
  incrementGlobalCacheHit,
  upsertChartCache,
  upsertGlobalInterpretation,
} from '../../lib/chart-cache'
import { logEvent } from '../../lib/event-log'
import { solarDateSchema } from '../../lib/validation'
import { checkChartGuard, recordChartSuccess } from '../../services/shared/divination-guard'
import type { PalaceSummary } from '../../types'

const chartInputSchema = z.object({
  solarDate: solarDateSchema,
  timeIndex: z.int().min(0).max(12),
  gender: z.enum(['男', '女']),
  longitude: z.number().optional(),
  latitude: z.number().optional(),
  timezoneId: z.string().optional(),
  city: z.string().optional(),
  userId: z.string().min(1),
  language: z.string().optional().default('zh-CN'),
  requestId: z.string().min(1),
})

const bookmarkSchema = z.object({
  bookmarked: z.boolean(),
})

const ratingSchema = z.object({
  rating: z.int().min(1).max(5),
})

/** POST / — 排盘 + AI 解读 */
export const chartRoutes = new Hono<AppEnv>()
  .post('/', async (c) => {
    const body = await c.req.json()
    const input = chartInputSchema.parse(body)
    input.userId = requireUserId(c)
    const db = c.get('db')

    const user = await db.select().from(users).where(eq(users.id, input.userId)).get()
    if (!user) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    const isPro = isProUser(user)

    const chartGuard = await checkChartGuard(
      'stellar',
      { solarDate: input.solarDate, timeIndex: input.timeIndex, gender: input.gender },
      input.userId,
      c.env.GUARD_KV
    )
    if (!chartGuard.allowed) {
      return c.json(
        { error: 'guard_blocked', guardKey: chartGuard.guardKey, reason: chartGuard.reason },
        429
      )
    }

    // 命格/星宫基础推演已免费，无需扣费

    // ── 命盘缓存: 相同出生信息 → 跳过排盘计算 ──
    // Apply True Solar Time correction for cache key when longitude is available
    let cacheSolarDate = input.solarDate
    let cacheTimeIndex = input.timeIndex
    if (input.longitude != null && input.timezoneId) {
      const [y, m, d] = input.solarDate.split('-').map(Number) as [number, number, number]
      const representativeHour = input.timeIndex * 2
      const localDatetime = new Date(y, m - 1, d, representativeHour)
      const tst = calcGlobalTrueSolarTime({
        localDatetime,
        timezoneId: input.timezoneId,
        longitude: input.longitude,
        cityName: input.city ?? undefined,
      })
      const corrected = tst.trueSolarTime
      const cY = corrected.getUTCFullYear()
      const cM = corrected.getUTCMonth() + 1
      const cD = corrected.getUTCDate()
      const cH = corrected.getUTCHours()
      cacheSolarDate = `${cY}-${cM}-${cD}`
      cacheTimeIndex = cH === 23 || cH === 0 ? 0 : Math.floor((cH + 1) / 2)
    }

    const cacheInput = {
      solarDate: cacheSolarDate,
      timeIndex: cacheTimeIndex,
      gender: input.gender,
      longitude: input.longitude,
      latitude: input.latitude,
      timezoneId: input.timezoneId,
      city: input.city,
      hemisphereReversalEnabled: user.hemisphereReversalEnabled ?? false,
    }
    const inputHash = await computeInputHash(cacheInput)
    const cached = await getCachedChart<{ palaces: PalaceSummary[]; meta: Record<string, string> }>(
      db,
      input.userId,
      'stellar',
      inputHash
    )

    let palaces: PalaceSummary[]
    let meta: Record<string, string>
    let interpretation: Record<string, string> | null = null
    let chartId: string

    if (cached && (isPro ? cached.interpretationPro : cached.interpretationFree)) {
      // 缓存命中 — 直接使用
      palaces = cached.chartData.palaces
      meta = cached.chartData.meta
      interpretation =
        ((isPro ? cached.interpretationPro : cached.interpretationFree) as Record<
          string,
          string
        >) ?? null
      chartId = cached.id
    } else {
      // ── L2: 全局跨用户缓存 — 相同星宫盘 = 相同解读 ──
      const globalCached = await getGlobalCachedInterpretation<{
        palaces: PalaceSummary[]
        meta: Record<string, string>
      }>(db, inputHash, 'stellar')

      if (globalCached?.fullReading) {
        // 全局缓存命中 — 跳过 svc-astro 调用
        palaces = globalCached.chartData.palaces
        meta = globalCached.chartData.meta
        interpretation = globalCached.fullReading

        const soulPalaceG = palaces.find((p) => p.name === '命宫')
        const majorStarNamesG = soulPalaceG?.majorStars.map((s) => s.name).join('、') ?? ''
        const displayHintsG = {
          fiveElementsClass: meta.fiveElementsClass,
          soulPalaceMajorStars: majorStarNamesG,
        }

        // 写入 per-user 缓存；递增全局命中计数
        chartId = await upsertChartCache(
          db,
          input.userId,
          'stellar',
          cacheInput,
          inputHash,
          { palaces, meta },
          interpretation,
          isPro,
          CURRENT_ENGINE_VERSION,
          displayHintsG
        )
        c.executionCtx.waitUntil(incrementGlobalCacheHit(db, inputHash, 'stellar'))
      } else {
        // 全局缓存也未命中 — 调用 svc-astro
        const result = await callAstro<{
          palaces: PalaceSummary[]
          meta: Record<string, string>
          horoscope: unknown
          interpretation: Record<string, string> | null
        }>(c.env.SVC_ASTRO, '/stellar/chart', { ...input, isPro, language: input.language })

        palaces = result.palaces
        meta = result.meta
        interpretation = result.interpretation

        const soulPalaceR = palaces.find((p) => p.name === '命宫')
        const majorStarNamesR = soulPalaceR?.majorStars.map((s) => s.name).join('、') ?? ''
        const displayHintsR = {
          fiveElementsClass: meta.fiveElementsClass,
          soulPalaceMajorStars: majorStarNamesR,
        }

        // 写入 per-user 缓存同步执行以获取 chartId；全局缓存异步写入
        chartId = await upsertChartCache(
          db,
          input.userId,
          'stellar',
          cacheInput,
          inputHash,
          { palaces, meta },
          interpretation,
          isPro,
          CURRENT_ENGINE_VERSION,
          displayHintsR
        )
        c.executionCtx.waitUntil(
          upsertGlobalInterpretation(
            db,
            inputHash,
            'stellar',
            { palaces, meta },
            null,
            interpretation,
            CURRENT_ENGINE_VERSION
          )
        )
      }
    }

    const soulPalace = palaces.find((p) => p.name === '命宫')
    const majorStarNames = soulPalace?.majorStars.map((s) => s.name).join('、') ?? ''

    const today = new Date().toISOString().split('T')[0]!

    await db
      .update(users)
      .set({
        totalReadings: user.totalReadings + 1,
        // Phase 4.8 — persist 命宫主星 used as static prompt context for
        // /signal/today and /report chapters. Pick the first major star;
        // if 命宫无主星 (vacant) we leave the prior value intact via ?? clause.
        ziweiMingPalaceStar:
          soulPalace?.majorStars[0]?.name ?? user.ziweiMingPalaceStar ?? null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, input.userId))

    c.executionCtx.waitUntil(
      Promise.all([
        recordChartSuccess(
          'stellar',
          { solarDate: input.solarDate, timeIndex: input.timeIndex, gender: input.gender },
          input.userId,
          c.env.GUARD_KV
        ),
        logEvent(db, input.userId, 'reading_stellar', { readingId: chartId }),
      ])
    )

    const activityId = `${input.userId}:${today}`
    const existing = await db
      .select()
      .from(dailyActivity)
      .where(eq(dailyActivity.id, activityId))
      .get()

    if (existing) {
      await db
        .update(dailyActivity)
        .set({ readingCount: existing.readingCount + 1 })
        .where(eq(dailyActivity.id, activityId))
    } else {
      await db.insert(dailyActivity).values({
        id: activityId,
        userId: input.userId,
        date: today,
        readingCount: 1,
      })
    }

    return c.json({
      data: {
        id: chartId,
        palaces,
        meta,
        interpretation: isPro ? interpretation : null,
        disclaimer: 'reading_disclaimer',
      },
      meta: { isPro },
    })
  })

  /** GET /history/:userId — 排盘历史 */
  .get('/history/:userId', async (c) => {
    const userId = requireUserId(c)
    const limit = Math.min(Number.parseInt(c.req.query('limit') ?? '20', 10) || 20, 100)
    const offset = Math.min(Number.parseInt(c.req.query('offset') ?? '0', 10) || 0, 10000)
    const db = c.get('db')

    const results = await db
      .select({
        id: userCharts.id,
        chartType: userCharts.chartType,
        solarDate: userCharts.solarDate,
        timeIndex: userCharts.timeIndex,
        gender: userCharts.gender,
        displayHints: userCharts.displayHints,
        bookmarked: userCharts.bookmarked,
        rating: userCharts.rating,
        updatedAt: userCharts.updatedAt,
        createdAt: userCharts.createdAt,
      })
      .from(userCharts)
      .where(and(eq(userCharts.userId, userId), eq(userCharts.chartType, 'stellar')))
      .orderBy(desc(userCharts.updatedAt))
      .limit(limit)
      .offset(offset)

    const records = results.map((r) => {
      const hints = r.displayHints ? (JSON.parse(r.displayHints) as Record<string, unknown>) : null
      return {
        id: r.id,
        chartType: r.chartType,
        solarDate: r.solarDate,
        timeIndex: r.timeIndex,
        gender: r.gender,
        fiveElementsClass: (hints?.fiveElementsClass as string | null | undefined) ?? null,
        soulPalaceMajorStars: (hints?.soulPalaceMajorStars as string | null | undefined) ?? null,
        bookmarked: r.bookmarked,
        rating: r.rating,
        updatedAt: r.updatedAt,
        createdAt: r.createdAt,
      }
    })

    return c.json({ data: records })
  })

  /** GET /:readingId — 获取单条命盘详情 */
  .get('/:readingId', async (c) => {
    const readingId = c.req.param('readingId')
    const db = c.get('db')

    const chart = await db.select().from(userCharts).where(eq(userCharts.id, readingId)).get()

    if (!chart) {
      throw new HTTPException(404, { message: 'Reading not found' })
    }

    const userId = requireUserId(c)
    if (chart.userId !== userId) throw new HTTPException(403, { message: 'Forbidden' })

    const chartData = JSON.parse(chart.chartData) as {
      palaces: PalaceSummary[]
      meta: Record<string, string>
    }
    const isPro = chart.interpretationPro != null
    const interpretation = isPro
      ? (JSON.parse(chart.interpretationPro!) as Record<string, string>)
      : chart.interpretationFree
        ? (JSON.parse(chart.interpretationFree) as Record<string, string>)
        : null

    return c.json({
      data: {
        id: chart.id,
        solarDate: chart.solarDate,
        timeIndex: chart.timeIndex,
        gender: chart.gender,
        palaces: chartData.palaces,
        meta: chartData.meta,
        interpretation,
        displayHints: chart.displayHints ? JSON.parse(chart.displayHints) : null,
        bookmarked: chart.bookmarked,
        rating: chart.rating,
        createdAt: chart.createdAt,
      },
    })
  })

  /** PATCH /:readingId/bookmark — 切换收藏 */
  .patch('/:readingId/bookmark', zValidator('json', bookmarkSchema), async (c) => {
    const userId = requireUserId(c)
    const readingId = c.req.param('readingId')
    const input = c.req.valid('json')
    const db = c.get('db')

    const record = await db
      .select({ userId: userCharts.userId })
      .from(userCharts)
      .where(eq(userCharts.id, readingId))
      .get()
    if (!record) throw new HTTPException(404, { message: 'Reading not found' })
    if (record.userId !== userId) throw new HTTPException(403, { message: 'Forbidden' })

    await db
      .update(userCharts)
      .set({ bookmarked: input.bookmarked })
      .where(eq(userCharts.id, readingId))

    return c.json({ data: { bookmarked: input.bookmarked } })
  })

  /** PATCH /:readingId/rating — 评分 */
  .patch('/:readingId/rating', zValidator('json', ratingSchema), async (c) => {
    const userId = requireUserId(c)
    const readingId = c.req.param('readingId')
    const input = c.req.valid('json')
    const db = c.get('db')

    const record = await db
      .select({ userId: userCharts.userId })
      .from(userCharts)
      .where(eq(userCharts.id, readingId))
      .get()
    if (!record) throw new HTTPException(404, { message: 'Reading not found' })
    if (record.userId !== userId) throw new HTTPException(403, { message: 'Forbidden' })

    await db.update(userCharts).set({ rating: input.rating }).where(eq(userCharts.id, readingId))

    return c.json({ data: { rating: input.rating } })
  })

  /** 查询用户配额 */
  .get('/quota/:userId', async (c) => {
    const userId = c.req.param('userId')
    const db = c.get('db')

    const user = await db.select().from(users).where(eq(users.id, userId)).get()
    if (!user) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    const isPremium = isProUser(user)
    const canGenerate = true // 基础排盘已免费

    return c.json({
      data: {
        subscriptionStatus: user.subscriptionStatus,
        canGenerate,
        isPremium,
      },
    })
  })
