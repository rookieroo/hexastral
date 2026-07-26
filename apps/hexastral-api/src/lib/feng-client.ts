/**
 * svc-feng client — wraps the internal Service Binding fetcher.
 *
 * svc-feng owns Mapbox + Gemini secrets and R2 buckets for raw + annotated
 * map images. hexastral-api orchestrates the analyze pipeline by calling
 * each route in turn (maps → annotate → vision → synthesize), persisting
 * intermediate state in D1 (`feng_jobs` table).
 *
 * Timeouts (queue consumer — generous wall budget; LLM stages are I/O waits):
 *   - Map render: 8s
 *   - Annotate: 4s
 *   - Vision: 60s (dual VLM on real satellite tiles)
 *   - Form-li mid-pass: 28s (route wall ≤25s; client slightly above)
 *   - Synthesize: 150s (lean briefing, maxTokens ≤8192)
 */

type FetcherLike = { fetch(input: RequestInfo, init?: RequestInit): Promise<Response> }

const TIMEOUTS = {
  prefetch: 5_000,
  maps: 8_000,
  annotate: 4_000,
  vision: 60_000,
  formLi: 28_000,
  synthesize: 150_000,
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

export type Palace8 = '坎' | '艮' | '震' | '巽' | '离' | '坤' | '兑' | '乾'

export type AdaptiveTile = 'close' | 'mid' | 'wide'

export type FormAzimuthKind = 'water' | 'waterway' | 'road'

export interface FormAzimuthFeature {
  kind: FormAzimuthKind
  palace: Palace8
  bearingDeg: number
  distanceM: number
  source: 'tilequery'
}

export interface TerrainSignals {
  hasWater: boolean
  waterFeatureCount: number
  hasMountain: boolean
  elevationRangeM: number
  contourCount: number
  recommendedTiles: AdaptiveTile[]
  expectedFeatures: ('砂' | '水' | '朝案')[]
  summary: string
  nearestRoadBearingDeg: number | null
  roadFeatureCount: number
  formAzimuths: FormAzimuthFeature[]
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

// ── Floor plan upload (interior 堪舆) ────────────────────────────

/**
 * Persist a user-uploaded floor-plan image (raw bytes) into svc-feng's owned
 * FLOORPLAN_CACHE and get back its content-addressed key. EXIF/GPS is stripped
 * server-side. hexastral-api does the HMAC/ownership check before calling this.
 */
export async function putFloorplan(
  svc: FetcherLike,
  bytes: ArrayBuffer,
  contentType: string
): Promise<{ key: string }> {
  const res = await svc.fetch(
    new Request('https://svc-feng.internal/floorplan/put', {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: bytes,
      signal: AbortSignal.timeout(TIMEOUTS.maps),
    })
  )
  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown')
    throw new Error(`svc-feng /floorplan/put failed (${res.status}): ${err}`)
  }
  return res.json() as Promise<{ key: string }>
}

export async function getFloorplanImage(
  svc: FetcherLike,
  key: string
): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  const res = await svc.fetch(
    new Request(`https://svc-feng.internal/maps/image/floorplan/${encodeURIComponent(key)}`, {
      method: 'GET',
      signal: AbortSignal.timeout(TIMEOUTS.maps),
    })
  )
  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown')
    throw new Error(`svc-feng floorplan image failed (${res.status}): ${err}`)
  }
  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  return { bytes: await res.arrayBuffer(), contentType }
}

/**
 * Purge floor-plan images from svc-feng's owned FLOORPLAN_CACHE (account / site
 * deletion). The bucket has no lifecycle GC, so this is the only way these PII
 * assets leave storage. Caller must pass only keys owned by the deleting user.
 */
