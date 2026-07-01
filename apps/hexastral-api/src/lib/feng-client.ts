/**
 * svc-feng client — wraps the internal Service Binding fetcher.
 *
 * svc-feng owns Mapbox + Gemini secrets and R2 buckets for raw + annotated
 * map images. hexastral-api orchestrates the analyze pipeline by calling
 * each route in turn (maps → annotate → vision → synthesize), persisting
 * intermediate state in D1 (`feng_jobs` table).
 *
 * Timeouts:
 *   - Map render: 8s (Mapbox usually < 1s, cache hits < 50ms)
 *   - Annotate: 4s (resvg-wasm composition is CPU-bound, sub-second once warm)
 *   - Vision: 30s (Gemini structured output can sit at the upper end)
 *   - Synthesize: 60s (long-form 6 chapters)
 *
 * All routes return JSON except `/maps/render` and `/annotate` which return
 * raw image bytes (the worker writes them to R2 by key — the client only
 * needs the cache key to chain into the next stage).
 */

type FetcherLike = { fetch(input: RequestInfo, init?: RequestInit): Promise<Response> }

const TIMEOUTS = {
  prefetch: 5_000,
  maps: 8_000,
  annotate: 4_000,
  vision: 30_000,
  synthesize: 60_000,
} as const

async function postJson<T>(
  svc: FetcherLike,
  path: string,
  body: unknown,
  timeoutMs: number
): Promise<T> {
  const res = await svc.fetch(
    new Request(`https://svc-feng.internal${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
  )
  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown')
    throw new Error(`svc-feng ${path} failed (${res.status}): ${err}`)
  }
  return res.json() as Promise<T>
}

async function postForBytes(
  svc: FetcherLike,
  path: string,
  body: unknown,
  timeoutMs: number
): Promise<{ bytes: ArrayBuffer; cacheKey: string | null }> {
  const res = await svc.fetch(
    new Request(`https://svc-feng.internal${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
  )
  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown')
    throw new Error(`svc-feng ${path} failed (${res.status}): ${err}`)
  }
  return {
    bytes: await res.arrayBuffer(),
    cacheKey: res.headers.get('x-feng-cache-key'),
  }
}

// ── Prefetch (Stage 0) ──────────────────────────────────────────

export type AdaptiveTile = 'close' | 'mid' | 'wide'

export interface TerrainSignals {
  hasWater: boolean
  waterFeatureCount: number
  hasMountain: boolean
  elevationRangeM: number
  contourCount: number
  recommendedTiles: AdaptiveTile[]
  expectedFeatures: ('砂' | '水' | '朝案')[]
  summary: string
  degraded: boolean
}

export interface PrefetchInput {
  lat: number
  lng: number
}

export async function prefetchTerrain(
  svc: FetcherLike,
  input: PrefetchInput
): Promise<TerrainSignals> {
  return postJson<TerrainSignals>(svc, '/prefetch', input, TIMEOUTS.prefetch)
}

// ── Elevation profile (大峦头 DEM 砂) ────────────────────────────

export type Palace8 = '坎' | '艮' | '震' | '巽' | '离' | '坤' | '兑' | '乾'

export interface ElevationProfile {
  centerEle: number | null
  byPalace: Record<Palace8, { ele: number | null; relativeM: number; isMountain: boolean }>
  laiLong: Palace8 | null
  degraded: boolean
}

export async function elevationProfile(
  svc: FetcherLike,
  input: PrefetchInput
): Promise<ElevationProfile> {
  return postJson<ElevationProfile>(svc, '/terrain/profile', input, TIMEOUTS.prefetch)
}

// ── Street 形煞 (小峦头, Mapillary — off unless MAPILLARY_TOKEN) ──

export interface StreetSha {
  degraded: boolean
  imageCount: number
  /** Mapillary CC-BY-SA attribution; show wherever findings surface. */
  attribution: string
  findings: Array<{ compassAngle: number; type: string; severity: number; evidence: string }>
}

export async function streetSha(
  svc: FetcherLike,
  input: { lat: number; lng: number; locale: 'en' | 'zh' | 'zh-Hant' | 'ja' }
): Promise<StreetSha> {
  return postJson<StreetSha>(svc, '/street/sha', input, TIMEOUTS.vision)
}

