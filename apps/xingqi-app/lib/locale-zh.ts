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
