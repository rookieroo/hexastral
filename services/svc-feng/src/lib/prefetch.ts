/**
 * Mapbox Tilequery prefetch — deterministic signals before VLM.
 *
 * Vision-pipeline cost optimization (Phase H · F2): before rendering 3 satellite
 * tiles and burning Gemini Vision tokens on each, ask Mapbox vector tiles
 * whether the location even has 砂 (mountains) or 水 (water) worth analyzing.
 * In flat urban areas (most US/SG/TOK users), this skips ~50–70 % of Vision
 * tokens. Empty 砂/水 chapters become explicit "clean exterior" notes rather
 * than Vision-degradation artifacts.
 *
 * Two tile queries, both on the Mapbox free tier:
 *   - `mapbox.mapbox-streets-v8`  layers `water,waterway`  radius 500 m
 *   - `mapbox.mapbox-terrain-v2`  layer  `contour`          radius 1000 m
 *
 * Adaptive tile recommendation:
 *   - `close` (100 m, zoom 19) — always rendered (urban 形煞: 路冲/反弓/尖角)
 *   - `mid`   (500 m, zoom 17) — only if water OR elevation present
 *   - `wide`  (2 km, zoom 14)  — only if elevation range > 10 m (mountains)
 */

import { computeFormAzimuths, type FormAzimuthFeature } from './form-azimuth'

export type { FormAzimuthFeature } from './form-azimuth'

const STREETS_TILESET = 'mapbox.mapbox-streets-v8'
const TERRAIN_TILESET = 'mapbox.mapbox-terrain-v2'

export type AdaptiveTile = 'close' | 'mid' | 'wide'

export interface TerrainSignals {
  /** True if any water/waterway feature within 500m. */
  hasWater: boolean
  /** Raw water feature count (capped at limit). */
  waterFeatureCount: number
  /** True if elevation range exceeds threshold within 1km. */
  hasMountain: boolean
  /** max(ele) - min(ele) across returned contour features, in meters. */
  elevationRangeM: number
  /** Raw contour feature count (capped at limit). */
  contourCount: number
  /** Which satellite tiles the orchestrator should render. */
  recommendedTiles: AdaptiveTile[]
  /** Subset of {砂, 水, 朝案} the vision pipeline should expect. */
  expectedFeatures: ('砂' | '水' | '朝案')[]
  /** Human-readable summary for logs / dataQuality footer. */
  summary: string
  /** Bearing (true north °) from site to nearest road segment within 150m. */
  nearestRoadBearingDeg: number | null
  /** Road feature count within 150m (motorway/road/street). */
  roadFeatureCount: number
  /** Computed water/road bearings from Tilequery (authoritative for 归宫). */
  formAzimuths: FormAzimuthFeature[]
  /** True if Mapbox call failed; orchestrator should render all 3 tiles. */
  degraded: boolean
}

const FAIL_OPEN: TerrainSignals = {
  hasWater: false,
  waterFeatureCount: 0,
  hasMountain: false,
  elevationRangeM: 0,
  contourCount: 0,
  recommendedTiles: ['close', 'mid', 'wide'],
  expectedFeatures: ['砂', '水', '朝案'],
  summary: 'prefetch unavailable; running full pipeline',
  nearestRoadBearingDeg: null,
  roadFeatureCount: 0,
  formAzimuths: [],
  degraded: true,
}

interface TilequeryFeature {
  type: 'Feature'
  properties?: Record<string, unknown>
  geometry?: unknown
}

interface TilequeryResponse {
  type: 'FeatureCollection'
  features: TilequeryFeature[]
}

async function queryTileset(
  tileset: string,
  lat: number,
  lng: number,
  radiusM: number,
  layers: string[],
  token: string,
  signal?: AbortSignal
): Promise<TilequeryFeature[]> {
  const url = new URL(`https://api.mapbox.com/v4/${tileset}/tilequery/${lng},${lat}.json`)
  url.searchParams.set('radius', String(radiusM))
  url.searchParams.set('limit', '50')
  url.searchParams.set('layers', layers.join(','))
  url.searchParams.set('access_token', token)

  const res = await fetch(url.toString(), { signal })
  if (!res.ok) {
    throw new Error(`Tilequery ${tileset} ${res.status}`)
  }
  const data = (await res.json()) as TilequeryResponse
  return Array.isArray(data.features) ? data.features : []
}