// ── Maps ────────────────────────────────────────────────────────

export type MapMode = 'satellite' | 'satellite-streets' | 'streets' | 'outdoors'

export interface MapRenderInput {
  lat: number
  lng: number
  zoom: number
  width: number
  height: number
  mode: MapMode
}

export async function renderMap(
  svc: FetcherLike,
  input: MapRenderInput
): Promise<{ bytes: ArrayBuffer; cacheKey: string | null }> {
  return postForBytes(svc, '/maps/render', input, TIMEOUTS.maps)
}

// ── Annotate ────────────────────────────────────────────────────

export interface OverlayArrow {
  kind: 'sit' | 'face' | 'door'
  degTrue: number
  label: string
}

export interface AnnotateInput {
  mapKey: string
  width: number
  height: number
  arrows: OverlayArrow[]
  drawMountainRing?: boolean
  drawBaguaWedges?: boolean
}

export async function annotateMap(
  svc: FetcherLike,
  input: AnnotateInput
): Promise<{ bytes: ArrayBuffer; cacheKey: string | null }> {
  return postForBytes(svc, '/annotate', input, TIMEOUTS.annotate)
}

// ── Vision (Stage 1) ────────────────────────────────────────────

export interface VisionAnalyzeInput {
  /** 1–3 annotated R2 keys ordered close → mid → wide. Variable length
   *  reflects the prefetch-driven adaptive tile rendering. */
  annotatedKeys: string[]
  facingDegTrue: number
  sitDegTrue: number
  doorDegTrue?: number
  locale: 'en' | 'zh' | 'zh-Hant' | 'ja'
  /** Categories the prefetch signal says are worth analyzing. Vision is
   *  instructed to return empty arrays for the missing categories. */
  expectedFeatures?: ('砂' | '水' | '朝案')[]
  /** Human-readable prefetch summary for the prompt + dataQuality footer. */
  terrainSummary?: string
}

export interface VisionAnalyzeResult {
  形煞: Array<{
    type: string
    direction: string
    distance: 'near' | 'mid' | 'far'
    severity: 1 | 2 | 3 | 4 | 5
    evidence: string
  }>
  砂: Array<{
    type: string
    direction: string
    distance: 'near' | 'mid' | 'far'
    strength: 'strong' | 'medium' | 'weak'
  }>
  水: Array<{
    type: string
    direction: string
    distance: 'near' | 'mid' | 'far'
    flow: 'in' | 'out' | 'still'
  }>
  朝案: Array<{
    type: string
    direction: string
    distance: 'near' | 'mid' | 'far'
  }>
  notes?: string
  modelVersion: string
}

export async function visionAnalyze(
  svc: FetcherLike,
  input: VisionAnalyzeInput
): Promise<VisionAnalyzeResult> {
  return postJson(svc, '/vision/analyze', input, TIMEOUTS.vision)
}

// ── Synthesize (Stage 3) ────────────────────────────────────────

export interface SynthesizeInput {
  vision: VisionAnalyzeResult
  compute: {
    summary?: unknown
    flyingStars: unknown
    baZhai: unknown
    auspiciousPalaces: string[]
    inauspiciousPalaces: string[]
    patterns?: unknown[]
    combinations?: unknown[]
    formLi?: unknown
    macroTerrain?: unknown
    monthlyStars?: unknown
  }
  userProfile: {
    birthDate: string
    gender: '男' | '女'
    locale: 'en' | 'zh' | 'zh-Hant' | 'ja'
  }
  memoryContext?: string
  dataQuality?: {
    hasExactBuildYear: boolean
    flyingStarsConfidence: 'high' | 'medium' | 'low' | 'omitted'
    notes: string[]
  }
}

export interface SynthesizedChapter {
  kind:
    | 'external_landform'
    | 'personal_fit'
    | 'flying_stars'
    | 'annual_directions'
    | 'remediation'
    | 'auspicious_objects'
  title: string
  goldenLine: string
  body: string
}

export interface SynthesizeResult {
  chapters: SynthesizedChapter[]
  modelVersion: string
}

export async function synthesizeReport(
  svc: FetcherLike,
  input: SynthesizeInput
): Promise<SynthesizeResult> {
  return postJson(svc, '/synthesize', input, TIMEOUTS.synthesize)
}
