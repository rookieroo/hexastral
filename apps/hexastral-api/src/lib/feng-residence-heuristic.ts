/**
 * Cross-check user-declared residence type against prefetch terrain signals.
 * Warn-only — never auto-rewrite residenceType.
 */

import type { TerrainSignals } from './feng-client'

export type FengResidenceType = 'apartment' | 'flat' | 'villa'

export interface ResidenceHeuristicResult {
  suggestedResidence?: FengResidenceType
  mismatch: boolean
  reason?: string
}

export function inferResidenceHeuristic(
  terrain: TerrainSignals,
  declared: FengResidenceType
): ResidenceHeuristicResult {
  if (terrain.degraded) return { mismatch: false }

  const flatUrban = !terrain.hasWater && !terrain.hasMountain
  const denseUrban = flatUrban && terrain.roadFeatureCount >= 3

  if (declared === 'villa' && denseUrban && !terrain.hasMountain) {
    return {
      suggestedResidence: 'apartment',
      mismatch: true,
      reason: 'flat_urban_high_road_density',
    }
  }
  if (declared === 'apartment' && terrain.hasMountain && terrain.elevationRangeM > 25) {
    return {
      suggestedResidence: 'villa',
      mismatch: true,
      reason: 'mountain_elevation_range',
    }
  }
  return { mismatch: false }
}
