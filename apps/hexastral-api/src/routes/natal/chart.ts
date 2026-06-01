/**
 * 命格速批路由
 */

import { calcGlobalTrueSolarTime } from '@zhop/astro-core/geo-time'
import { and, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import { userCharts, users } from '../../db/schema'
import type { AppEnv } from '../../infra-types'
import { userHasCapability } from '../../lib/access/entitlement-access'
import { callAstro } from '../../lib/astro-client'
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

const natalInputSchema = z.object({
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

/** POST / — 命格推演 + AI 解读 */
export const natalRoutes = new Hono<AppEnv>()
  .post('/', async (c) => {
    const body = await c.req.json()
    const input = natalInputSchema.parse(body)
    input.userId = requireUserId(c)
    const db = c.get('db')

    const user = await db.select().from(users).where(eq(users.id, input.userId)).get()
    if (!user) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    const isPro = await userHasCapability(db, input.userId, 'fate')

    const chartGuard = await checkChartGuard(
      'natal',
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

    type NatalChart = {
      solarTimeResult?: { displayNote?: string }
      hemisphereResult?: { note?: string }
      geju: {
        primary: string
        favorableElement: string
        unfavorableElement?: string
        dayMasterStrength?: string
      }
      pillars: {
        year: { stem: string; branch: string }
        month: { stem: string; branch: string }
        day: { stem: string; branch: string }
        hour: { stem: string; branch: string }
      }
      tiaohou?: { gods: unknown }
      [key: string]: unknown
    }

    // ── 命盘缓存: 相同出生信息 → 跳过排盘计算 ──
    // Apply True Solar Time correction for cache key when longitude is available
    let cacheSolarDate = input.solarDate
    let cacheTimeIndex = input.timeIndex
    if (input.longitude != null && input.timezoneId) {
      const [y, m, d] = input.solarDate.split('-').map(Number) as [number, number, number]
      const representativeHour = input.timeIndex * 2 // timeIndex 0=子(0h), 1=丑(2h), ...
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
      // Convert corrected hour back to timeIndex: 23 or 0 → 0, else floor((h+1)/2)
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
    const cached = await getCachedChart<NatalChart>(db, input.userId, 'natal', inputHash)

    let chart: NatalChart
    let hooks: Record<string, string> | null = null
    let interpretation: Record<string, string> | null = null
    let chartId: string

    if (cached && (isPro ? cached.interpretationPro : cached.interpretationFree)) {
      chart = cached.chartData
      const cachedData = (isPro ? cached.interpretationPro : cached.interpretationFree)!
      hooks = ((cachedData as Record<string, unknown>).hooks as Record<string, string>) ?? null
      interpretation =
        ((cachedData as Record<string, unknown>).full_reading as Record<string, string>) ?? null
      chartId = cached.id
    } else {
      // ── L2: 全局跨用户缓存 — 相同命格 = 相同解读 ──
      const globalCached = await getGlobalCachedInterpretation<NatalChart>(db, inputHash, 'natal')

      if (globalCached?.hooks && globalCached.fullReading) {
        // 全局缓存命中 — 跳过 SVC_ASTRO 调用
        chart = globalCached.chartData
        hooks = globalCached.hooks
        interpretation = globalCached.fullReading

        const cachePayload = { hooks, full_reading: interpretation }
        const displayHintsG = {
          dayMaster: chart.pillars.day.stem,
          gejuPrimary: chart.geju.primary,
          favorableElement: chart.geju.favorableElement,
          tiaohouGods: chart.tiaohou ? JSON.stringify(chart.tiaohou.gods) : null,
        }
        chartId = await upsertChartCache(
          db,
          input.userId,
          'natal',
          cacheInput,
          inputHash,
          chart,
          cachePayload,
          isPro,
          CURRENT_ENGINE_VERSION,
          displayHintsG
        )
        c.executionCtx.waitUntil(incrementGlobalCacheHit(db, inputHash, 'natal'))
      } else {
        // 全局缓存也未命中 — 调用 svc-astro
        const result = await callAstro<{
          chart: NatalChart
          hooks: Record<string, string> | null
          interpretation: Record<string, string> | null
        }>(c.env.SVC_ASTRO, '/natal/chart', { ...input, isPro, language: input.language })

        chart = result.chart
        hooks = result.hooks
        interpretation = result.interpretation

        // Store hooks + full_reading together for cache retrieval
        const cachePayload = { hooks, full_reading: interpretation }
        const displayHintsR = {
          dayMaster: chart.pillars.day.stem,
          gejuPrimary: chart.geju.primary,
          favorableElement: chart.geju.favorableElement,
          tiaohouGods: chart.tiaohou ? JSON.stringify(chart.tiaohou.gods) : null,
        }
        chartId = await upsertChartCache(
          db,
          input.userId,
          'natal',
          cacheInput,
          inputHash,
          chart,
          cachePayload,
          isPro,
          CURRENT_ENGINE_VERSION,
          displayHintsR
        )
        c.executionCtx.waitUntil(
          upsertGlobalInterpretation(
            db,
            inputHash,
            'natal',
            chart,
            hooks,
            interpretation,
            CURRENT_ENGINE_VERSION
          )
        )
      }
    }

    const readingId = crypto.randomUUID()
    await db
      .update(users)
      .set({
        totalReadings: (user.totalReadings ?? 0) + 1,
        // Phase 4.8 — persist static natal traits used as prompt context
        // for /signal/today and /report chapters. Idempotent: safe to overwrite
        // each time the user re-runs natal (input may legitimately change).
        dayMasterStem: chart.pillars.day.stem,
        dayMasterStrength: chart.geju.dayMasterStrength ?? null,
        favorableElement: chart.geju.favorableElement,
        unfavorableElement: chart.geju.unfavorableElement ?? null,
        birthBranch: chart.pillars.year.branch,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, input.userId))

    c.executionCtx.waitUntil(
      Promise.all([
        recordChartSuccess(
          'natal',
          { solarDate: input.solarDate, timeIndex: input.timeIndex, gender: input.gender },
          input.userId,
          c.env.GUARD_KV
        ),
        logEvent(db, input.userId, 'reading_natal', { readingId: chartId }),
      ])
    )

    return c.json({
      id: chartId,
      chart: {
        pillars: chart.pillars,
        nayin: chart.nayin,
        dayMasterWuXing: chart.dayMasterWuXing,
        geju: chart.geju,
        daYun: chart.daYun ?? null,
        shenSha: chart.shenSha ?? null,
      },
      hooks,
      interpretation: isPro ? interpretation : null,
      disclaimer: 'reading_disclaimer',
      meta: { isPro },
      createdAt: new Date().toISOString(),
    })
  })
  .get('/history', async (c) => {
    const userId = requireUserId(c)
    const limit = Math.min(Number.parseInt(c.req.query('limit') ?? '20', 10) || 20, 100)

    const db = c.get('db')
    const records = await db
      .select({
        id: userCharts.id,
        chartType: userCharts.chartType,
        displayHints: userCharts.displayHints,
        bookmarked: userCharts.bookmarked,
        rating: userCharts.rating,
        updatedAt: userCharts.updatedAt,
        createdAt: userCharts.createdAt,
      })
      .from(userCharts)
      .where(and(eq(userCharts.userId, userId), eq(userCharts.chartType, 'natal')))
      .orderBy(desc(userCharts.updatedAt))
      .limit(limit)

    return c.json({ records })
  })
  .get('/:id', async (c) => {
    const id = c.req.param('id')
    const db = c.get('db')

    const record = await db.select().from(userCharts).where(eq(userCharts.id, id)).get()

    if (!record) {
      throw new HTTPException(404, { message: 'Natal reading not found' })
    }

    const requestUserId = requireUserId(c)
    if (record.userId !== requestUserId) throw new HTTPException(403, { message: 'Forbidden' })
    const isRequestorPro = await userHasCapability(db, requestUserId, 'fate')

    const storedChart = JSON.parse(record.chartData) as Record<string, unknown>
    const storedInterp = isRequestorPro
      ? record.interpretationPro
        ? JSON.parse(record.interpretationPro)
        : null
      : record.interpretationFree
        ? JSON.parse(record.interpretationFree)
        : null
    const recordHooks = (storedInterp as Record<string, unknown> | null)?.hooks ?? {}
    const recordFullReading =
      (storedInterp as Record<string, unknown> | null)?.full_reading ?? storedInterp

    return c.json({
      id: record.id,
      chart: storedChart,
      hooks: recordHooks,
      interpretation: isRequestorPro ? recordFullReading : null,
      solarDate: record.solarDate,
      timeIndex: record.timeIndex,
      gender: record.gender,
      city: record.city,
      createdAt: record.createdAt,
    })
  })
  .patch('/:id/bookmark', async (c) => {
    const userId = requireUserId(c)
    const readingId = c.req.param('id')
    const body = await c.req.json()
    const input = bookmarkSchema.parse(body)
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
  .patch('/:id/rating', async (c) => {
    const userId = requireUserId(c)
    const readingId = c.req.param('id')
    const body = await c.req.json()
    const input = ratingSchema.parse(body)
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
