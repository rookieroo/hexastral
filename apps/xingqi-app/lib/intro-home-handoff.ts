/** One-shot flag: home should skip stack reset flash right after intro mark lands. */
let pending = false

export function setIntroHomeHandoff(): void {
  pending = true
}

export function consumeIntroHomeHandoff(): boolean {
  if (!pending) return false
  pending = false
  return true
}
