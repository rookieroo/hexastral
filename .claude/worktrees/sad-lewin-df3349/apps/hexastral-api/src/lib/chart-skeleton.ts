/**
 * buildChartSkeleton — idempotent, LLM-free natal chart bootstrap.
 *
 * Produces (and persists) the minimum chart state every downstream feature
 * needs to function:
 *   - users.dayMasterStem / dayMasterStrength / favorableElement /
 *     unfavorableElement / birthBranch / ziweiMingPalaceStar
 *   - one user_charts row of chartType='natal' with chart_data populated
 *     (interpretation_free / interpretation_pro left null — those lazy-build
 *     when the user actually opens the chart screen)
 *
 * Calls svc-astro `/chart/static` (pure compute, 0 LLM cost). Safe to call on
 * every hot path that depends on chart state (signal/today, onboarding,
 * post-signin auto-heal). Idempotent on input fingerprint.
 */

import { eq } from 'drizzle-orm'
import { users } from '../db/schema'
import type { AppDb, CloudflareBindings } from '../infra-types'
import {
  type ChartCacheInput,
  CURRENT_ENGINE_VERSION,
  computeInputHash,
  getCachedChart,
  upsertChartCache,
} from './chart-cache'
import { astroClient } from './service-clients'

/** What svc-astro `/chart/static` returns — narrow to the fields we persist. */
interface StaticChartResponse {
  natal: {
    pillars: {
      year: { stem: string; branch: string }
      month: { stem: string; branch: string }
      day: { stem: string; branch: string }
      hour: { stem: string; branch: string }
    }
    dayMaster: string
    geju: {
      primary?: string
      dayMasterStrength?: string
      favorableElement?: string
      unfavorableElement?: string
    }
    tiaohou: { gods: unknown } | null
  }
  stellar: {
    soulPalaceMajorStars: string[]
    fiveElementsClass?: string
  }
}

export interface ChartSkeletonResult {
  chartId: string
  inputHash: string
  dayMasterStem: string
  dayMasterStrength: string | null
  favorableElement: string | null
  unfavorableElement: string | null
  birthBranch: string
  ziweiMingPalaceStar: string | null
  /** True if the chart was just built; false if it was already cached. */
  built: boolean
}

export interface BuildSkeletonInput {
  userId: string
  birthSolarDate: string
  birthTimeIndex: number
  birthGender: '男' | '女'
  birthCity?: string | null
  birthLongitude?: number | string | null
  birthLatitude?: number | string | null
  birthTimezoneId?: string | null
  hemisphereReversalEnabled?: boolean
  language?: string
}

/**
 * Build (or reuse) the chart skeleton + persist denormalised user fields.
 * Returns the chart id and the static traits written.
 *
 * Throws if svc-astro fails — caller decides whether to surface to the user
 * or swallow (e.g. signal lazy-build can fall through to its 404 branch).
 */
export async function buildChartSkeleton(
  db: AppDb,
  env: CloudflareBindings,
  input: BuildSkeletonInput
): Promise<ChartSkeletonResult> {
  const cacheInput: ChartCacheInput = {
    solarDate: input.birthSolarDate,
    timeIndex: input.birthTimeIndex,
    gender: input.birthGender,
    longitude: input.birthLongitude ?? null,
    latitude: input.birthLatitude ?? null,
    timezoneId: input.birthTimezoneId ?? null,
    city: input.birthCity ?? null,
    hemisphereReversalEnabled: input.hemisphereReversalEnabled ?? false,
  }
  const inputHash = await computeInputHash(cacheInput)

  // Reuse if a natal cache row already exists with the same fingerprint
  const cached = await getCachedChart<StaticChartResponse['natal']>(
    db,
    input.userId,
    'natal',
    inputHash
  )

  let natal: StaticChartResponse['natal']
  let stellar: StaticChartResponse['stellar']
  let chartId: string
  let built = false

  if (cached) {
    natal = cached.chartData
    // Cached row only stores `chartData`; we don't have the stellar block.
    // Rebuild it via svc-astro only if we actually need to backfill ziwei.
    // To stay LLM-free and cheap, prefer a fresh /chart/static call when the
    // user record is missing ziweiMingPalaceStar.
    const userRow = await db
      .select({ ziwei: users.ziweiMingPalaceStar })
      .from(users)
      .where(eq(users.id, input.userId))
      .get()
    if (userRow?.ziwei) {
      stellar = { soulPalaceMajorStars: [userRow.ziwei] }
    } else {
      const fresh = await astroClient.post<StaticChartResponse>(env.SVC_ASTRO, '/chart/static', {
        solarDate: input.birthSolarDate,
        timeIndex: input.birthTimeIndex,
        gender: input.birthGender,
        longitude:
          typeof input.birthLongitude === 'string'
            ? Number(input.birthLongitude)
            : (input.birthLongitude ?? undefined),
        latitude:
          typeof input.birthLatitude === 'string'
            ? Number(input.birthLatitude)
            : (input.birthLatitude ?? undefined),
        timezoneId: input.birthTimezoneId ?? undefined,
        city: input.birthCity ?? undefined,
        userId: input.userId,
        language: input.language ?? 'zh-CN',
      })
      stellar = fresh.stellar
    }
    chartId = cached.id
  } else {
    const fresh = await astroClient.post<StaticChartResponse>(env.SVC_ASTRO, '/chart/static', {
      solarDate: input.birthSolarDate,
      timeIndex: input.birthTimeIndex,
      gender: input.birthGender,
      longitude:
        typeof input.birthLongitude === 'string'
          ? Number(input.birthLongitude)
          : (input.birthLongitude ?? undefined),
      latitude:
        typeof input.birthLatitude === 'string'
          ? Number(input.birthLatitude)
          : (input.birthLatitude ?? undefined),
      timezoneId: input.birthTimezoneId ?? undefined,
      city: input.birthCity ?? undefined,
      userId: input.userId,
      language: input.language ?? 'zh-CN',
    })
    natal = fresh.natal
    stellar = fresh.stellar

    // Persist chart skeleton — interpretations stay null (lazy-build later).
    const displayHints = {
      dayMaster: natal.pillars.day.stem,
      gejuPrimary: natal.geju.primary ?? null,
      favorableElement: natal.geju.favorableElement ?? null,
      tiaohouGods: natal.tiaohou ? JSON.stringify(natal.tiaohou.gods) : null,
    }
    chartId = await upsertChartCache(
      db,
      input.userId,
      'natal',
      cacheInput,
      inputHash,
      natal,
      null,
      false,
      CURRENT_ENGINE_VERSION,
      displayHints
    )
    built = true
  }

  // Denormalise to users for hot-path reads (signal, signature, report).
  const ziwei = stellar.soulPalaceMajorStars?.[0] ?? null
  const dayMasterStem = natal.pillars.day.stem
  const dayMasterStrength = natal.geju.dayMasterStrength ?? null
  const favorableElement = natal.geju.favorableElement ?? null
  const unfavorableElement = natal.geju.unfavorableElement ?? null
  const birthBranch = natal.pillars.year.branch

  await db
    .update(users)
    .set({
      dayMasterStem,
      dayMasterStrength,
      favorableElement,
      unfavorableElement,
      birthBranch,
      ziweiMingPalaceStar: ziwei,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, input.userId))

  return {
    chartId,
    inputHash,
    dayMasterStem,
    dayMasterStrength,
    favorableElement,
    unfavorableElement,
    birthBranch,
    ziweiMingPalaceStar: ziwei,
    built,
  }
}
