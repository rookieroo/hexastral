/**
 * 命盘缓存层 — compute-once, cache in D1
 *
 * 星宫盘和命格盘是出生时间的确定性函数。
 * 缓存逻辑:
 *   1. 计算 inputHash = SHA-256(solarDate|timeIndex|gender|longitude|timezoneId)
 *   2. 查 D1 user_charts: (userId, chartType) 是否存在且 inputHash 匹配
 *   3. 命中 → 返回缓存 (跳过svc-astro调用)
 *   4. 未命中 / hash变化 → 调用 svc-astro → UPSERT 缓存
 */

import { and, eq } from 'drizzle-orm'
import { globalChartInterpretations, userCharts } from '../db/schema'
import type { AppDb } from '../infra-types'

export type ChartType = 'stellar' | 'natal' | 'fate'

/** 全局跨用户缓存只支持纯出生盘（星宫+命格）；fate 合盘是用户独有数据，不进全局缓存 */
export type GlobalChartType = 'stellar' | 'natal'

export interface ChartCacheInput {
  solarDate: string
  timeIndex: number
  /** 精确出生分钟数 0-1439（精确模式）。改变它会改变真太阳时校准结果 → 必须进 hash。 */
  clockMinutes?: number | null
  /** 真太阳时校准开关（默认 true）。关掉 = 不同的盘 → 必须进 hash。 */
  calibrate?: boolean | null
  gender: string
  longitude?: string | number | null
  latitude?: string | number | null
  timezoneId?: string | null
  city?: string | null
  hemisphereReversalEnabled?: boolean
}

export interface ChartCacheResult<T> {
  /** userCharts 表主键 */
  id: string
  /** 命盘数据 */
  chartData: T
  /** Free tier 解读 */
  interpretationFree: Record<string, unknown> | null
  /** Pro tier 解读 */
  interpretationPro: Record<string, unknown> | null
  /** 是否来自缓存 */
  cached: boolean
}

