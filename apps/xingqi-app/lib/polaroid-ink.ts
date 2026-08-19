/**
 * Deterministic sketch paths for the polaroid photo window.
 * Paper stays a rectangle; ink only traces the well.
 */

function hash01(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

export function wobbleRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  amp: number,
  seed: number,
  steps = 16
): string {
  const pts: { x: number; y: number }[] = []
  const edges: { x0: number; y0: number; x1: number; y1: number; nx: number; ny: number }[] = [
    { x0: x, y0: y, x1: x + w, y1: y, nx: 0, ny: -1 },
    { x0: x + w, y0: y, x1: x + w, y1: y + h, nx: 1, ny: 0 },
    { x0: x + w, y0: y + h, x1: x, y1: y + h, nx: 0, ny: 1 },
    { x0: x, y0: y + h, x1: x, y1: y, nx: -1, ny: 0 },
  ]
  for (const [e, edge] of edges.entries()) {
    for (let i = 0; i < steps; i++) {
      const t = i / steps
      const px = edge.x0 + (edge.x1 - edge.x0) * t
      const py = edge.y0 + (edge.y1 - edge.y0) * t
      const nearCorner = i < 2 || i > steps - 3
      const mag = nearCorner ? amp * 0.25 : amp
      const n = hash01(seed + e * 19 + i * 3.7)
      const off = (n * 2 - 1) * mag
      pts.push({ x: px + edge.nx * off, y: py + edge.ny * off })
    }
  }
  const first = pts[0]
  if (!first) return ''

  let d = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i]
    if (!p) continue
    d += ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
  }
  return `${d} Z`
}

/** Well-local viewBox 0–100. Inset so the stroke sits on the photo edge. */
export const POLAROID_WELL_INK = wobbleRectPath(3.2, 3.4, 93.4, 93.2, 0.7, 11)
export const POLAROID_WELL_INK_GHOST = wobbleRectPath(4.1, 4.0, 91.8, 91.6, 0.95, 29)

export const POLAROID_INK_LEN = 420
