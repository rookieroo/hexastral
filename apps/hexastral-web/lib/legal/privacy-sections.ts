/**
 * Privacy Policy section loader — content lives in `data/privacy.{locale}.json`.
 * Translators can edit JSON files directly without touching this module.
 *
 * To add a new locale:
 *   1. Drop in `data/privacy.{locale}.json` with the same shape.
 *   2. Add the import + branch in `getPrivacySections` and
 *      `getPrivacyLastUpdated` below.
 *
 * English is the master version; other locales fall back to English when no
 * translation file exists (see Terms §17 — English text controls in conflict).
 */

import type { Locale } from '@/i18n/routing'

import privacyEnRaw from './data/privacy.en.json'
import privacyJaRaw from './data/privacy.ja.json'
import privacyTwRaw from './data/privacy.tw.json'

export interface LegalSection {
  title: string
  content: string
}

interface LegalDoc {
  lastUpdated: string
  sections: readonly LegalSection[]
}

const privacyEn = privacyEnRaw as LegalDoc
const privacyJa = privacyJaRaw as LegalDoc
const privacyTw = privacyTwRaw as LegalDoc

export function getPrivacySections(locale: Locale): readonly LegalSection[] {
  if (locale === 'ja') return privacyJa.sections
  if (locale === 'tw') return privacyTw.sections
  return privacyEn.sections
}

export function getPrivacyLastUpdated(locale: Locale): string {
  if (locale === 'ja') return privacyJa.lastUpdated
  if (locale === 'tw') return privacyTw.lastUpdated
  return privacyEn.lastUpdated
}

/**
 * @deprecated Use `getPrivacyLastUpdated(locale)` instead. Kept for one release
 * cycle so external callers can migrate.
 */
export const PRIVACY_LAST_UPDATED: Record<Locale, string> = {
  en: privacyEn.lastUpdated,
  ja: privacyJa.lastUpdated,
  tw: privacyTw.lastUpdated,
  zh: privacyEn.lastUpdated,
}
