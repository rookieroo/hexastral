/**
 * Street 形煞 cache key helpers — ~50m grid quantization for shared compound coverage.
 */

/** Bump when STREET_SYSTEM_PROMPT or response schema changes. */
export const STREET_SHA_VERSION = 'street-sha-v1'

/** ~50m latitude step (1° lat ≈ 111 km). */
const GRID_STEP_DEG = 0.00045

export function quantizeCoord(value: number): number {
  return Math.round(value / GRID_STEP_DEG) * GRID_STEP_DEG
}

export function streetGridKey(lat: number, lng: number): { gridLat: number; gridLng: number } {
  return {
    gridLat: quantizeCoord(lat),
    gridLng: quantizeCoord(lng),
  }
}
