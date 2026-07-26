/**
 * FacingSamples — multi-sample compass stats for 立极 ritual.
 */

export interface FacingSamplesMeta {
  samples: number[]
  mean: number
  maxDelta: number
}

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360
}

/** Smallest signed angle a→b in (−180, 180]. */
export function signedDeltaDeg(a: number, b: number): number {
  let d = normalizeDeg(b) - normalizeDeg(a)
  while (d > 180) d -= 360
  while (d <= -180) d += 360
  return d
}

export function circularMeanDeg(samples: number[]): number {
  if (samples.length === 0) return 0
  let sx = 0
  let sy = 0
  for (const s of samples) {
    const r = (normalizeDeg(s) * Math.PI) / 180
    sx += Math.cos(r)
    sy += Math.sin(r)
  }
  return normalizeDeg((Math.atan2(sy, sx) * 180) / Math.PI)
}

export function maxSampleDeltaDeg(samples: number[]): number {
  if (samples.length < 2) return 0
  let max = 0
  for (let i = 0; i < samples.length; i++) {
    for (let j = i + 1; j < samples.length; j++) {
      const d = Math.abs(signedDeltaDeg(samples[i]!, samples[j]!))
      if (d > max) max = d
    }
  }
  return max
}

export function summarizeFacingSamples(samples: number[]): FacingSamplesMeta | null {
  if (samples.length === 0) return null
  const normalized = samples.map(normalizeDeg)
  return {
    samples: normalized,
    mean: Math.round(circularMeanDeg(normalized) * 10) / 10,
    maxDelta: Math.round(maxSampleDeltaDeg(normalized) * 10) / 10,
  }
}

/** Magnetic interference threshold for ritual warn (plan: Δ>8°). */
export const FACING_SAMPLE_WARN_DELTA_DEG = 8
