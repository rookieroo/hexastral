/**
 * Feng coordinate helpers — pin offset from geocode anchor, bearing deltas.
 */

const EARTH_RADIUS_M = 6_378_137
const SAT_TILE_ZOOM = 17
const TILE_SIZE = 256

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a))
}

function metersPerPixel(lat: number, zoom: number): number {
  return (Math.cos(toRad(lat)) * 2 * Math.PI * EARTH_RADIUS_M) / (TILE_SIZE * 2 ** zoom)
}

/** Shift geocode anchor by normalized pin on a square satellite preview (0–1). */
export function pinOffsetCoords(
  geocodeLat: number,
  geocodeLng: number,
  norm: { x: number; y: number },
  zoom = SAT_TILE_ZOOM,
  tileSize = 640
): { lat: number; lng: number } {
  const dx = (norm.x - 0.5) * tileSize
  const dy = (norm.y - 0.5) * tileSize
  const mpp = metersPerPixel(geocodeLat, zoom)
  const dxM = dx * mpp
  const dyM = dy * mpp
  const latRad = toRad(geocodeLat)
  const dLng = (dxM / (EARTH_RADIUS_M * Math.cos(latRad))) * (180 / Math.PI)
  const dLat = (-dyM / EARTH_RADIUS_M) * (180 / Math.PI)
  return { lat: geocodeLat + dLat, lng: geocodeLng + dLng }
}

export function normDeg(deg: number): number {
  return ((deg % 360) + 360) % 360
}

export function orientFacingDeltaDeg(orientDeg: number, facingDeg: number): number {
  const delta = Math.abs(normDeg(orientDeg - facingDeg))
  return Math.min(delta, 360 - delta)
}
