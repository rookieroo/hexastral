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
  computeBaZhai,
  computeFlyingStars,
  correlateFormAndStars,
  dateToFlyingYear,
  describePalaceCombination,
  detectPatterns,
  emptyFormByPalace,
  getMonthByJie,
  monthlyChart,
  NINE_CHART_KEYS,
  palaceAtDegree,
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
import {
  deriveRoomFindings,
  parseSiteFloorplan,
  type RoomFinding,
} from './feng-interior-compute'
import { fengLogger } from './logger'
import { searchPortfolioReadingMemory } from './portfolio-memory'

type Site = typeof fengSites.$inferSelect
type Job = typeof fengJobsTable.$inferSelect

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

function deriveDataQuality(site: Site, terrain?: TerrainSignals) {
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
  const notes: string[] = []
  if (!hasExactBuildYear) {
    notes.push(`build_year_accuracy=${site.buildYearAccuracy}`)
  }
  if (terrain && !terrain.degraded) {
    notes.push(`terrain=${terrain.summary}`)
    if (!terrain.hasWater && !terrain.hasMountain) {
      notes.push('terrain.flat_urban=true (砂/水 chapters scoped to direction-only)')
    }
  }
  return { hasExactBuildYear, flyingStarsConfidence, notes }
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

    if (annotatedKeys.length === 0) {
      throw new Error('annotate stage produced zero keys')
    }

    // ── Stage: vision ──
    await setStage(db, jobId, 'vision', 55)
    const visionStarted = Date.now()
    const { locale, profile } = await loadUserContext(db, site.userId)
    const vision: VisionAnalyzeResult = await visionAnalyze(env.SVC_FENG, {
      annotatedKeys,
      facingDegTrue,
      sitDegTrue,
      doorDegTrue: site.doorDegTrue == null ? undefined : Number(site.doorDegTrue),
      locale,
      expectedFeatures: terrain.expectedFeatures,
      terrainSummary: terrain.summary,
    })
    fengLogger.info('job.stage.done', {
      jobId,
      stage: 'vision',
      durationMs: Date.now() - visionStarted,
      modelVersion: vision.modelVersion,
    })

    // ── Stage: compute (in-process, deterministic) ──
    await setStage(db, jobId, 'compute', 70)
    const today = new Date()
    const fengYear = today.getUTCFullYear()
    const effectiveBuildYear = site.buildYear ?? site.moveInYear ?? fengYear

    const flyingStars = computeFlyingStars({
      buildYear: effectiveBuildYear,
      facingDegTrue,
      asOf: today,
    })

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

    const sitPalace = palaceAtDegree(sitDegTrue)
    const doorPalace =
      site.doorDegTrue == null ? sitPalace : palaceAtDegree(Number(site.doorDegTrue))

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

    // 玄空格局 (deterministic) — fed to synthesis as authoritative + persisted.
    const patterns = detectPatterns({
      yuanYun: flyingStars.buildYuanYun.yuanYun,
      sitPalace: flyingStars.sitMountain.palace,
      facePalace: flyingStars.faceMountain.palace,
      periodChart: flyingStars.periodChart,
      mountainChart: flyingStars.mountainChart,
      facingChart: flyingStars.facingChart,
    })

    // 山向二星组合断事 — the full per-palace 山+向 pair for ALL nine palaces,
    // phase-adjusted by the CURRENT 元运 (present-day 旺衰). We keep the raw star
    // pair + domain + reading (not just named combos) so synthesis can reason on
    // 五行生克 even where the corpus has no classical name.
    const combinations = NINE_CHART_KEYS.map((k) => {
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

    // 小峦头街景形煞 (Mapillary, off unless MAPILLARY_TOKEN). Merge into vision.形煞
    // (binned by the capturing image's compass angle → 宫) so it flows to both
    // formByPalace and synthesis. Fail-open.
    let streetAttribution: string | null = null
    try {
      const street = await streetSha(env.SVC_FENG, { lat, lng, locale })
      if (!street.degraded && street.findings.length > 0) {
        streetAttribution = street.attribution
        for (const f of street.findings) {
          const sev = Math.min(5, Math.max(1, Math.round(f.severity))) as 1 | 2 | 3 | 4 | 5
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

    // 形理整合 — bin vision 砂/水/形煞 into palaces (vision uses 八卦宫名 directly),
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
    for (const x of vision.形煞) {
      const p = directionToPalace(x.direction)
      if (p) formByPalace[p].hasSha = true
    }
    const formLi = correlateFormAndStars({
      yuanYun: flyingStars.currentYuanYun.yuanYun,
      mountainChart: flyingStars.mountainChart,
      facingChart: flyingStars.facingChart,
      formByPalace,
      sitPalace: flyingStars.sitMountain.palace,
      facePalace: flyingStars.faceMountain.palace,
      patterns,
    })

    // ── Stage 1b: interior (户型图 / 室内堪舆) ──
    // When the site has an uploaded floor plan, read each image with Gemini
    // (1 call/image, luopan-oriented via the stated north) and JOIN the rooms
    // with the per-palace 飞星/八宅 already computed above. This is what makes
    // the indoor advice room-specific. Fail-open: a floor-plan failure never
    // blocks the exterior report. Runs before the shell persist so roomFindings
    // are part of computeJson.
    let interior: InteriorVisionResult | null = null
    let roomFindings: RoomFinding[] = []
    const floorplan = parseSiteFloorplan(site.floorplanJson)
    if (floorplan && floorplan.images.length > 0) {
      const interiorStarted = Date.now()
      try {
        interior = await visionInterior(env.SVC_FENG, {
          floorplanKeys: floorplan.images.map((im) => im.key),
          northUpBearing: floorplan.orientDeg,
          locale,
          floorLabels: floorplan.images.map((im) => im.label ?? ''),
        })
        roomFindings = deriveRoomFindings(interior, {
          combinations,
          auspiciousPalaces,
          inauspiciousPalaces,
          floorLabels: floorplan.images.map((im) => im.label),
        })
        fengLogger.info('job.stage.done', {
          jobId,
          stage: 'interior',
          durationMs: Date.now() - interiorStarted,
          floors: interior.floors.length,
          rooms: roomFindings.length,
          modelVersion: interior.modelVersion,
        })
      } catch (err) {
        interior = null
        roomFindings = []
        fengLogger.warn('job.interior.error', {
          jobId,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    // ── Persist SHELL report (two-phase load) ──
    // Everything except the written chapters is ready here: 排盘 / 八宅 / 形理 /
    // 坐向 / satellite tiles. Persist it and expose the reportId NOW, before the
    // slow LLM synthesis, so the client renders the computed report in seconds
    // and streams the chapters in when they land (instead of a 60–90s blank wait).
    const reportId = nanoid()
    const dataQuality = deriveDataQuality(site, terrain)
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
    })
    await db.insert(fengReports).values({
      id: reportId,
      siteId: site.id,
      userId: site.userId,
      fengYear,
      currentYuan: flyingStars.currentYuanYun.yuanYun,
      visionJson: JSON.stringify(vision),
      computeJson,
      chapters: '[]', // filled by the UPDATE after synthesis (Phase 2)
      dataQuality: JSON.stringify(dataQuality),
      modelVersions: JSON.stringify({ vision: vision.modelVersion }),
      annotatedMapKeys: JSON.stringify(annotatedByTile),
      generatedAt: new Date().toISOString(),
    })

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
        summary: {
          sit: flyingStars.sitMountain.name,
          face: flyingStars.faceMountain.name,
          buildYuanYun: flyingStars.buildYuanYun.yuanYun,
          buildYuanYunYears: [flyingStars.buildYuanYun.startYear, flyingStars.buildYuanYun.endYear],
          currentYuanYun: flyingStars.currentYuanYun.yuanYun,
          currentYuanYunYears: [
            flyingStars.currentYuanYun.startYear,
            flyingStars.currentYuanYun.endYear,
          ],
          chartMethod: flyingStars.chartMethod,
          isCompoundFacing: flyingStars.isCompoundFacing,
        },
        flyingStars,
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
      },
      userProfile: {
        birthDate: profile?.birthDate ?? '',
        gender: profile?.gender ?? '男',
        locale,
      },
      memoryContext: memoryContext || undefined,
      dataQuality,
    })
    fengLogger.info('job.stage.done', {
      jobId,
      stage: 'synthesis',
      durationMs: Date.now() - synthesisStarted,
      modelVersion: synth.modelVersion,
    })

    // 无生辰 → 无八宅命卦：drop the 个人命卦匹配 chapter entirely so the report
    // is a clean 5 chapters rather than padding personal_fit with generic filler.
    // Birth info unlocks it (6 chapters). The client renders whatever chapters
    // land, so this alone drives the 5-vs-6 page count.
    const chapters = baZhaiResult
      ? synth.chapters
      : synth.chapters.filter((ch) => ch.kind !== 'personal_fit')

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
    await markFailed(db, jobId, message)
  }
}
