/**
 * Tilequery feature → computed bearing / palace (D3 azimuth).
 *
 * VLM must not guess direction for water/roads when Mapbox vector tiles
 * already provide coordinates. Used by prefetch and passed to vision + analyze.
 */

import { palaceAtDegree, type BaguaPalace } from '@zhop/astro-core'

export type FormAzimuthKind = 'water' | 'waterway' | 'road'

export interface FormAzimuthFeature {
  kind: FormAzimuthKind
  palace: BaguaPalace
  bearingDeg: number
  distanceM: number
  source: 'tilequery'
}

interface TilequeryFeature {
  type?: string
  properties?: Record<string, unknown>
  geometry?: unknown
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

function extractCoords(geometry: unknown): Array<[number, number]> {
  if (!geometry || typeof geometry !== 'object') return []
  const g = geometry as { type?: string; coordinates?: unknown }
  if (g.type === 'Point' && Array.isArray(g.coordinates) && g.coordinates.length >= 2) {
    const [lng, lat] = g.coordinates
    if (typeof lng === 'number' && typeof lat === 'number') return [[lng, lat]]
  }
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
  if (g.type === 'Polygon' && Array.isArray(g.coordinates)) {
    const ring = g.coordinates[0]
    if (Array.isArray(ring)) {
      return ring.filter(
        (c): c is [number, number] =>
          Array.isArray(c) && c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number'
      )
    }
  }
  return []
}

function nearestOnCoords(
  siteLat: number,
  siteLng: number,
  coords: Array<[number, number]>
): { lat: number; lng: number; distanceM: number; bearingDeg: number } | null {
  if (coords.length === 0) return null
  let bestDist = Number.POSITIVE_INFINITY
  let bestLat = 0
  let bestLng = 0
  for (const [lng, lat] of coords) {
    const d = haversineM(siteLat, siteLng, lat, lng)
    if (d < bestDist) {
      bestDist = d
      bestLat = lat
      bestLng = lng
    }
  }
  return {
    lat: bestLat,
    lng: bestLng,
    distanceM: bestDist,
    bearingDeg: bearingDeg(siteLat, siteLng, bestLat, bestLng),
  }
}

function layerKind(layerId: unknown): FormAzimuthKind | null {
  if (typeof layerId !== 'string') return null
  if (layerId === 'water') return 'water'
  if (layerId === 'waterway') return 'waterway'
  if (layerId === 'road' || layerId === 'motorway' || layerId === 'street') return 'road'
  return null
}

function distanceBand(distanceM: number): 'near' | 'mid' | 'far' {
  if (distanceM < 100) return 'near'
  if (distanceM < 500) return 'mid'
  return 'far'
}

/** Max features returned (nearest per kind+palace deduped). */
const MAX_FEATURES = 24

/**
 * Compute authoritative azimuth features from Tilequery water + road layers.
 */
export function computeFormAzimuths(
  siteLat: number,
  siteLng: number,
  waterFeatures: TilequeryFeature[],
  roadFeatures: TilequeryFeature[]
): FormAzimuthFeature[] {
  const raw: FormAzimuthFeature[] = []

  const ingest = (features: TilequeryFeature[], defaultKind: FormAzimuthKind) => {
    for (const f of features) {
      const kind = layerKind(f.properties?.layer) ?? defaultKind
      const coords = extractCoords(f.geometry)
      const nearest = nearestOnCoords(siteLat, siteLng, coords)
      if (!nearest) continue
      raw.push({
        kind,
        palace: palaceAtDegree(nearest.bearingDeg),
        bearingDeg: Math.round(nearest.bearingDeg),
        distanceM: Math.round(nearest.distanceM),
        source: 'tilequery',
      })
    }
  }

  ingest(waterFeatures, 'water')
  ingest(roadFeatures, 'road')

  // Dedupe: keep nearest per (kind, palace)
  const best = new Map<string, FormAzimuthFeature>()
  for (const item of raw) {
    const key = `${item.kind}:${item.palace}`
    const prev = best.get(key)
    if (!prev || item.distanceM < prev.distanceM) best.set(key, item)
  }

  return [...best.values()]
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, MAX_FEATURES)
}

/** Human-readable lines for the vision user prompt. */
export function formatFormAzimuthsForPrompt(features: FormAzimuthFeature[]): string[] {
  if (features.length === 0) return []
  return features.map(
    (f) =>
      `${f.kind} → ${f.palace} palace @ ${f.bearingDeg}° (${distanceBand(f.distanceM)}, ${f.distanceM}m, tilequery)`
  )
}
