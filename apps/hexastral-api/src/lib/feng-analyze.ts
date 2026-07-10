/**
 * runAnalyzeJob — orchestrates the 3-stage Fēng pipeline.
 *
 * Called from the `feng-analyze` queue consumer (`processFengAnalyzeQueueBatch`).
 * Updates the `feng_jobs` row as it progresses through:
 *
 *   stage 'maps'      → render 3 satellite tiles (close 100m / mid 500m / wide 2km)
 *   stage 'annotate'  → composite sit/face/door arrows + bagua overlay on each tile
 *   stage 'vision'    → Gemini Vision structured 外巒頭 JSON (Week 5 wires real model)
 *   stage 'compute'   → astro-core/feng deterministic 玄空 + 八宅 (in-process, sub-ms)
 *   stage 'synthesis' → Claude Opus 4.7 / Gemini Pro → 6 chapters
 *   stage 'done'      → write feng_reports row + flip job stage
 *
 * On failure the worker records the error message and sets stage='failed';
 * the client can re-tap "Analyze" which creates a new job row.
 *
 * The function is intentionally tolerant of stub responses from svc-feng so
 * the orchestration end-to-end can be exercised before Week 5's real Gemini
 * integration lands.
 */

import type { BaguaPalace, Gender } from '@zhop/astro-core'
import {
  annualChart,
  auditVisionGeometry,
  computeBaZhai,
  computeFlyingStars,
  correlateFormAndStars,
  dateToFlyingYear,
  describePalaceCombination,
  detectPatterns,
  emptyFormByPalace,
  getMonthByJie,
  monthlyChart,
  mountainAtDegree,
  NINE_CHART_KEYS,
  palaceAtDegree,
  sitMountainForFacing,
  yuanYunForYear,
} from '@zhop/astro-core'
import { and, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import type { fengJobs as fengJobsTable, fengSites } from '../db/schema'
import { fengJobs, fengReports, singlePurchases, users } from '../db/schema'
import type { AppDb, CloudflareBindings } from '../infra-types'
import {
  type AdaptiveTile,
  annotateMap,
  type ElevationProfile,
  elevationProfile,
  type InteriorVisionResult,
  getFloorplanImage,
  type OverlayArrow,
  prefetchTerrain,
  renderMap,
  streetSha,
  synthesizeReport,
  type TerrainSignals,
  type VisionAnalyzeResult,
  visionAnalyze,
  visionInterior,
} from './feng-client'
import { deriveRoomFindings, parseSiteFloorplan, type RoomFinding } from './feng-interior-compute'
import { orientFacingDeltaDeg } from './feng-coords'
import { assessFloorplanImageQuality } from './floorplan-image-heuristic'
import {
  type FengResidenceType,
  fengStreetViewEnabled,
  normalizeResidenceType,
} from './feng-pricing'
import { inferResidenceHeuristic } from './feng-residence-heuristic'
import { fengLogger } from './logger'
import { searchPortfolioReadingMemory } from './portfolio-memory'

type Site = typeof fengSites.$inferSelect
type Job = typeof fengJobsTable.$inferSelect

interface SiteInputMeta {
  facingConfirmed?: boolean
  floorplanOrientConfirmed?: boolean
  pinOffsetM?: number
  orientFacingDeltaDeg?: number
  residenceHeuristic?: ReturnType<typeof inferResidenceHeuristic>
}

function parseSiteInputMeta(site: Site): SiteInputMeta | null {
  if (!site.inputMeta) return null
  try {
    return JSON.parse(site.inputMeta) as SiteInputMeta
  } catch {
    return null
  }
}

type GeometrySupport = 'weak' | 'none' | 'inferred-only'

function collectMustSoften(vision: VisionAnalyzeResult): Array<{
  type: string
  direction: string
  geometrySupport: GeometrySupport
}> {
  const out: Array<{ type: string; direction: string; geometrySupport: GeometrySupport }> = []
  const push = (items: Array<{ type: string; direction: string; geometrySupport?: string }>) => {
    for (const item of items) {
      const gs = item.geometrySupport
      if (gs === 'weak' || gs === 'none' || gs === 'inferred-only') {
        out.push({ type: item.type, direction: item.direction, geometrySupport: gs })
      }
    }
  }
  push(vision.形煞)
  push(vision.砂)
  push(vision.水)
  push(vision.朝案)
  return out
}

/**
 * Ground-level street 形煞 (壁刀 / 天斩 / 路冲) over-hits high floors — a 30F 大平层 is
 * not cut by a wall edge captured at street level. Attenuate severity by floor for
 * `flat`; `villa` is a low-rise whole dwelling and keeps full weight. Returns the
 * (possibly reduced) severity; callers drop findings that fall below relevance.
 */
function attenuateStreetSeverity(
  severity: number,
  residenceType: FengResidenceType,
  floor: number | null
): number {
  if (residenceType !== 'flat' || floor == null || !Number.isFinite(floor)) return severity
  const f = Math.max(1, Math.floor(floor))
  const factor = f <= 3 ? 1 : f <= 6 ? 0.7 : f <= 12 ? 0.5 : 0.3
  return severity * factor
}

// size 640 (not 600) so the facing-calibrator preview (zoom 17 / size 640) and
// the `mid` analyze tile hash to the SAME maps cache key — one Mapbox fetch
// serves both instead of billing twice for the same location + zoom.
const MAP_TILES: ReadonlyArray<{ key: 'close' | 'mid' | 'wide'; zoom: number; size: number }> = [
  { key: 'close', zoom: 19, size: 640 },
  { key: 'mid', zoom: 17, size: 640 },
  { key: 'wide', zoom: 14, size: 640 },
]

async function setStage(
  db: AppDb,
  jobId: string,
  stage: Job['stage'],
  progress: number,
  extras: Partial<typeof fengJobs.$inferInsert> = {}
): Promise<void> {
  await db
    .update(fengJobs)
    .set({ stage, progress, ...extras })
    .where(eq(fengJobs.id, jobId))
}

async function markFailed(db: AppDb, jobId: string, message: string): Promise<void> {
  await db
    .update(fengJobs)
    .set({
      stage: 'failed',
      progress: 0,
      errorMessage: message.slice(0, 480),
      finishedAt: new Date().toISOString(),
    })
    .where(eq(fengJobs.id, jobId))
}

/** The 4 locales the Fēng report pipeline (vision + synthesis) supports. */
type ReportLocale = 'en' | 'zh' | 'zh-Hant' | 'ja'

/**
 * Map a stored BCP-47 user locale (`users.locale`, default 'zh') onto the
 * report's 4-locale union. Unknown / null falls back to 'zh' to preserve the
 * historical default.
 */
function resolveReportLocale(raw: string | null | undefined): ReportLocale {
  if (!raw) return 'zh'
  const v = raw.toLowerCase()
  if (v.startsWith('ja')) return 'ja'
  if (v.startsWith('en')) return 'en'
  // Traditional-script variants (zh-Hant / zh-TW / zh-HK / zh-MO).
  if (v.startsWith('zh-hant') || v === 'zh-tw' || v === 'zh-hk' || v === 'zh-mo') {
    return 'zh-Hant'
  }
  if (v.startsWith('zh')) return 'zh'
  return 'zh'
}

interface UserContext {
  locale: ReportLocale
  /** null when the user has no usable birth profile — 八宅 chapter is omitted. */
  profile: { birthDate: string; gender: '男' | '女' } | null
}

/**
 * Pull the report locale (always available) + birth profile (when present) for
 * the site owner in a single query. Locale is independent of the profile so
 * users without birth info still get a localized 玄空 + 外巒頭 report.
 */
async function loadUserContext(db: AppDb, userId: string): Promise<UserContext> {
  const row = await db.select().from(users).where(eq(users.id, userId)).get()
  const locale = resolveReportLocale(row?.locale)
  if (!row) return { locale, profile: null }
  const solar = row.birthSolarDate
  const gender = row.birthGender
  if (!solar || (gender !== '男' && gender !== '女')) return { locale, profile: null }
  return { locale, profile: { birthDate: solar, gender } }
}

/** Exported for golden regression on input_meta scoring. */
export function deriveDataQuality(
  site: Site,
  terrain?: TerrainSignals,
  opts?: {
    hasBirthProfile?: boolean
    residenceHeuristic?: ReturnType<typeof inferResidenceHeuristic>
    extraNotes?: string[]
  }
) {
  const hasExactBuildYear = site.buildYearAccuracy === 'exact'
  let flyingStarsConfidence: 'high' | 'medium' | 'low' | 'omitted'
  switch (site.buildYearAccuracy) {
    case 'exact':
      flyingStarsConfidence = 'high'
      break
    case 'decade':
      flyingStarsConfidence = 'medium'
      break
    case 'moveIn':
      flyingStarsConfidence = 'low'
      break
    default:
      flyingStarsConfidence = 'omitted'
  }
  const notes: string[] = [...(opts?.extraNotes ?? [])]
  let inputScore = 30
  const inputMeta = parseSiteInputMeta(site)
  const residence = normalizeResidenceType(site.residenceType)

  if (inputMeta?.facingConfirmed !== true) {
    inputScore -= 25
    notes.push('facing_confirmed=false (legacy or missing input_meta)')
  }
  if (typeof inputMeta?.pinOffsetM === 'number' && inputMeta.pinOffsetM > 200) {
    inputScore -= 8
    notes.push(`pin_offset_m=${Math.round(inputMeta.pinOffsetM)}`)
  }
  if (typeof inputMeta?.orientFacingDeltaDeg === 'number' && inputMeta.orientFacingDeltaDeg > 15) {
    notes.push(`orient_facing_delta_deg=${Math.round(inputMeta.orientFacingDeltaDeg)}`)
  }

  if (site.buildYearAccuracy === 'unknown') {
    notes.push('flying_stars_omitted=true (build_year_accuracy=unknown)')
    notes.push('build_year=unknown')
  } else if (!hasExactBuildYear) {
    notes.push(`build_year_accuracy=${site.buildYearAccuracy}`)
    if (site.buildYearAccuracy === 'decade') {
      inputScore += 18
      notes.push('build_year=decade')
    } else if (site.buildYearAccuracy === 'moveIn') {
      inputScore += 12
      notes.push('build_year=move_in')
    }
  } else {
    inputScore += 25
    notes.push('build_year=exact')
  }

  if (site.floorplanKey) {
    inputScore += 20
    notes.push('floorplan=true')
    if (site.floorplanJson) {
      try {
        const fp = JSON.parse(site.floorplanJson) as { orientDeg?: number; centerNorm?: unknown }
        if (typeof fp.orientDeg === 'number') notes.push('floorplan_orient=true')
        if (fp.centerNorm) notes.push('floorplan_center=true')
      } catch {
        notes.push('floorplan_json_parse_failed=true')
      }
    }
  } else {
    notes.push('floorplan=false')
  }

  if (opts?.hasBirthProfile) {
    inputScore += 15
    notes.push('birth_profile=true')
  } else {
    notes.push('birth_profile=false')
  }

  if (residence === 'flat' && site.floor != null) {
    inputScore += 5
    notes.push('flat_floor=true')
  }
  if (residence === 'apartment' && site.floor == null) {
    inputScore -= 5
    notes.push('apartment_floor_missing=true (street form less relevant above ground)')
  }

  if (terrain && !terrain.degraded) {
    notes.push(`terrain=${terrain.summary}`)
    if (!terrain.hasWater && !terrain.hasMountain) {
      notes.push('terrain.flat_urban=true (砂/水 chapters scoped to direction-only)')
    }
  }
  if (residence === 'flat' && site.floor == null) {
    notes.push('flat_floor_missing=true (street 形煞 attenuation skipped)')
  }

  if (opts?.residenceHeuristic?.mismatch) {
    notes.push(`residence_heuristic_mismatch=true (${opts.residenceHeuristic.reason ?? 'unknown'})`)
    if (opts.residenceHeuristic.suggestedResidence) {
      notes.push(`residence_heuristic_suggested=${opts.residenceHeuristic.suggestedResidence}`)
    }
  }

  return {
    hasExactBuildYear,
    flyingStarsConfidence,
    notes,
    inputScore: Math.min(100, Math.max(0, inputScore)),
  }
}

function arrowsFor(site: Site): OverlayArrow[] {
  const facing = Number(site.facingDegTrue)
  const sit = Number(site.sitDegTrue)
  const arrows: OverlayArrow[] = [
    { kind: 'sit', degTrue: sit, label: `坐 ${Math.round(sit)}°` },
    { kind: 'face', degTrue: facing, label: `向 ${Math.round(facing)}°` },
  ]
  if (site.doorDegTrue != null) {
    const door = Number(site.doorDegTrue)
    arrows.push({ kind: 'door', degTrue: door, label: `门 ${Math.round(door)}°` })
  }
  return arrows
}

/** Map a vision direction string (八卦宫名, may be 繁体/含杂字) to a BaguaPalace. */
const PALACE_CHARS: Record<string, BaguaPalace> = {
  乾: '乾',
  兑: '兑',
  兌: '兑',
  离: '离',
  離: '离',
  震: '震',
  巽: '巽',
  坎: '坎',
  艮: '艮',
  坤: '坤',
}
function directionToPalace(dir: string): BaguaPalace | null {
  for (const ch of dir) {
    const p = PALACE_CHARS[ch]
    if (p) return p
  }
  return null
}

function derivePalaceCombinations(flyingStars: ReturnType<typeof computeFlyingStars>) {
  return NINE_CHART_KEYS.map((k) => {
    const d = describePalaceCombination(
      flyingStars.mountainChart[k],
      flyingStars.facingChart[k],
      flyingStars.currentYuanYun.yuanYun
    )
    return {
      palace: k,
      mountainStar: d.mountainStar,
      facingStar: d.facingStar,
      phase: d.phase,
      name: d.name ?? null,
      domain: d.combination?.domain ?? null,
      reading: d.reading || null,
    }
  })
}

export async function runAnalyzeJob(
  env: CloudflareBindings,
  db: AppDb,
  jobId: string,
  site: Site,
  /** When set (single-purchase path), consumed once the report is persisted. */
  purchaseId?: string
): Promise<void> {
  const jobStarted = Date.now()
  fengLogger.info('job.start', { jobId, siteId: site.id, userId: site.userId })
  // Tracks the two-phase SHELL row so a synthesis failure can delete it — an
  // orphaned shell (chapters='[]') would otherwise render as a permanent fake
  // loading state on every reopen (no chapters, no running job, no retry).
  let shellReportId: string | null = null
  const stageMs: Record<string, number> = {}
  try {
    const facingDegTrue = Number(site.facingDegTrue)
    const sitDegTrue = Number(site.sitDegTrue)
    const lat = Number(site.lat)
    const lng = Number(site.lng)

    // ── Stage: prefetch (Mapbox Tilequery) ──
    // Phase H · F2: ask Mapbox vector tiles whether the site even has water /
    // mountains worth analyzing before we burn Vision tokens on 3 satellite
    // tiles. Fail-open: if Mapbox is down, render all 3 (degraded=true).
    const prefetchStarted = Date.now()
    let terrain: TerrainSignals
    try {
      terrain = await prefetchTerrain(env.SVC_FENG, { lat, lng })
    } catch (err) {
      terrain = {
        hasWater: false,
        waterFeatureCount: 0,
        hasMountain: false,
        elevationRangeM: 0,
        contourCount: 0,
        recommendedTiles: ['close', 'mid', 'wide'],
        expectedFeatures: ['砂', '水', '朝案'],
        summary: 'prefetch error; running full pipeline',
        nearestRoadBearingDeg: null,
        roadFeatureCount: 0,
        formAzimuths: [],
        degraded: true,
      }
      fengLogger.warn('job.prefetch.error', {
        jobId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
    fengLogger.info('job.stage.done', {
      jobId,
      stage: 'prefetch',
      durationMs: Date.now() - prefetchStarted,
      hasWater: terrain.hasWater,
      hasMountain: terrain.hasMountain,
      recommendedTiles: terrain.recommendedTiles,
      degraded: terrain.degraded,
    })
    stageMs.prefetch = Date.now() - prefetchStarted

    // Only render the tile scales the prefetch flagged as worthwhile.
    const tilesToRender = MAP_TILES.filter((t) => terrain.recommendedTiles.includes(t.key))

    // ── Stage: maps ──
    await setStage(db, jobId, 'maps', 10)
    const mapsStarted = Date.now()
    const tiles: Partial<Record<AdaptiveTile, { mapKey: string }>> = {}
    for (const tile of tilesToRender) {
      const result = await renderMap(env.SVC_FENG, {
        lat,
        lng,
        zoom: tile.zoom,
        width: tile.size,
        height: tile.size,
        mode: 'satellite',
      })
      if (!result.cacheKey) {
        throw new Error(`svc-feng /maps/render returned no x-feng-cache-key (${tile.key})`)
      }
      tiles[tile.key] = { mapKey: result.cacheKey }
      await setStage(db, jobId, 'maps', 10 + tilesToRender.indexOf(tile) * 10)
    }
    fengLogger.info('job.stage.done', {
      jobId,
      stage: 'maps',
      durationMs: Date.now() - mapsStarted,
      renderedTiles: tilesToRender.map((t) => t.key),
    })
    stageMs.maps = Date.now() - mapsStarted

    // ── Stage: annotate ──
    await setStage(db, jobId, 'vision', 40)
    const annotateStarted = Date.now()
    const arrows = arrowsFor(site)
    const annotatedByTile: Partial<Record<AdaptiveTile, string>> = {}
    for (const tile of tilesToRender) {
      const mapKey = tiles[tile.key]?.mapKey
      if (!mapKey) continue
      const result = await annotateMap(env.SVC_FENG, {
        mapKey,
        width: tile.size,
        height: tile.size,
        arrows,
        drawMountainRing: true,
        drawBaguaWedges: true,
      })
      if (!result.cacheKey) {
        throw new Error(`svc-feng /annotate returned no x-feng-cache-key (${tile.key})`)
      }
      annotatedByTile[tile.key] = result.cacheKey
    }
    const annotatedKeys = tilesToRender
      .map((t) => annotatedByTile[t.key])
      .filter((k): k is string => typeof k === 'string')
    fengLogger.info('job.stage.done', {
      jobId,
      stage: 'annotate',
      durationMs: Date.now() - annotateStarted,
      annotatedCount: annotatedKeys.length,
    })
    stageMs.annotate = Date.now() - annotateStarted

    if (annotatedKeys.length === 0) {
      throw new Error('annotate stage produced zero keys')
    }

    // ── Stage: vision ──
    await setStage(db, jobId, 'vision', 55)
    const visionStarted = Date.now()
    const { locale, profile } = await loadUserContext(db, site.userId)
    let vision: VisionAnalyzeResult = await visionAnalyze(env.SVC_FENG, {
      annotatedKeys,
      facingDegTrue,
      sitDegTrue,
      doorDegTrue: site.doorDegTrue == null ? undefined : Number(site.doorDegTrue),
      locale,
      expectedFeatures: terrain.expectedFeatures,
      terrainSummary: terrain.summary,
      formAzimuths: terrain.formAzimuths?.length ? terrain.formAzimuths : undefined,
    })
    fengLogger.info('job.stage.done', {
      jobId,
      stage: 'vision',
      durationMs: Date.now() - visionStarted,
      modelVersion: vision.modelVersion,
    })
    stageMs.vision = Date.now() - visionStarted

    // ── Stage: compute (in-process, deterministic) ──
    await setStage(db, jobId, 'compute', 70)
    const today = new Date()
    const fengYear = today.getUTCFullYear()
    const includeFlyingStars = site.buildYearAccuracy !== 'unknown'

    const sitPalace = palaceAtDegree(sitDegTrue)
    const doorPalace =
      site.doorDegTrue == null ? sitPalace : palaceAtDegree(Number(site.doorDegTrue))
    const sitMountain = sitMountainForFacing(facingDegTrue)
    const faceMountain = mountainAtDegree(facingDegTrue)
    const presentYuan = yuanYunForYear(dateToFlyingYear(today))

    let flyingStars: ReturnType<typeof computeFlyingStars> | null = null
    let patterns: ReturnType<typeof detectPatterns> = []
    let combinations: ReturnType<typeof derivePalaceCombinations> = []

    if (includeFlyingStars) {
      const effectiveBuildYear = site.buildYear ?? site.moveInYear ?? fengYear
      flyingStars = computeFlyingStars({
        buildYear: effectiveBuildYear,
        facingDegTrue,
        asOf: today,
      })

      patterns = detectPatterns({
        yuanYun: flyingStars.buildYuanYun.yuanYun,
        sitPalace: flyingStars.sitMountain.palace,
        facePalace: flyingStars.faceMountain.palace,
        periodChart: flyingStars.periodChart,
        mountainChart: flyingStars.mountainChart,
        facingChart: flyingStars.facingChart,
      })

      combinations = derivePalaceCombinations(flyingStars)
    }

    // 月紫白 (流月) — 立春-aligned 年支 + 节-aligned 月支 → this month's 9-palace stars.
    const flyingYear = dateToFlyingYear(today)
    const yearBranchIndex = (((flyingYear - 4) % 12) + 12) % 12
    const monthBranchIndex = getMonthByJie(
      today.getUTCFullYear(),
      today.getUTCMonth() + 1,
      today.getUTCDate()
    )
    const lunarMonth = ((monthBranchIndex - 2 + 12) % 12) + 1 // 寅月=正月=1
    const monthlyStars = {
      lunarMonth,
      chart: monthlyChart(yearBranchIndex, lunarMonth),
    }

    const baZhaiResult = profile
      ? computeBaZhai({
          birthDate: new Date(`${profile.birthDate}T00:00:00Z`),
          gender: profile.gender as Gender,
          sitPalace,
          doorPalace,
        })
      : null

    const auspiciousPalaces = baZhaiResult ? baZhaiResult.lucky.map((d) => d.palace) : []
    const inauspiciousPalaces = baZhaiResult ? baZhaiResult.unlucky.map((d) => d.palace) : []

    // 大峦头 DEM — per-8宫 elevation 砂 (a top-down VLM can't read height). Only
    // when the prefetch flagged elevation; fail-open. Merged into formByPalace below.
    let elevation: ElevationProfile | null = null
    if (terrain.hasMountain && !terrain.degraded) {
      try {
        elevation = await elevationProfile(env.SVC_FENG, { lat, lng })
      } catch (err) {
        fengLogger.warn('job.elevation.error', {
          jobId,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    const flatUrban = !terrain.hasWater && !terrain.hasMountain && !terrain.degraded
    const audited = auditVisionGeometry(
      vision,
      {
        hasWater: terrain.hasWater,
        hasMountain: terrain.hasMountain,
        flatUrban,
        nearestRoadBearingDeg: terrain.nearestRoadBearingDeg,
        closeTileRendered: annotatedKeys.length >= 1,
      },
      elevation && !elevation.degraded ? elevation.byPalace : undefined
    )
    vision = { ...vision, ...audited } as VisionAnalyzeResult
    const mustSoften = collectMustSoften(vision)

    // 小峦头街景形煞 (Mapillary, off unless MAPILLARY_TOKEN). Merge into vision.形煞
    // (binned by the capturing image's compass angle → 宫) so it flows to both
    // formByPalace and synthesis. Fail-open.
    //
    // Gated to premium residence types (大平层 / 独栋别墅): a compound apartment's
    // street 形煞 is a low-value, shared-coordinate, floor-height-biased signal, and
    // the pass is an uncached Gemini call — reserve it for the high-ARPU deep report.
    const residenceType = normalizeResidenceType(site.residenceType)
    const streetViewEnabled = fengStreetViewEnabled(residenceType)
    let streetAttribution: string | null = null
    const streetStarted = Date.now()
    try {
      const street = streetViewEnabled
        ? await streetSha(env.SVC_FENG, { lat, lng, locale })
        : { degraded: true as const, findings: [] as [], attribution: '', imageCount: 0 }
      // CC BY-SA: attribution required whenever Mapillary imagery was fetched (even if
      // the VLM found no 形煞). Persist so footer / chapter / share can surface it.
      if (streetViewEnabled && street.imageCount > 0 && street.attribution) {
        streetAttribution = street.attribution
      }
      if (!street.degraded && street.findings.length > 0) {
        for (const f of street.findings) {
          // Height-weight ground-level 形煞 for 大平层 (see attenuateStreetSeverity);
          // drop findings that become negligible at this floor.
          const attenuated = attenuateStreetSeverity(f.severity, residenceType, site.floor)
          if (attenuated < 0.75) continue
          const sev = Math.min(5, Math.max(1, Math.round(attenuated))) as 1 | 2 | 3 | 4 | 5
          vision.形煞.push({
            type: f.type,
            direction: palaceAtDegree(f.compassAngle),
            distance: 'near',
            severity: sev,
            evidence: f.evidence,
          })
        }
      }
    } catch (err) {
      fengLogger.warn('job.street.error', {
        jobId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
    stageMs.street = Date.now() - streetStarted

    // 形理整合 — bin vision 砂/水/形煞 into palaces
    // overlay DEM 砂 by elevation, then correlate with the flying-star charts
    // (山管人丁、水管财). Uses the CURRENT 元运 for 旺衰, like the combination phase.
    const formByPalace = emptyFormByPalace()
    if (elevation && !elevation.degraded) {
      for (const p of Object.keys(formByPalace) as (keyof typeof formByPalace)[]) {
        if (elevation.byPalace[p]?.isMountain) formByPalace[p].hasMountain = true
      }
    }
    for (const s of vision.砂) {
      const p = directionToPalace(s.direction)
      if (p) formByPalace[p].hasMountain = true
    }
    for (const c of vision.朝案) {
      const p = directionToPalace(c.direction)
      if (p) formByPalace[p].hasMountain = true
    }
    for (const w of vision.水) {
      const p = directionToPalace(w.direction)
      if (p) formByPalace[p].hasWater = true
    }
    for (const az of terrain.formAzimuths ?? []) {
      if (az.kind === 'water' || az.kind === 'waterway' || az.kind === 'road') {
        const p = az.palace as BaguaPalace
        if (p in formByPalace) formByPalace[p].hasWater = true
      }
    }
    for (const x of vision.形煞) {
      const p = directionToPalace(x.direction)
      const sev = x.adjustedSeverity ?? x.severity
      if (p && sev >= 2) formByPalace[p].hasSha = true
    }

    const emptyFormLi = {
      palaces: [],
      zhengLing: { findings: [] as Array<{ palace: BaguaPalace; auspicious: boolean; reason: string }> },
      patternRescue: [] as Array<{ pattern: string; favourable: boolean; note: string }>,
    }
    const formLi =
      flyingStars != null
        ? correlateFormAndStars({
            yuanYun: flyingStars.currentYuanYun.yuanYun,
            mountainChart: flyingStars.mountainChart,
            facingChart: flyingStars.facingChart,
            formByPalace,
            sitPalace: flyingStars.sitMountain.palace,
            facePalace: flyingStars.faceMountain.palace,
            patterns,
          })
        : emptyFormLi

    // ── Stage 1b: interior (户型图 / 室内堪舆) ──
    // When the site has an uploaded floor plan, read each image with Gemini
    // (1 call/image, luopan-oriented via the stated north) and JOIN the rooms
    // with the per-palace 飞星/八宅 already computed above. This is what makes
    // the indoor advice room-specific. Fail-open: a floor-plan failure never
    // blocks the exterior report. Runs before the shell persist so roomFindings
    // are part of computeJson.
    let interior: InteriorVisionResult | null = null
    let roomFindings: RoomFinding[] = []
    let interiorQueJiao: Array<{ palace: string; note?: string; floorLabel?: string }> = []
    const interiorExtraNotes: string[] = []
    const floorplan = parseSiteFloorplan(site.floorplanJson)
    const siteInputMeta = parseSiteInputMeta(site)
    if (floorplan && floorplan.images.length > 0) {
      const orientDelta =
        siteInputMeta?.orientFacingDeltaDeg ??
        orientFacingDeltaDeg(floorplan.orientDeg, Number(site.facingDegTrue))
      let skipInterior: string | null = null
      if (siteInputMeta?.floorplanOrientConfirmed !== true) {
        skipInterior = 'floorplan_orient_unconfirmed'
      } else if (orientDelta > 30) {
        skipInterior = 'orient_facing_mismatch'
      } else {
        const coverKey = floorplan.images[0]?.key
        if (coverKey) {
          try {
            const { bytes } = await getFloorplanImage(env.SVC_FENG, coverKey)
            if (assessFloorplanImageQuality(new Uint8Array(bytes)) === 'low') {
              skipInterior = 'floorplan_quality_low'
            }
          } catch (err) {
            fengLogger.warn('job.floorplan_heuristic.error', {
              jobId,
              error: err instanceof Error ? err.message : String(err),
            })
          }
        }
      }

      if (skipInterior) {
        interiorExtraNotes.push(`${skipInterior}=true`)
        fengLogger.info('job.interior.skipped', { jobId, reason: skipInterior })
      } else {
      const interiorStarted = Date.now()
      try {
        interior = await visionInterior(env.SVC_FENG, {
          floorplanKeys: floorplan.images.map((im) => im.key),
          northUpBearing: floorplan.orientDeg,
          locale,
          floorLabels: floorplan.images.map((im) => im.label ?? ''),
          centerNorm: floorplan.centerNorm,
        })
        roomFindings = deriveRoomFindings(interior, {
          combinations,
          sitPalace,
          mingLucky: baZhaiResult?.lucky ?? [],
          mingUnlucky: baZhaiResult?.unlucky ?? [],
          ...(baZhaiResult?.concord ? { concord: baZhaiResult.concord } : {}),
          floorLabels: floorplan.images.map((im) => im.label),
        })
        interiorQueJiao = interior.floors.flatMap((floor, i) => {
          const floorLabel = floorplan.images[i]?.label
          return floor.缺角.map((q) => ({
            palace: q.palace,
            ...(q.note ? { note: q.note } : {}),
            ...(floorLabel ? { floorLabel } : {}),
          }))
        })
        fengLogger.info('job.stage.done', {
          jobId,
          stage: 'interior',
          durationMs: Date.now() - interiorStarted,
          floors: interior.floors.length,
          rooms: roomFindings.length,
          modelVersion: interior.modelVersion,
        })
        stageMs.interior = Date.now() - interiorStarted
      } catch (err) {
        interior = null
        roomFindings = []
        fengLogger.warn('job.interior.error', {
          jobId,
          error: err instanceof Error ? err.message : String(err),
        })
      }
      }
    }

    // ── Persist SHELL report (two-phase load) ──
    // Everything except the written chapters is ready here: 排盘 / 八宅 / 形理 /
    // 坐向 / satellite tiles. Persist it and expose the reportId NOW, before the
    // slow LLM synthesis, so the client renders the computed report in seconds
    // and streams the chapters in when they land (instead of a 60–90s blank wait).
    const reportId = nanoid()
    const residenceHeuristic = inferResidenceHeuristic(
      terrain,
      normalizeResidenceType(site.residenceType)
    )
    const dataQuality = deriveDataQuality(site, terrain, {
      hasBirthProfile: profile != null,
      residenceHeuristic,
      extraNotes: interiorExtraNotes,
    })
    const computeJson = JSON.stringify({
      flyingStars,
      baZhai: baZhaiResult,
      auspiciousPalaces,
      inauspiciousPalaces,
      patterns,
      combinations,
      formLi,
      macroTerrain: elevation ? { laiLong: elevation.laiLong, byPalace: elevation.byPalace } : null,
      streetAttribution,
      monthlyStars,
      interior: interior ? { floors: interior.floors, modelVersion: interior.modelVersion } : null,
      roomFindings,
      interiorSha: interior ? interior.floors.flatMap((f) => f.形煞) : [],
      interiorQueJiao,
    })
    await db.insert(fengReports).values({
      id: reportId,
      siteId: site.id,
      userId: site.userId,
      fengYear,
      currentYuan: (flyingStars?.currentYuanYun ?? presentYuan).yuanYun,
      visionJson: JSON.stringify(vision),
      computeJson,
      chapters: '[]', // filled by the UPDATE after synthesis (Phase 2)
      dataQuality: JSON.stringify(dataQuality),
      modelVersions: JSON.stringify({ vision: vision.modelVersion }),
      annotatedMapKeys: JSON.stringify(annotatedByTile),
      generatedAt: new Date().toISOString(),
    })

    shellReportId = reportId
    // ── Stage: synthesis ── (reportId now set → client shows the shell)
    await setStage(db, jobId, 'synthesis', 85, { reportId })
    const synthesisStarted = Date.now()

    const { context: memoryContext, hitCount: memoryHitCount } = await searchPortfolioReadingMemory(
      env,
      {
        userId: site.userId,
        targetApp: 'hexastral',
        query: `feng-shui site analysis ${site.name} ${site.formattedAddress}`,
        locale,
      }
    )
    fengLogger.info('job.portfolio_memory', {
      jobId,
      hitCount: memoryHitCount,
      contextChars: memoryContext.length,
    })

    const synth = await synthesizeReport(env.SVC_FENG, {
      vision,
      compute: {
        // Explicit identity so the model opens with 坐山向 + 卦运 and can reason
        // about present-day 旺衰 (a chart built in one 元运, read in another).
        summary:
          flyingStars != null
            ? {
              sit: flyingStars.sitMountain.name,
              face: flyingStars.faceMountain.name,
              buildYuanYun: flyingStars.buildYuanYun.yuanYun,
              buildYuanYunYears: [
                flyingStars.buildYuanYun.startYear,
                flyingStars.buildYuanYun.endYear,
              ],
              currentYuanYun: flyingStars.currentYuanYun.yuanYun,
              currentYuanYunYears: [
                flyingStars.currentYuanYun.startYear,
                flyingStars.currentYuanYun.endYear,
              ],
              chartMethod: flyingStars.chartMethod,
              isCompoundFacing: flyingStars.isCompoundFacing,
            }
            : {
              sit: sitMountain.name,
              face: faceMountain.name,
              flyingStarsOmitted: true,
              currentYuanYun: presentYuan.yuanYun,
              currentYuanYunYears: [presentYuan.startYear, presentYuan.endYear],
            },
        flyingStars: flyingStars ?? null,
        annualChart: flyingStars?.annualChart ?? annualChart(dateToFlyingYear(today)),
        baZhai: baZhaiResult ?? null,
        auspiciousPalaces,
        inauspiciousPalaces,
        patterns,
        combinations,
        formLi,
        // Pass the per-8宫 relative elevation (already computed), not just 来龙,
        // so chapter 1 can describe the 砂 backdrop per sector authoritatively.
        macroTerrain: elevation
          ? { laiLong: elevation.laiLong, byPalace: elevation.byPalace }
          : null,
        monthlyStars,
        // Room-level interior join (户型图) — empty when no floor plan uploaded.
        roomFindings,
        interiorSha: interior ? interior.floors.flatMap((f) => f.形煞) : [],
        interiorQueJiao,
      },
      userProfile: {
        birthDate: profile?.birthDate ?? '',
        gender: profile?.gender ?? '男',
        locale,
      },
      memoryContext: memoryContext || undefined,
      dataQuality,
      mustSoften: mustSoften.length > 0 ? mustSoften : undefined,
    })
    fengLogger.info('job.stage.done', {
      jobId,
      stage: 'synthesis',
      durationMs: Date.now() - synthesisStarted,
      modelVersion: synth.modelVersion,
    })
    stageMs.synthesis = Date.now() - synthesisStarted

    // A degraded synthesis (all LLM tiers failed → generic stub chapters) is NOT a
    // sellable report. Fail the job so (a) the single-purchase entitlement is NOT
    // consumed (consume happens only after a successful UPDATE below) and (b) the
    // orphan shell is deleted in the catch — the user retries a fresh run. The
    // '-fallback' suffix is locale-independent (set in svc-feng synthesize.ts).
    if (synth.modelVersion.endsWith('-fallback')) {
      throw new Error('synthesis degraded to fallback chapters — not persisting a paid stub')
    }

    // 无生辰 → 无八宅命卦：drop the 个人命卦匹配 chapter entirely so the report
    // is a clean 5 chapters rather than padding personal_fit with generic filler.
    // Birth info unlocks it (6 chapters). The client renders whatever chapters
    // land, so this alone drives the 5-vs-6 page count.
    const chapters = (() => {
      let list = baZhaiResult
        ? synth.chapters
        : synth.chapters.filter((ch) => ch.kind !== 'personal_fit')
      if (!includeFlyingStars) {
        list = list.filter((ch) => ch.kind !== 'flying_stars')
      }
      return list
    })()

    // ── Phase 2: fill the shell with the written chapters + flip job done ──
    await db
      .update(fengReports)
      .set({
        chapters: JSON.stringify(chapters),
        modelVersions: JSON.stringify({
          vision: vision.modelVersion,
          synthesis: synth.modelVersion,
        }),
        generatedAt: new Date().toISOString(),
      })
      .where(eq(fengReports.id, reportId))

    await setStage(db, jobId, 'done', 100, {
      finishedAt: new Date().toISOString(),
    })

    // Consume the single purchase only after the report is safely persisted —
    // consuming on enqueue would burn the entitlement on a failed analysis.
    // The status guard makes this idempotent under queue retries.
    if (purchaseId) {
      const consumed = await db
        .update(singlePurchases)
        .set({
          status: 'consumed',
          readingId: reportId,
          consumedAt: new Date().toISOString(),
        })
        .where(and(eq(singlePurchases.id, purchaseId), eq(singlePurchases.status, 'purchased')))
        .returning({ id: singlePurchases.id })
      fengLogger.info('job.purchase_consumed', {
        jobId,
        purchaseId,
        consumed: consumed.length > 0,
      })
    }

    fengLogger.info('job.cost', {
      jobId,
      siteId: site.id,
      reportId,
      durationMs: Date.now() - jobStarted,
      stagesMs: stageMs,
      tilesRendered: tilesToRender.length,
      annotatedTiles: annotatedKeys.length,
      formAzimuths: terrain.formAzimuths?.length ?? 0,
      residenceType,
      streetViewEnabled,
      inputScore: dataQuality.inputScore,
    })

    fengLogger.info('job.done', {
      jobId,
      siteId: site.id,
      reportId,
      durationMs: Date.now() - jobStarted,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    fengLogger.error('job.failed', {
      jobId,
      siteId: site.id,
      durationMs: Date.now() - jobStarted,
      error: message,
    })
    // Delete the orphaned two-phase shell (only if synthesis never filled it —
    // chapters still '[]'), so a failed job can't leave a permanent fake-loading
    // report behind. Retry re-runs the whole pipeline from scratch.
    if (shellReportId) {
      try {
        await db
          .delete(fengReports)
          .where(and(eq(fengReports.id, shellReportId), eq(fengReports.chapters, '[]')))
      } catch (cleanupErr) {
        fengLogger.warn('job.shell_cleanup_failed', {
          jobId,
          reportId: shellReportId,
          error: cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr),
        })
      }
    }
    await markFailed(db, jobId, message)
  }
}