/** 计算输入参数的确定性哈希 */
export async function computeInputHash(input: ChartCacheInput): Promise<string> {
  const parts = [
    input.solarDate,
    String(input.timeIndex),
    input.gender,
    String(input.longitude ?? ''),
    String(input.timezoneId ?? ''),
    // 精确出生时间 + 校准开关 —— 精确模式下决定真太阳时结果。追加在末尾，旧盘的 hash
    // 随之改变 → 强制重算，自然失效掉旧的「时辰左边界 + 坏引擎」缓存。
    String(input.clockMinutes ?? ''),
    String(input.calibrate ?? ''),
  ]

  // Southern hemisphere reversal changes the chart — differentiate in hash
  if (input.hemisphereReversalEnabled) {
    parts.unshift('hemi')
  }

  const canonical = parts.join('|')
  const data = new TextEncoder().encode(canonical)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** 查询缓存: 返回 null 表示未命中或 hash 不匹配 */
export async function getCachedChart<T>(
  db: AppDb,
  userId: string,
  chartType: ChartType,
  inputHash: string
): Promise<ChartCacheResult<T> | null> {
  const row = await db
    .select()
    .from(userCharts)
    .where(and(eq(userCharts.userId, userId), eq(userCharts.chartType, chartType)))
    .get()

  if (!row || row.inputHash !== inputHash) {
    return null
  }

  return {
    id: row.id,
    chartData: JSON.parse(row.chartData) as T,
    interpretationFree: row.interpretationFree ? JSON.parse(row.interpretationFree) : null,
    interpretationPro: row.interpretationPro ? JSON.parse(row.interpretationPro) : null,
    cached: true,
  }
}

/** 写入/更新缓存 (UPSERT by userId + chartType)，返回 userCharts 记录 ID */
export async function upsertChartCache(
  db: AppDb,
  userId: string,
  chartType: ChartType,
  input: ChartCacheInput,
  inputHash: string,
  chartData: unknown,
  interpretation: Record<string, unknown> | null,
  isPro: boolean,
  engineVersion: string,
  displayHints?: unknown,
  interpretationLang?: string
): Promise<string> {
  const existing = await db
    .select({ id: userCharts.id })
    .from(userCharts)
    .where(and(eq(userCharts.userId, userId), eq(userCharts.chartType, chartType)))
    .get()

  const interpretationJson = interpretation ? JSON.stringify(interpretation) : null

  if (existing) {
    await db
      .update(userCharts)
      .set({
        inputHash,
        solarDate: input.solarDate,
        timeIndex: input.timeIndex,
        gender: input.gender,
        city: input.city ?? null,
        longitude: input.longitude != null ? String(input.longitude) : null,
        latitude: input.latitude != null ? String(input.latitude) : null,
        timezoneId: input.timezoneId ?? null,
        chartData: JSON.stringify(chartData),
        ...(isPro
          ? { interpretationPro: interpretationJson }
          : { interpretationFree: interpretationJson }),
        ...(displayHints !== undefined && { displayHints: JSON.stringify(displayHints) }),
        ...(interpretationLang !== undefined && { interpretationLang }),
        engineVersion,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userCharts.id, existing.id))
    return existing.id
  }

  const newId = crypto.randomUUID()
  await db.insert(userCharts).values({
    id: newId,
    userId,
    chartType,
    inputHash,
    solarDate: input.solarDate,
    timeIndex: input.timeIndex,
    gender: input.gender,
    city: input.city ?? null,
    longitude: input.longitude != null ? String(input.longitude) : null,
    latitude: input.latitude != null ? String(input.latitude) : null,
    timezoneId: input.timezoneId ?? null,
    chartData: JSON.stringify(chartData),
    ...(isPro
      ? { interpretationPro: interpretationJson, interpretationFree: null }
      : { interpretationFree: interpretationJson, interpretationPro: null }),
    ...(displayHints !== undefined && { displayHints: JSON.stringify(displayHints) }),
    ...(interpretationLang !== undefined && { interpretationLang }),
    engineVersion,
  })
  return newId
}

// ==================== 全局跨用户缓存 ====================

/**
 * 当前引擎版本 — 递增此值使旧缓存失效。
 * v3: 真太阳时引擎修复（UTC 叠加 bug）+ 时辰中点取代左边界 + 校准仅限精确钟点模式。
 */
export const CURRENT_ENGINE_VERSION = 'v3'

export interface GlobalCacheResult<T> {
  chartData: T
  hooks: Record<string, string> | null
  fullReading: Record<string, string> | null
  hitCount: number
}

/** 查询全局缓存: 相同 inputHash + chartType + engineVersion */
export async function getGlobalCachedInterpretation<T>(
  db: AppDb,
  inputHash: string,
  chartType: GlobalChartType
): Promise<GlobalCacheResult<T> | null> {
  const row = await db
    .select()
    .from(globalChartInterpretations)
    .where(
      and(
        eq(globalChartInterpretations.inputHash, inputHash),
        eq(globalChartInterpretations.chartType, chartType),
        eq(globalChartInterpretations.engineVersion, CURRENT_ENGINE_VERSION)
      )
    )
    .get()

  if (!row) return null

  return {
    chartData: JSON.parse(row.chartData) as T,
    hooks: row.hooks ? JSON.parse(row.hooks) : null,
    fullReading: row.fullReading ? JSON.parse(row.fullReading) : null,
    hitCount: row.hitCount,
  }
}

/** 写入全局缓存 */
export async function upsertGlobalInterpretation(
  db: AppDb,
  inputHash: string,
  chartType: GlobalChartType,
  chartData: unknown,
  hooks: Record<string, string> | null,
  fullReading: Record<string, string> | null,
  engineVersion: string
): Promise<void> {
  const existing = await db
    .select({ id: globalChartInterpretations.id })
    .from(globalChartInterpretations)
    .where(
      and(
        eq(globalChartInterpretations.inputHash, inputHash),
        eq(globalChartInterpretations.chartType, chartType),
        eq(globalChartInterpretations.engineVersion, engineVersion)
      )
    )
    .get()

  if (existing) {
    await db
      .update(globalChartInterpretations)
      .set({
        chartData: JSON.stringify(chartData),
        hooks: hooks ? JSON.stringify(hooks) : null,
        fullReading: fullReading ? JSON.stringify(fullReading) : null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(globalChartInterpretations.id, existing.id))
  } else {
    await db.insert(globalChartInterpretations).values({
      id: crypto.randomUUID(),
      inputHash,
      chartType,
      chartData: JSON.stringify(chartData),
      hooks: hooks ? JSON.stringify(hooks) : null,
      fullReading: fullReading ? JSON.stringify(fullReading) : null,
      engineVersion,
      hitCount: 0,
    })
  }
}

/** 异步递增全局缓存命中计数 */
export async function incrementGlobalCacheHit(
  db: AppDb,
  inputHash: string,
  chartType: GlobalChartType
): Promise<void> {
  const row = await db
    .select({ id: globalChartInterpretations.id, hitCount: globalChartInterpretations.hitCount })
    .from(globalChartInterpretations)
    .where(
      and(
        eq(globalChartInterpretations.inputHash, inputHash),
        eq(globalChartInterpretations.chartType, chartType),
        eq(globalChartInterpretations.engineVersion, CURRENT_ENGINE_VERSION)
      )
    )
    .get()

  if (row) {
    await db
      .update(globalChartInterpretations)
      .set({ hitCount: row.hitCount + 1, updatedAt: new Date().toISOString() })
      .where(eq(globalChartInterpretations.id, row.id))
  }
}
