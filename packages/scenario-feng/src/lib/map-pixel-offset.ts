/**
 * Web Mercator helpers — convert pixel drag on a static Mapbox preview tile
 * into a lat/lng offset (used by FacingCalibrator building-center pin).
 */

const EARTH_RADIUS_M = 6_378_137
const TILE_SIZE = 256

/** Meters per pixel at a given latitude and zoom (Mapbox / OSM standard). */
export function metersPerPixel(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180
  return (Math.cos(latRad) * 2 * Math.PI * EARTH_RADIUS_M) / (TILE_SIZE * 2 ** zoom)
}

/**
 * Shift a map center by pixel offset on a square preview (x right, y down).
 * Used when the user drags the building pin away from the geocoded address point.
 */
export function pixelOffsetToLatLng(
  lat: number,
  lng: number,
  zoom: number,
  dxPx: number,
  dyPx: number
): { lat: number; lng: number } {
  const mpp = metersPerPixel(lat, zoom)
  const dxM = dxPx * mpp
  const dyM = dyPx * mpp
  const latRad = (lat * Math.PI) / 180
  const dLng = (dxM / (EARTH_RADIUS_M * Math.cos(latRad))) * (180 / Math.PI)
  const dLat = (-dyM / EARTH_RADIUS_M) * (180 / Math.PI)
  return { lat: lat + dLat, lng: lng + dLng }
}
