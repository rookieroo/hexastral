/**
 * Terms of Service section loader — content lives in
 * `data/terms.{locale}.json`. Translators can edit JSON files directly
 * without touching this module.
 *
 * To add a new locale:
 *   1. Drop in `data/terms.{locale}.json` with the same shape.
 *   2. Add the import + branch in `getTermsSections` and
 *      `getTermsLastUpdated` below.
 *
 * English is the master version (Terms §17 — English text controls).
 */

import type { Locale } from '@/i18n/routing'
import termsEnRaw from './data/terms.en.json'
import termsJaRaw from './data/terms.ja.json'
import termsTwRaw from './data/terms.tw.json'
import type { LegalSection } from './privacy-sections'

interface LegalDoc {
  lastUpdated: string
  sections: readonly LegalSection[]
}

const termsEn = termsEnRaw as LegalDoc
const termsJa = termsJaRaw as LegalDoc
const termsTw = termsTwRaw as LegalDoc

export function getTermsSections(locale: Locale): readonly LegalSection[] {
  if (locale === 'ja') return termsJa.sections
  // zh (简体) shares the zh-Hant legal text until a dedicated terms.zh.json lands.
  if (locale === 'zh' || locale === 'tw') return termsTw.sections
  return termsEn.sections
}

export function getTermsLastUpdated(locale: Locale): string {
  if (locale === 'ja') return termsJa.lastUpdated
  if (locale === 'zh' || locale === 'tw') return termsTw.lastUpdated
  return termsEn.lastUpdated
}

/**
 * @deprecated Use `getTermsLastUpdated(locale)` instead. Kept for one release
 * cycle so external callers can migrate.
 */
export const TERMS_LAST_UPDATED: Record<Locale, string> = {
  en: termsEn.lastUpdated,
  ja: termsJa.lastUpdated,
  tw: termsTw.lastUpdated,
  zh: termsTw.lastUpdated,
}
