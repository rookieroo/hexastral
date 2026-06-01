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

import type { Gender } from '@zhop/astro-core'
import { computeBaZhai, computeFlyingStars, palaceAtDegree } from '@zhop/astro-core'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import type { fengJobs as fengJobsTable, fengSites } from '../db/schema'
import { fengJobs, fengReports, users } from '../db/schema'
import type { AppDb, CloudflareBindings } from '../infra-types'
import {
  type AdaptiveTile,
  annotateMap,
  type OverlayArrow,
  prefetchTerrain,
  renderMap,
  synthesizeReport,
  type TerrainSignals,
  type VisionAnalyzeResult,
  visionAnalyze,
} from './feng-client'
import { fengLogger } from './logger'
import { searchPortfolioReadingMemory } from './portfolio-memory'

type Site = typeof fengSites.$inferSelect
type Job = typeof fengJobsTable.$inferSelect

const MAP_TILES: ReadonlyArray<{ key: 'close' | 'mid' | 'wide'; zoom: number; size: number }> = [
  { key: 'close', zoom: 19, size: 600 },
  { key: 'mid', zoom: 17, size: 600 },
  { key: 'wide', zoom: 14, size: 600 },
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

/** Convenience — pull birthDate + gender for the site owner. */
async function loadUserProfile(
  db: AppDb,
  userId: string
): Promise<{ birthDate: string; gender: '男' | '女' } | null> {
  const row = await db.select().from(users).where(eq(users.id, userId)).get()
  if (!row) return null
  const solar = row.birthSolarDate
  const gender = row.birthGender
  if (!solar || (gender !== '男' && gender !== '女')) return null
  return { birthDate: solar, gender }
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

export async function runAnalyzeJob(
  env: CloudflareBindings,
  db: AppDb,
  jobId: string,
  site: Site
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
    const profile = await loadUserProfile(db, site.userId)
    const locale: 'en' | 'zh' | 'zh-Hant' | 'ja' = 'zh' // TODO: persist per-user pref
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

    // ── Stage: synthesis ──
    await setStage(db, jobId, 'synthesis', 85)
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

    const dataQuality = deriveDataQuality(site, terrain)
    const synth = await synthesizeReport(env.SVC_FENG, {
      vision,
      compute: {
        flyingStars,
        baZhai: baZhaiResult ?? null,
        auspiciousPalaces,
        inauspiciousPalaces,
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

    // ── Persist report + flip job ──
    const reportId = nanoid()
    await db.insert(fengReports).values({
      id: reportId,
      siteId: site.id,
      userId: site.userId,
      fengYear,
      currentYuan: flyingStars.currentYuanYun.yuanYun,
      visionJson: JSON.stringify(vision),
      computeJson: JSON.stringify({
        flyingStars,
        baZhai: baZhaiResult,
        auspiciousPalaces,
        inauspiciousPalaces,
      }),
      chapters: JSON.stringify(synth.chapters),
      dataQuality: JSON.stringify(dataQuality),
      modelVersions: JSON.stringify({
        vision: vision.modelVersion,
        synthesis: synth.modelVersion,
      }),
      annotatedMapKeys: JSON.stringify(annotatedByTile),
      generatedAt: new Date().toISOString(),
    })

    await setStage(db, jobId, 'done', 100, {
      reportId,
      finishedAt: new Date().toISOString(),
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
    await markFailed(db, jobId, message)
  }
}
