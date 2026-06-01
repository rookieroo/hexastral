/**
 * Wikipedia deep-link helpers — one article title per locale.
 */

import type { Locale } from '../i18n'

function wikiHost(locale: Locale): string {
  if (locale === 'en') return 'en.wikipedia.org'
  if (locale === 'ja') return 'ja.wikipedia.org'
  return 'zh.wikipedia.org'
}

/** Build a stable Wikipedia URL for the given localized article title. */
export function getWikipediaUrl(locale: Locale, pageTitle: string): string {
  return `https://${wikiHost(locale)}/wiki/${encodeURIComponent(pageTitle)}`
}
