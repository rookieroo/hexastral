/**
 * DEM 龙脉 — per-8宫 elevation profile (大峦头 macro 砂).
 *
 * A top-down satellite VLM cannot read terrain height, so 砂 (mountains / high
 * ground) by direction is unreliable from imagery. This samples Mapbox
 * `mapbox-terrain-v2` contour elevation at 8 points around the site (one per
 * 八卦宫, on a ~2.5km ring) and compares each to the site's own elevation:
 * a sector materially higher than the site reads as 砂 (hasMountain). The
 * highest sector is the 来龙方向.
 *
 * Worker-safe: pure Tilequery JSON (no raster decoding). 9 calls in parallel.
 */

const TERRAIN_TILESET = 'mapbox.mapbox-terrain-v2'

export type Palace8 = '坎' | '艮' | '震' | '巽' | '离' | '坤' | '兑' | '乾'

/** 八卦宫 → true-north bearing (clockwise), matching astro-core PALACE_CENTERS. */
const PALACE_BEARINGS: ReadonlyArray<readonly [Palace8, number]> = [
  ['坎', 0],
  ['艮', 45],
  ['震', 90],
  ['巽', 135],
  ['离', 180],
  ['坤', 225],
  ['兑', 270],
  ['乾', 315],
]

export interface PalaceElevation {
  /** Elevation at the sector sample point (m), or null if no contour nearby. */
  ele: number | null
  /** ele − siteBaseline (m); 0 when ele is null. */
  relativeM: number
  /** true when the sector is materially higher than the site (砂/高地). */
  isMountain: boolean
}

export interface ElevationProfile {
  centerEle: number | null
  byPalace: Record<Palace8, PalaceElevation>
  /** Palace with the strongest 来龙 (highest relative elevation), or null. */
  laiLong: Palace8 | null
  degraded: boolean
}

/** Threshold (m) above the site baseline for a sector to count as 砂. */
const MOUNTAIN_THRESHOLD_M = 15

function emptyByPalace(): Record<Palace8, PalaceElevation> {
  return PALACE_BEARINGS.reduce(
    (acc, [p]) => {
      acc[p] = { ele: null, relativeM: 0, isMountain: false }
      return acc
    },
    {} as Record<Palace8, PalaceElevation>
  )
}

const DEGRADED: ElevationProfile = {
  centerEle: null,
  byPalace: emptyByPalace(),
  laiLong: null,
  degraded: true,
}

/** Great-circle destination point from (lat,lng) at bearing/distance. */
function destinationPoint(
  lat: number,
  lng: number,
  bearingDeg: number,
  distM: number
): { lat: number; lng: number } {
  const R = 6_371_000
  const d = distM / R
  const br = (bearingDeg * Math.PI) / 180
  const la1 = (lat * Math.PI) / 180
  const lo1 = (lng * Math.PI) / 180
  const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(br))
  const lo2 =
    lo1 +
    Math.atan2(
      Math.sin(br) * Math.sin(d) * Math.cos(la1),
      Math.cos(d) - Math.sin(la1) * Math.sin(la2)
    )
  return { lat: (la2 * 180) / Math.PI, lng: (lo2 * 180) / Math.PI }
}

/** Nearest contour elevation (m) to a point, or null. Features arrive sorted by distance. */
async function nearestContourEle(
  lat: number,
  lng: number,
  radiusM: number,
  token: string,
  signal?: AbortSignal
): Promise<number | null> {
  const url = new URL(`https://api.mapbox.com/v4/${TERRAIN_TILESET}/tilequery/${lng},${lat}.json`)
  url.searchParams.set('radius', String(radiusM))
  url.searchParams.set('limit', '50')
  url.searchParams.set('layers', 'contour')
  url.searchParams.set('access_token', token)
  const res = await fetch(url.toString(), { signal })
  if (!res.ok) return null
  const data = (await res.json()) as { features?: { properties?: Record<string, unknown> }[] }
  for (const f of data.features ?? []) {
    const e = f.properties?.ele
    if (typeof e === 'number' && Number.isFinite(e)) return e
  }
  return null
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2
}

export interface ElevationProfileInput {
  lat: number
  lng: number
  mapboxToken: string
  /** Ring radius for the 8 sector samples (m). Default 2500. */
  ringRadiusM?: number
  timeoutMs?: number
}

export async function sampleElevationProfile(
  input: ElevationProfileInput
): Promise<ElevationProfile> {
  if (!input.mapboxToken) return DEGRADED
  const ring = input.ringRadiusM ?? 2500
  const sampleRadius = 1200
  const signal = AbortSignal.timeout(input.timeoutMs ?? 6000)

  try {
    const points = PALACE_BEARINGS.map(
      ([p, deg]) => [p, destinationPoint(input.lat, input.lng, deg, ring)] as const
    )
    const [centerEle, ...palaceEles] = await Promise.all([
      nearestContourEle(input.lat, input.lng, 400, input.mapboxToken, signal),
      ...points.map(([, pt]) =>
        nearestContourEle(pt.lat, pt.lng, sampleRadius, input.mapboxToken, signal)
      ),
    ])

    const valid = [centerEle, ...palaceEles].filter((e): e is number => e != null)
    if (valid.length < 2) return DEGRADED
    const baseline = centerEle ?? median(valid)

    const byPalace = emptyByPalace()
    let laiLong: Palace8 | null = null
    let maxRel = MOUNTAIN_THRESHOLD_M
    points.forEach(([p], i) => {
      const ele = palaceEles[i] ?? null
      const relativeM = ele != null ? ele - baseline : 0
      const isMountain = relativeM >= MOUNTAIN_THRESHOLD_M
      byPalace[p] = { ele, relativeM, isMountain }
      if (relativeM >= maxRel) {
        maxRel = relativeM
        laiLong = p
      }
    })

    return { centerEle, byPalace, laiLong, degraded: false }
  } catch {
    return DEGRADED
  }
}
