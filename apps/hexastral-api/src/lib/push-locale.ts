/**
 * Push / accept locale collapse — mirrors svc-astro `normalizeLang` so
 * `zh` and `zh-CN` compare equal without inventing a third mapping.
 */
export function normalizePushLocale(language: string | null | undefined): string {
  const l = (language || '').toLowerCase()
  if (!l) return 'zh-CN'
  if (l.startsWith('zh')) {
    return l.startsWith('zh-tw') || l.startsWith('zh-hk') || l.startsWith('zh-hant')
      ? 'zh-TW'
      : 'zh-CN'
  }
  if (l.startsWith('ja')) return 'ja'
  if (l.startsWith('ko')) return 'ko'
  if (l.startsWith('en')) return 'en'
  if (l.startsWith('de')) return 'de'
  if (l.startsWith('es')) return 'es'
  if (l.startsWith('vi')) return 'vi'
  if (l.startsWith('th')) return 'th'
  return l.split('-')[0] || language || 'zh-CN'
}

export function pushLocalesEqual(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  return normalizePushLocale(a) === normalizePushLocale(b)
}
