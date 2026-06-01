/**
 * Domain types for the Fēng (風) feng-shui flagship and the Compass (羅)
 * satellite.
 *
 * These types mirror the contract exposed by hexastral-api routes (planned
 * Phase E Week 4-5):
 *
 *   POST   /api/feng/sites               create site
 *   GET    /api/feng/sites               list user sites
 *   GET    /api/feng/sites/:id           get site + last report
 *   PATCH  /api/feng/sites/:id           edit name / facing / build year
 *   DELETE /api/feng/sites/:id           soft-delete
 *   POST   /api/feng/sites/:id/analyze   kick off async analysis → {jobId}
 *   GET    /api/feng/jobs/:jobId         poll {stage, progress, result?}
 *   POST   /api/feng/sites/:id/share     generate share URL
 *   GET    /api/feng/declination         lat,lng → magnetic declination
 *   POST   /api/compass/log              pro-tier bearing log entry
 *   GET    /api/compass/logs             pro-tier history
 *
 * Compute primitives live in @zhop/astro-core/feng — re-exported here for
 * convenience.
 */

import type {
  BaguaPalace,
  BaZhaiResult,
  FlyingStarsResult,
  MingGua,
  Mountain,
  YuanYun,
} from '@zhop/astro-core'

// ── Site (a saved address with feng-shui orientation metadata) ──────────────

export interface FengSite {
  id: string
  userId: string
  name: string
  label?: string | null

  lat: number
  lng: number
  formattedAddress: string

  /** Facing direction in true-north degrees, [0, 360). */
  facingDegTrue: number
  /** Magnetic facing, derived from `facingDegTrue + magneticDeclination`. */
  facingDegMagnetic: number
  /** Snapshot of magnetic declination at site creation (degrees east of true north). */
  magneticDeclination: number
  /** 坐 direction. Always (facingDegTrue + 180) mod 360. */
  sitDegTrue: number
  /** Main door direction if different from `facingDegTrue`. */
  doorDegTrue?: number | null

  buildYear?: number | null
  buildYearAccuracy: 'exact' | 'decade' | 'moveIn' | 'unknown'
  moveInYear?: number | null
  floor?: number | null

  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

// ── Vision pipeline output (Stage 1 — Gemini 2.5 Pro Vision) ────────────────

export type ShaSeverity = 1 | 2 | 3 | 4 | 5

export type ShaType =
  | '路冲'
  | '反弓'
  | '尖角'
  | '天斩'
  | '孤峰'
  | '电塔'
  | '桥煞'
  | '剪刀煞'
  | 'other'

export type ShaDistance = 'near' | 'mid' | 'far'

export interface ShaObservation {
  type: ShaType
  /** Bagua direction the threat lies in, relative to the building. */
  direction: BaguaPalace
  distance: ShaDistance
  severity: ShaSeverity
  /** What in the image led to this call — passed through to Stage 3. */
  evidence: string
}

export interface ShaObservationSet {
  形煞: ShaObservation[]
  砂: Array<{
    type: '后靠' | '青龙' | '白虎' | '案山' | '朝山' | 'other'
    direction: BaguaPalace
    distance: ShaDistance
    strength: 'strong' | 'medium' | 'weak'
  }>
  水: Array<{
    type: '明堂' | '反水' | '割脚' | '玉带' | '池塘' | '河' | '路' | 'other'
    direction: BaguaPalace
    distance: ShaDistance
    flow: 'in' | 'out' | 'still'
  }>
  朝案: Array<{
    type: '案山' | '朝山' | '案水' | 'other'
    direction: BaguaPalace
    distance: ShaDistance
  }>
  notes?: string
}

// ── Compute pipeline output (Stage 2 — astro-core/feng) ─────────────────────

export interface FengComputeJson {
  flyingStars: FlyingStarsResult
  baZhai: BaZhaiResult
  /** Convenience field: which palaces are currently 当令/生气 for caller's
   *  rendering needs. */
  auspiciousPalaces: BaguaPalace[]
  inauspiciousPalaces: BaguaPalace[]
}

// ── Report (Stage 3 output — synthesis) ─────────────────────────────────────

export type FengChapterKind =
  | 'external_landform' // 外巒頭概览
  | 'personal_fit' // 个人命卦匹配
  | 'flying_stars' // 玄空当运
  | 'annual_directions' // 流年方位
  | 'remediation' // 化解建议
  | 'auspicious_objects' // 改运配饰

export interface FengChapter {
  kind: FengChapterKind
  title: string
  /** 30-char-or-less CJK / 50-char latin lead — for share cards. */
  goldenLine: string
  /** Long-form 150–250 words. */
  body: string
  /** Optional structured visual data the chapter renderer can use. */
  visualData?: unknown
}

export interface FengReport {
  id: string
  siteId: string
  userId: string

