/**
 * Syel share funnel — brand + install URL for chapter share cards.
 * (Display brand Syel; API target stays faceoracle — ADR-0028.)
 */

/** Footer text under the card — human-readable brand path (no scheme). */
export const XINGQI_BRAND_URL = 'hexastral.com/lp/face'

/** Full URL baked into QR + caption — Universal Link /lp/face → Syel. */
export const XINGQI_INSTALL_URL = 'https://hexastral.com/lp/face'

/**
 * Caption alongside the image on iOS (Android often drops it — QR carries the funnel).
 */
export function xingqiShareCaption(locale: string, lead: string): string {
  const cta = locale.startsWith('zh')
    ? '· 看看你的'
    : locale.startsWith('ja')
      ? '· あなたも'
      : '· see yours'
  return `${lead} ${cta}\n${XINGQI_INSTALL_URL}`
}

/** Abstract identity for the share card — never birth date/time. */
export function xingqiShareIdentity(facts: {
  dayMaster?: string
  dayun?: string
} | null): string | undefined {
  if (!facts) return undefined
  const parts = [facts.dayMaster, facts.dayun].filter(
    (x): x is string => typeof x === 'string' && x.trim().length > 0
  )
  if (parts.length === 0) return undefined
  return parts.join(' · ')
}
