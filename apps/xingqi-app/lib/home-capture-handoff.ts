/** One-shot: empty home should open in-place capture after consent / birth. */
let pending = false

export function setHomeCaptureHandoff(): void {
  pending = true
}

export function consumeHomeCaptureHandoff(): boolean {
  if (!pending) return false
  pending = false
  return true
}