  generatedAt: string
  /** Gregorian year this report's 流年 layer is keyed to. */
  fengYear: number
  currentYuan: YuanYun

  /** Data quality footer — derived from buildYearAccuracy. */
  dataQuality: {
    hasExactBuildYear: boolean
    flyingStarsConfidence: 'high' | 'medium' | 'low' | 'omitted'
    notes: string[]
  }

  vision: ShaObservationSet
  compute: FengComputeJson
  chapters: FengChapter[]

  modelVersions: {
    vision: string
    synthesis: string
  }
}

// ── Job polling ─────────────────────────────────────────────────────────────

export type FengJobStage = 'maps' | 'vision' | 'compute' | 'synthesis' | 'done' | 'failed'

export interface FengJob {
  id: string
  siteId: string
  stage: FengJobStage
  /** 0–100 integer (server-canonical). */
  progress: number
  startedAt: string
  finishedAt?: string | null
  errorMessage?: string | null
  /** Populated when `stage === 'done'`. */
  result?: FengReport | null
}

/** API shape returned by GET /api/feng/jobs/:id (the lightweight version of FengJob). */
export interface FengJobResponse {
  id: string
  siteId: string
  stage: FengJobStage
  progress: number
  reportId: string | null
  errorMessage: string | null
  startedAt: string
  finishedAt: string | null
  /** Populated only when stage === 'done'. Subset of FengReport — server-side
   *  trims the raw vision JSON (large) but keeps `compute` (small + needed
   *  for the in-chapter FlyingStarsGrid / BaZhaiWheel visuals). */
  report: null | {
    id: string
    fengYear: number
    currentYuan: number
    chapters: FengChapter[]
    compute: FengComputeJson
    dataQuality: FengReport['dataQuality']
    modelVersions: FengReport['modelVersions']
    /** Tile scales for which annotated PNGs exist in R2 — driven by the F2
     *  prefetch's adaptive rendering. Empty for legacy / partial-run reports. */
    annotatedTiles: Array<'close' | 'mid' | 'wide'>
    generatedAt: string
  }
}

/** Tile scales available in F4 annotated-map serving. */
export type FengAnnotatedTile = 'close' | 'mid' | 'wide'

/** API shape returned by GET /api/feng/reports/:reportId/maps/:tile. */
export interface FengAnnotatedMapResponse {
  tile: FengAnnotatedTile
  /** Raw base64 (no `data:` prefix). */
  base64: string
  contentType: string
}

/** API shape returned by GET /api/feng/sites/:id — site + optional latestReport summary. */
export interface FengSiteWithLatestReport {
  site: FengSite
  latestReport: FengJobResponse['report']
}

// ── Compass bearing log (pro-tier) ──────────────────────────────────────────

export interface CompassBearing {
  id: string
  userId: string
  lat: number
  lng: number
  /** True-north degrees. */
  bearingDegTrue: number
  /** Magnetic degrees at time of capture (declination snapshot). */
  bearingDegMagnetic: number
  magneticDeclination: number
  label?: string | null
  photoR2Key?: string | null
  createdAt: string
}

// ── Map proxy types (between client and svc-feng) ───────────────────────────

export type MapMode = 'satellite' | 'satellite-streets' | 'streets' | 'outdoors'

export interface MapRenderRequest {
  lat: number
  lng: number
  zoom: number
  /** Pixel dimensions; the server enforces a fixed scale of 2x for retina. */
  width: number
  height: number
  mode: MapMode
}

export interface MapRenderResponse {
  url: string
  /** Content hash for cache busting / client-side reuse. */
  contentHash: string
  cachedUntil: string
}

// ── Re-exports for convenient consumer imports ──────────────────────────────

export type { BaguaPalace, BaZhaiResult, FlyingStarsResult, MingGua, Mountain, YuanYun }
