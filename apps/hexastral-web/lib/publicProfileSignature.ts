/**
 * Avoid redundant signature lines when stored headline and explanation overlap.
 */

export function dedupePublicSignature(
  headline: string,
  sub: string
): {
  headline: string
  sub: string
} {
  const h = headline.trim()
  const s = sub.trim()
  if (!h || !s) return { headline: h, sub: s }
  if (h === s) return { headline: h, sub: '' }
  const hn = h.replace(/\s+/g, '')
  const sn = s.replace(/\s+/g, '')
  if (hn === sn) return { headline: h, sub: '' }
  if (s.includes(h) || h.includes(s)) return { headline: h, sub: '' }
  return { headline: h, sub: s }
}
