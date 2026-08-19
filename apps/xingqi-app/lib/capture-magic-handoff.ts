type CaptureMagicHandoff = {
  spread: number
  ritual: number
  /** Screen-space center Y of the home stack anchor (measureInWindow). */
  startCenterY: number
  createdAtMs: number
}

let handoff: CaptureMagicHandoff | null = null

export function setCaptureMagicHandoff(next: {
  spread: number
  ritual: number
  startCenterY: number
}): void {
  handoff = {
    spread: next.spread,
    ritual: next.ritual,
    startCenterY: next.startCenterY,
    createdAtMs: Date.now(),
  }
}

export function consumeCaptureMagicHandoff(maxAgeMs = 2500): CaptureMagicHandoff | null {
  const now = Date.now()
  const current = handoff
  handoff = null
  if (!current) return null
  if (now - current.createdAtMs > maxAgeMs) return null
  return current
}
