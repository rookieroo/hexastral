/**
 * Technical fingerprint shown under the archetype headline on `/u/[username]`.
 *
 * Mirrors fate-app home subLine (`apps/fate-app/app/(tabs)/index.tsx`):
 *   `{dayMaster}{wuxing} · {geju.primary} [· {ziweiStars}]`
 *
 * Classical glyphs stay Chinese across locales — see `publicProfileEnChartNote.ts`.
 */

interface NatalFingerprint {
  dayMaster: string
  dayMasterWuXing: string
  gejuPrimary: string
}

function isString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0
}

export function parsePublicNatalFingerprint(natal: unknown): NatalFingerprint | null {
  if (!natal || typeof natal !== 'object') return null
  const n = natal as Record<string, unknown>
  const geju = n.geju as Record<string, unknown> | undefined
  // Server natal omits a top-level `dayMaster`; read it from `pillars.day.stem`
  // (see `services/svc-astro/src/services/natal/natal.ts`). Keep a top-level
  // fallback in case future payloads include it.
  const pillars = n.pillars as Record<string, unknown> | undefined
  const day = pillars?.day as Record<string, unknown> | undefined
  const stem =
    isString(n.dayMaster) ? n.dayMaster : isString(day?.stem) ? (day.stem as string) : null
  if (!stem || !isString(n.dayMasterWuXing)) return null
  if (!geju || !isString(geju.primary)) return null
  return {
    dayMaster: stem,
    dayMasterWuXing: n.dayMasterWuXing,
    gejuPrimary: geju.primary,
  }
}

/**
 * Pulls the 命宫 (Soul Palace) major stars from a stellar payload — used to
 * match fate-app home `subLine`, which joins all major stars (e.g. `紫微 天府 天梁`).
 * Falls back to the single `users.ziweiMingPalaceStar` denorm field when the
 * stellar grid isn't visible.
 */
export function extractMingPalaceStars(stellar: unknown): string {
  if (!stellar || typeof stellar !== 'object') return ''
  const palaces = (stellar as Record<string, unknown>).palaces
  if (!Array.isArray(palaces)) return ''
  const ming = palaces.find(
    (p): p is Record<string, unknown> =>
      !!p && typeof p === 'object' && (p as Record<string, unknown>).name === '命宫'
  )
  if (!ming) return ''
  const major = ming.majorStars
  if (!Array.isArray(major)) return ''
  return major
    .map((s) => (s && typeof s === 'object' ? (s as Record<string, unknown>).name : null))
    .filter(isString)
    .join(' ')
}

/** 五行 → English label. Mirrors fate-app `ELEMENT_EN` so the gloss matches. */
const WUXING_EN: Record<string, string> = {
  木: 'Wood',
  火: 'Fire',
  土: 'Earth',
  金: 'Metal',
  水: 'Water',
}

/**
 * Format the fingerprint line. For English viewers, parenthesise the day
 * master's element ("己土" → "己 (Earth)") — geju and ziwei stars stay canonical
 * because their semantics don't survive a one-word translation. Mirrors
 * fate-app `dayMasterLabel(locale='en')`.
 */
export function formatFingerprintLine(
  fp: NatalFingerprint,
  ziweiStars: string,
  locale: string | null | undefined
): string {
  const isEn = (locale ?? '').toLowerCase().startsWith('en')
  const dayPart = isEn
    ? `${fp.dayMaster} (${WUXING_EN[fp.dayMasterWuXing] ?? fp.dayMasterWuXing})`
    : `${fp.dayMaster}${fp.dayMasterWuXing}`
  const parts = [dayPart, fp.gejuPrimary]
  if (ziweiStars.trim()) parts.push(ziweiStars.trim())
  return parts.join(' · ')
}