export async function deleteFloorplans(
  svc: FetcherLike,
  keys: string[]
): Promise<{ deleted: number }> {
  if (keys.length === 0) return { deleted: 0 }
  const res = await svc.fetch(
    new Request('https://svc-feng.internal/floorplan/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys }),
      signal: AbortSignal.timeout(TIMEOUTS.maps),
    })
  )
  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown')
    throw new Error(`svc-feng /floorplan/delete failed (${res.status}): ${err}`)
  }
  return res.json() as Promise<{ deleted: number }>
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
  /** Tilequery-computed water/road bearings (authoritative for direction). */
  formAzimuths?: FormAzimuthFeature[]
}

export interface VisionAnalyzeResult {
  形煞: Array<{
    type: string
    direction: string
    distance: 'near' | 'mid' | 'far'
    severity: 1 | 2 | 3 | 4 | 5
    evidence: string
    confidence?: 'high' | 'low'
    geometrySupport?: 'strong' | 'weak' | 'none' | 'inferred-only'
    adjustedSeverity?: number
  }>
  砂: Array<{
    type: string
    direction: string
    distance: 'near' | 'mid' | 'far'
    strength: 'strong' | 'medium' | 'weak'
    confidence?: 'high' | 'low'
    geometrySupport?: 'strong' | 'weak' | 'none' | 'inferred-only'
  }>
  水: Array<{
    type: string
    direction: string
    distance: 'near' | 'mid' | 'far'
    flow: 'in' | 'out' | 'still'
    confidence?: 'high' | 'low'
    geometrySupport?: 'strong' | 'weak' | 'none' | 'inferred-only'
  }>
  朝案: Array<{
    type: string
    direction: string
    distance: 'near' | 'mid' | 'far'
    confidence?: 'high' | 'low'
    geometrySupport?: 'strong' | 'weak' | 'none' | 'inferred-only'
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

// ── Interior vision (Stage 1b — 户型图 / 室内堪舆) ─────────────────

export interface InteriorVisionInput {
  /** 1–6 owned floor-plan R2 keys (1 = apartment · N = villa/multi-floor). */
  floorplanKeys: string[]
  /** True-north bearing of the plans' top edge (from the north-align step). */
  northUpBearing: number
  locale: 'en' | 'zh' | 'zh-Hant' | 'ja'
  floorLabels?: string[]
  /** User-placed 立极 on the cover plan (normalized 0–1). */
  centerNorm?: { x: number; y: number }
}

export interface InteriorFloorResult {
  key: string
  rooms: Array<{ type: string; palace: string; note?: string }>
  形煞: Array<{ type: string; palace: string; severity: number; evidence: string }>
  缺角: Array<{ palace: string; note?: string }>
  notes?: string
}

export interface InteriorVisionResult {
  floors: InteriorFloorResult[]
  modelVersion: string
}

export async function visionInterior(
  svc: FetcherLike,
  input: InteriorVisionInput
): Promise<InteriorVisionResult> {
  return postJson(svc, '/vision/interior', input, TIMEOUTS.vision)
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
    overlayHints?: unknown
    monthlyStars?: unknown
    annualChart?: unknown
    roomFindings?: unknown[]
    interiorSha?: unknown[]
    interiorQueJiao?: unknown[]
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
    inputScore?: number
  }
  mustSoften?: Array<{
    type: string
    direction: string
    geometrySupport: 'weak' | 'none' | 'inferred-only'
  }>
  /** Mid-pass notes; null when fail-opened. */
  formLiNotes?: unknown | null
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

export interface FormLiInterpretResult {
  formLiNotes: unknown | null
  failOpen: boolean
  modelVersion: string
}

/** Mid-pass 形理对照 — fail-open on errors (caller must not fail the job). */
export async function interpretFormLiNotes(
  svc: FetcherLike,
  input: {
    compact: Record<string, unknown>
    compute: Record<string, unknown>
    locale: 'en' | 'zh' | 'zh-Hant' | 'ja'
  }
): Promise<FormLiInterpretResult> {
  try {
    return await postJson(svc, '/form-li/interpret', input, TIMEOUTS.formLi)
  } catch (err) {
    console.warn('[feng-client] form_li fail-open', err)
    return { formLiNotes: null, failOpen: true, modelVersion: 'client-fail-open' }
  }
}
