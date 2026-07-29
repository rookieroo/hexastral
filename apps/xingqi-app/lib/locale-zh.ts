/**
 * Xingqi Chinese locale helpers — never use startsWith('zh') for user-facing copy.
 * Hans and Hant are separate tracks (cultural / App Store TW-HK).
 */

export function isZhHant(locale: string): boolean {
  return (
    locale.startsWith('zh-Hant') ||
    locale === 'zh-TW' ||
    locale === 'zh-HK' ||
    locale.toLowerCase().startsWith('zh-hant') ||
    locale.toLowerCase().startsWith('zh-tw') ||
    locale.toLowerCase().startsWith('zh-hk')
  )
}

/** Simplified Chinese only (not Traditional). */
export function isZhHans(locale: string): boolean {
  if (isZhHant(locale)) return false
  return (
    locale === 'zh' ||
    locale.startsWith('zh-Hans') ||
    locale === 'zh-CN' ||
    locale.toLowerCase().startsWith('zh-hans') ||
    locale.toLowerCase().startsWith('zh-cn') ||
    (locale.startsWith('zh') && !isZhHant(locale))
  )
}

/** Any Chinese script — layout / CJK metrics only, not copy. */
export function isCjkZh(locale: string): boolean {
  return isZhHant(locale) || isZhHans(locale) || locale.startsWith('zh')
}

/**
 * Pick Simplified vs Traditional user-facing string.
 * Non-Chinese locales should not call this — use en/ja branches first.
 */
export function pickZh(locale: string, hans: string, hant: string): string {
  return isZhHant(locale) ? hant : hans
}

/**
 * Product UI copy for Xingqi's four locales (zh / zh-Hant / en / ja).
 * When `ja` is omitted, Japanese falls back to English.
 */
export function pickUi(
  locale: string,
  hans: string,
  hant: string,
  en: string,
  ja?: string
): string {
  if (isZhHant(locale)) return hant
  if (isZhHans(locale) || (locale.startsWith('zh') && !isZhHant(locale))) return hans
  if (locale.startsWith('ja') && ja) return ja
  return en
}

export function isJa(locale: string): boolean {
  return locale.startsWith('ja')
}

/**
 * CJK "leak" gate for EN chrome only.
 * Japanese report prose legitimately uses kanji + kana — never treat JA as a leak.
 * When checking EN, count Han ideographs only (not kana), so leftover JA rows still fail.
 */
export function cjkLeakRatio(sample: string): number {
  const letters = sample.replace(/\s/g, '').length
  if (letters === 0) return 1
  const han = sample.match(/[\u3400-\u9fff]/g)?.join('').length ?? 0
  return han / letters
}

/** True when EN locale should hide a string that is mostly Chinese Han. JA always ok. */
export function okForReadingLocale(locale: string, sample: string, maxHanRatio = 0.45): boolean {
  if (isCjkZh(locale) || isJa(locale)) return true
  return cjkLeakRatio(sample) < maxHanRatio
}
