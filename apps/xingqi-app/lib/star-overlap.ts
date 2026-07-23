/**
 * Nudge overlapping locus stars apart in normalized image space.
 * Does not change stored landmarks — display-only.
 */

const DEFAULT_MIN_DIST = 0.04
const MAX_ITERS = 8
const NUDGE = 0.012

export type SeparablePoint = { x: number; y: number }

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

/** Radial separation for points closer than minDist (normalized 0..1). */
export function separateOverlappingPoints<T extends SeparablePoint>(
  items: T[],
  minDist = DEFAULT_MIN_DIST
): T[] {
  if (items.length < 2) return items
  const out = items.map((p) => ({ ...p, x: p.x, y: p.y }))
  for (let iter = 0; iter < MAX_ITERS; iter++) {
    let moved = false
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i]!
        const b = out[j]!
        const dx = a.x - b.x
        const dy = a.y - b.y
        const d = Math.hypot(dx, dy)
        if (d >= minDist || d < 1e-6) {
          if (d < 1e-6) {
            // Identical: push along a stable angle from index.
            const ang = ((i * 37 + j * 17) % 360) * (Math.PI / 180)
            a.x = clamp01(a.x + Math.cos(ang) * NUDGE)
            a.y = clamp01(a.y + Math.sin(ang) * NUDGE)
            b.x = clamp01(b.x - Math.cos(ang) * NUDGE)
            b.y = clamp01(b.y - Math.sin(ang) * NUDGE)
            moved = true
          }
          continue
        }
        const push = ((minDist - d) / 2) * 0.85
        const ux = dx / d
        const uy = dy / d
        a.x = clamp01(a.x + ux * push)
        a.y = clamp01(a.y + uy * push)
        b.x = clamp01(b.x - ux * push)
        b.y = clamp01(b.y - uy * push)
        moved = true
      }
    }
    if (!moved) break
  }
  return out
}
