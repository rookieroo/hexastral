/**
 * Festival / 节气 detail content schema (Sprint 3).
 */

import type { Locale } from '../../i18n'

export type FestivalContentKind = 'festival' | 'jieqi'

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
