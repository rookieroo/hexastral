/**
 * 黄历 宜忌 — share surface (`/s/day`). Labels come from `@zhop/astro-core`
 * so App / Web / API stay in sync.
 */

import { formatYijiVerb } from '@zhop/astro-core'

export type ShareLc = 'zh-Hans' | 'zh-Hant' | 'ja' | 'en'

/** Translate a 黄历 宜忌 verb into the share locale (traditional gloss). */
export function localizeYijiVerb(verb: string, lc: ShareLc): string {
  return formatYijiVerb(verb, lc, 'traditional')
}

/**
 * The 宜 / 忌 column labels. English uses "Good" / "Avoid" — balanced widths;
 * CJK keeps the single-char 宜 / 忌.
 */
export function yijiLabels(lc: ShareLc): { good: string; avoid: string } {
  return lc === 'en' ? { good: 'Good', avoid: 'Avoid' } : { good: '宜', avoid: '忌' }
}

/**
 * Resolve the share locale: explicit `?lc=` first, then Accept-Language, then `en`.
 */
export function resolveShareLc(paramLc?: string, acceptLanguage?: string | null): ShareLc {
  const valid = (s?: string): ShareLc | null =>
    s === 'zh-Hans' || s === 'zh-Hant' || s === 'ja' || s === 'en' ? s : null
  const fromParam = valid(paramLc)
  if (fromParam) return fromParam
  const al = (acceptLanguage ?? '').toLowerCase()
  if (al.startsWith('zh-hant') || al.includes('zh-tw') || al.includes('zh-hk')) return 'zh-Hant'
  if (al.startsWith('zh')) return 'zh-Hans'
  if (al.startsWith('ja')) return 'ja'
  return 'en'
}
