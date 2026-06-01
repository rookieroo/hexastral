/** Feng convention: 0° = true north, clockwise. Screen coords: 0° = east, CCW positive. */

export function normalizeFengDeg(deg: number): number {
  return ((deg % 360) + 360) % 360
}

export function pointToFengDeg(x: number, y: number, center: number): number {
  const dx = x - center
  const dy = y - center
  const svgDeg = (Math.atan2(dy, dx) * 180) / Math.PI
  return normalizeFengDeg(svgDeg + 90)
}

export function nudgeFengDeg(deg: number, delta: number): number {
  return normalizeFengDeg(deg + delta)
}
