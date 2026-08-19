/** Estimated time to finish the biometric disclosure before enabling Agree. */

const CHARS_PER_MINUTE = 380
const MIN_MS = 6_000
const MAX_MS = 18_000

export function estimateConsentReadMs(charCount: number): number {
  const n = Math.max(0, charCount)
  const ms = Math.round((n / CHARS_PER_MINUTE) * 60_000)
  return Math.min(MAX_MS, Math.max(MIN_MS, ms))
}