function maxMinElevation(features: TilequeryFeature[]): {
  min: number
  max: number
  count: number
} {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  let count = 0
  for (const f of features) {
    const ele = f.properties?.ele
    if (typeof ele === 'number' && Number.isFinite(ele)) {
      if (ele < min) min = ele
      if (ele > max) max = ele
      count++
    }
  }
  if (count === 0) return { min: 0, max: 0, count: 0 }
  return { min, max, count }
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const Δλ = toRad(lng2 - lng1)
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function extractLineCoords(geometry: unknown): Array<[number, number]> {
  if (!geometry || typeof geometry !== 'object') return []
  const g = geometry as { type?: string; coordinates?: unknown }
  if (g.type === 'LineString' && Array.isArray(g.coordinates)) {
    return g.coordinates.filter(
      (c): c is [number, number] =>
        Array.isArray(c) && c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number'
    )
  }
  if (g.type === 'MultiLineString' && Array.isArray(g.coordinates)) {
    const out: Array<[number, number]> = []
    for (const line of g.coordinates) {
      if (!Array.isArray(line)) continue
      for (const c of line) {
        if (Array.isArray(c) && c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number') {
          out.push([c[0], c[1]])
        }
      }
    }
    return out
  }
  return []
}

function nearestRoadBearingDeg(
  lat: number,
  lng: number,
  features: TilequeryFeature[]
): { bearing: number | null; count: number } {
  let bestDist = Number.POSITIVE_INFINITY
  let bestBearing: number | null = null
  let count = 0
  for (const f of features) {
    const coords = extractLineCoords(f.geometry)
    if (coords.length === 0) continue
    count++
    for (const [cLng, cLat] of coords) {
      const d = haversineM(lat, lng, cLat, cLng)
      if (d < bestDist) {
        bestDist = d
        bestBearing = bearingDeg(lat, lng, cLat, cLng)
      }
    }
  }
  return { bearing: bestBearing, count }
}

export interface PrefetchInput {
  lat: number
  lng: number
  mapboxToken: string
  /** Override the elevation-range threshold (meters) used to flag mountains. */
  mountainThresholdM?: number
  /** Override the per-call timeout (default 4s). */
  timeoutMs?: number
}

export async function prefetchTerrainSignals(input: PrefetchInput): Promise<TerrainSignals> {
  if (!input.mapboxToken) return FAIL_OPEN

  const mountainThresholdM = input.mountainThresholdM ?? 10
  const timeoutMs = input.timeoutMs ?? 4_000
  const controller = AbortSignal.timeout(timeoutMs)

  try {
    const [waterFeatures, contourFeatures, roadFeatures] = await Promise.all([
      queryTileset(
        STREETS_TILESET,
        input.lat,
        input.lng,
        500,
        ['water', 'waterway'],
        input.mapboxToken,
        controller
      ),
      queryTileset(
        TERRAIN_TILESET,
        input.lat,
        input.lng,
        1000,
        ['contour'],
        input.mapboxToken,
        controller
      ),
      queryTileset(
        STREETS_TILESET,
        input.lat,
        input.lng,
        150,
        ['road', 'motorway', 'street'],
        input.mapboxToken,
        controller
      ),
    ])

    const hasWater = waterFeatures.length > 0
    const elev = maxMinElevation(contourFeatures)
    const elevationRangeM = elev.count > 0 ? elev.max - elev.min : 0
    const hasMountain = elevationRangeM >= mountainThresholdM

    const recommendedTiles: AdaptiveTile[] = ['close']
    if (hasWater || hasMountain) recommendedTiles.push('mid')
    if (hasMountain) recommendedTiles.push('wide')

    const expectedFeatures: ('砂' | '水' | '朝案')[] = []
    if (hasMountain) expectedFeatures.push('砂', '朝案')
    if (hasWater) expectedFeatures.push('水')

    const road = nearestRoadBearingDeg(input.lat, input.lng, roadFeatures)
    const formAzimuths = computeFormAzimuths(input.lat, input.lng, waterFeatures, roadFeatures)

    const summary = [
      hasWater ? `water:${waterFeatures.length} within 500m` : 'no water within 500m',
      hasMountain
        ? `elevation:${elevationRangeM.toFixed(0)}m range within 1km`
        : `flat (range ${elevationRangeM.toFixed(0)}m)`,
      road.count > 0
        ? `roads:${road.count} within 150m bearing ${road.bearing == null ? 'n/a' : Math.round(road.bearing)}°`
        : 'no roads within 150m',
    ].join('; ')

    return {
      hasWater,
      waterFeatureCount: waterFeatures.length,
      hasMountain,
      elevationRangeM,
      contourCount: elev.count,
      recommendedTiles,
      expectedFeatures,
      summary,
      nearestRoadBearingDeg: road.bearing,
      roadFeatureCount: road.count,
      formAzimuths,
      degraded: false,
    }
  } catch {
    return FAIL_OPEN
  }
}
