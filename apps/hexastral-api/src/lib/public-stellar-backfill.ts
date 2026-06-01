/**
 * Ensures per-user stellar chart cache exists for public profile rendering.
 * Skeleton only persists natal rows; many users never opened POST /stellar/chart.
 * No guard KV / dailyActivity / totalReadings side effects — cache-only warm-up.
 */

import { calcGlobalTrueSolarTime } from '@zhop/astro-core/geo-time'
import { nanoid } from 'nanoid'
import type { users } from '../db/schema'
import type { AppDb, CloudflareBindings } from '../infra-types'
import type { PalaceSummary } from '../types'
import { callAstro } from './astro-client'
import {
  CURRENT_ENGINE_VERSION,
  computeInputHash,
  getCachedChart,
  upsertChartCache,
  upsertGlobalInterpretation,
} from './chart-cache'

type FetcherLike = CloudflareBindings['SVC_ASTRO']

export interface PublicStellarChartPayload {
  palaces: PalaceSummary[]
  meta: Record<string, string>
}

function parseLongitude(raw: string | null): number | undefined {
  if (raw == null || raw === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

function parseLatitude(raw: string | null): number | undefined {
  if (raw == null || raw === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Returns stellar `{ palaces, meta }` from cache or svc-astro; null if birth data unusable.
 */
export type StellarBirthContext = Pick<
  typeof users.$inferSelect,
  | 'birthSolarDate'
  | 'birthTimeIndex'
  | 'birthGender'
  | 'birthLongitude'
  | 'birthLatitude'
  | 'birthTimezoneId'
  | 'birthCity'
  | 'hemisphereReversalEnabled'
  | 'locale'
>

/** svc-astro / cache expect 男 | 女; DB may store M/F, male/female, etc. */
export function normalizeZiWeiGender(raw: string | null | undefined): '男' | '女' | null {
  if (raw == null) return null
  const s = String(raw).trim().toLowerCase()
  if (s === '男' || s === 'm' || s === 'male' || s === 'man' || s === '1') return '男'
  if (s === '女' || s === 'f' || s === 'female' || s === 'woman' || s === '2') return '女'
  return null
}

export async function ensureStellarChartForPublicProfile(
  db: AppDb,
  svcAstro: FetcherLike,
  userId: string,
  userRow: StellarBirthContext
): Promise<PublicStellarChartPayload | null> {
  const solarDate = userRow.birthSolarDate
  const timeIndex = userRow.birthTimeIndex
  const gender = normalizeZiWeiGender(userRow.birthGender)
  if (!solarDate || timeIndex == null || gender == null) {
    return null
  }

  const longitude = parseLongitude(userRow.birthLongitude)
  const latitude = parseLatitude(userRow.birthLatitude)
  const timezoneId = userRow.birthTimezoneId ?? undefined
  const city = userRow.birthCity ?? undefined

  let cacheSolarDate = solarDate
  let cacheTimeIndex = timeIndex
  if (longitude != null && timezoneId) {
    const [y, m, d] = solarDate.split('-').map(Number) as [number, number, number]
    const representativeHour = timeIndex * 2
    const localDatetime = new Date(y, m - 1, d, representativeHour)
    const tst = calcGlobalTrueSolarTime({
      localDatetime,
      timezoneId,
      longitude,
      cityName: city ?? undefined,
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
    gender,
    longitude,
    latitude,
    timezoneId: timezoneId ?? null,
    city: city ?? null,
    hemisphereReversalEnabled: userRow.hemisphereReversalEnabled ?? false,
  }

  const inputHash = await computeInputHash(cacheInput)

  const cached = await getCachedChart<{ palaces: PalaceSummary[]; meta: Record<string, string> }>(
    db,
    userId,
    'stellar',
    inputHash
  )
  if (cached) {
    return { palaces: cached.chartData.palaces, meta: cached.chartData.meta }
  }

  const language =
    userRow.locale?.startsWith('en') === true
      ? 'en-US'
      : userRow.locale?.startsWith('ja')
        ? 'ja-JP'
        : userRow.locale?.startsWith('ko')
          ? 'ko-KR'
          : 'zh-CN'

  const result = await callAstro<{
    palaces: PalaceSummary[]
    meta: Record<string, string>
    interpretation: Record<string, string> | null
  }>(svcAstro, '/stellar/chart', {
    solarDate,
    timeIndex,
    gender,
    longitude,
    latitude,
    timezoneId,
    city,
    userId,
    language,
    isPro: false,
    requestId: `pub-fill:${nanoid()}`,
  })

  const soulPalace = result.palaces.find((p) => p.name === '命宫')
  const majorStarNames = soulPalace?.majorStars.map((s) => s.name).join('、') ?? ''
  const displayHints = {
    fiveElementsClass: result.meta.fiveElementsClass,
    soulPalaceMajorStars: majorStarNames,
  }

  await upsertChartCache(
    db,
    userId,
    'stellar',
    cacheInput,
    inputHash,
    { palaces: result.palaces, meta: result.meta },
    result.interpretation,
    false,
    CURRENT_ENGINE_VERSION,
    displayHints,
    language
  )

  await upsertGlobalInterpretation(
    db,
    inputHash,
    'stellar',
    { palaces: result.palaces, meta: result.meta },
    null,
    result.interpretation,
    CURRENT_ENGINE_VERSION
  )

  return { palaces: result.palaces, meta: result.meta }
}

/** Prefer existing stellar row's parsed chart when present; shape-normalise `{ palaces, meta }`. */
export function parseStellarChartJson(chartData: string): PublicStellarChartPayload | null {
  try {
    const raw = JSON.parse(chartData) as unknown
    if (!raw || typeof raw !== 'object') return null
    const o = raw as Record<string, unknown>
    const palaces = o.palaces
    const meta = o.meta
    if (!Array.isArray(palaces) || typeof meta !== 'object' || meta === null) return null
    return { palaces: palaces as PalaceSummary[], meta: meta as Record<string, string> }
  } catch {
    return null
  }
}
