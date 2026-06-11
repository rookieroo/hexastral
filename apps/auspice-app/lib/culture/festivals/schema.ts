/**
 * Festival / 节气 / topic detail content schema (Sprint 3; topic added 2026-06).
 *
 * `topic` entries are the product-mechanics explainers (干支 / 八字) that back the
 * timeline, 黄历, and make-if — they reuse the same section renderer but carry no
 * calendar date, so the detail page skips the year-overview fetch for them.
 */

import type { Locale } from '../../i18n'

export type FestivalContentKind = 'festival' | 'jieqi' | 'topic'

export interface LocalizedSection {
  title: string
  body: string
}

export interface FestivalContent {
  id: string
  kind: FestivalContentKind
  name: Record<Locale, string>
  tagline?: Record<Locale, string>
  sections: Record<Locale, LocalizedSection[]>
}
