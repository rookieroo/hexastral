/**
 * Syel share funnel — brand + install URL for chapter / chat share cards.
 * (Display brand Syel; API target stays faceoracle — ADR-0028.)
 */

import { isZhHant } from '@/lib/locale-zh'

/** Footer text under the card — human-readable brand host (no scheme). */
export const XINGQI_BRAND_URL = 'syel.hexastral.com'

/** Full URL for caption / QR — Syel brand home. */
export const XINGQI_INSTALL_URL = 'https://syel.hexastral.com/'

/**
 * Caption alongside the image on iOS (Android often drops it — QR carries the funnel).
 */
export function xingqiShareCaption(locale: string, lead: string): string {
  const cta = isZhHant(locale)
    ? 'Syel 上也可以看看你的形氣解讀。'
    : locale.startsWith('zh')
      ? 'Syel 上也可以看看你的形气解读。'
      : locale.startsWith('ja')
        ? 'Syel であなたの形気リーディングも見てみよう。'
        : 'See your form-qi reading on Syel.'
  return `${lead}\n${cta}\n${XINGQI_INSTALL_URL}`
}

/** Abstract identity for the share card — never birth date/time. */
export function xingqiShareIdentity(
  facts: {
    dayMaster?: string
    dayun?: string
  } | null
): string | undefined {
  if (!facts) return undefined
  const parts = [facts.dayMaster, facts.dayun].filter(
    (x): x is string => typeof x === 'string' && x.trim().length > 0
  )
  if (parts.length === 0) return undefined
  return parts.join(' · ')
}
