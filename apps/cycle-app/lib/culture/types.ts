/**
 * Shared types for cycle cultural materials (ADR-0020).
 */

import type { Locale } from '../i18n'

/** Six pillars of the in-app culture hub + home topics grid. */
export type CultureCategoryKey = 'festivals' | 'jieqi' | 'shichen' | 'ganzhi' | 'sizhu' | 'ziwei'

export type LocalizedText = Record<Locale, string>

export interface CultureCategoryMaterial {
  key: CultureCategoryKey
  /** Short intro shown in glossary accordion + home topic card. */
  intro: LocalizedText
  /** Wikipedia article title for `getWikipediaUrl` (per locale). */
  wikipediaTitle: LocalizedText
}
