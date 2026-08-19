type CaptureMagicHandoff = {
  spread: number
  ritual: number
  createdAtMs: number
}

let handoff: CaptureMagicHandoff | null = null

export function setCaptureMagicHandoff(next: { spread: number; ritual: number }): void {
  handoff = {
    spread: next.spread,
    ritual: next.ritual,
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
