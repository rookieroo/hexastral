/**
 * Shared LLM echo detection — used by ChapterCard (intra-chapter field hiding)
 * and adaptReadingChapters (cross-chapter reef/remedy/counterpoint dedup).
 */

export function compactText(s: string): string {
  return s.replace(/\s+/g, '').trim()
}

/** True when a/b are equal or one is mostly a prefix/substring of the other (LLM echo). */
export function isNearEcho(a: string, b: string): boolean {
  const na = compactText(a)
  const nb = compactText(b)
  if (!na || !nb) return false
  if (na === nb) return true
  const shorter = na.length <= nb.length ? na : nb
  const longer = na.length <= nb.length ? nb : na
  if (shorter.length < 18) return false
  if (longer.startsWith(shorter) && shorter.length / longer.length >= 0.72) return true
  if (longer.includes(shorter) && shorter.length / longer.length >= 0.85) return true
  return false
}
