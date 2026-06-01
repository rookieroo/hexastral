/**
 * Home-screen culture snippet — resolves today's festival / 节气 to authored
 * content in `festival-content.ts` and produces a short excerpt for the card.
 */

import type { CycleDay } from './api'
import { cultureSummary, localizeCultureEntry, localizeSolarTermName } from './culture'
import { getFestivalContent, previewBody, solarTermTargetId } from './festival-content'
import type { Locale } from './i18n'

/** CJK-friendly preview length on the home card (detail page uses full sections). */
const HOME_PREVIEW_CHARS = 96

export interface CultureSnippet {
  targetId: string
  title: string
  tagline?: string
  /** 1-2 sentence inline blurb — shown on the home when there's no full entry. */
  summary: string
  excerpt: string
  hasAuthoredBody: boolean
}

/** Route id for `/festival/[id]` when the selected day is a festival or 节气 day. */
export function resolveCultureTargetId(day: CycleDay): string | null {
  if (day.festivalToday) return day.festivalToday.id
  if (day.solarTermToday) return solarTermTargetId(day.solarTermToday.name)
  return null
}

export function buildCultureSnippet(
  targetId: string,
  displayName: string,
  locale: Locale
): CultureSnippet {
  const content = getFestivalContent(targetId)
  const title = localizeCultureEntry(targetId, locale, displayName)
  const tagline = content?.tagline?.[locale]
  const firstSection = content?.sections[locale]?.[0]
  const excerpt = firstSection ? previewBody(firstSection.body, HOME_PREVIEW_CHARS) : ''
  const summary = cultureSummary(targetId, locale) ?? tagline ?? ''
  return {
    targetId,
    title,
    tagline,
    summary,
    excerpt,
    hasAuthoredBody: Boolean(firstSection),
  }
}

/** Non-null when the selected day is a festival or solar-term day. */
export function cultureSnippetForDay(day: CycleDay, locale: Locale): CultureSnippet | null {
  const targetId = resolveCultureTargetId(day)
  if (!targetId) return null
  const apiName = day.festivalToday?.name ?? day.solarTermToday?.name ?? ''
  const displayName = day.festivalToday
    ? localizeCultureEntry(targetId, locale, apiName)
    : localizeSolarTermName(apiName, locale)
  return buildCultureSnippet(targetId, displayName, locale)
}

/** Preview for the upcoming 节气 when today is not a term/festival day. */
export function cultureSnippetForUpcomingTerm(
  day: CycleDay,
  locale: Locale
): CultureSnippet | null {
  const nextName = day.solarTerm.next.name
  const targetId = solarTermTargetId(nextName)
  if (!targetId) return null
  return buildCultureSnippet(targetId, localizeSolarTermName(nextName, locale), locale)
}

/** Festival/节气 day first; otherwise the next solar term in the window. */
export function cultureSnippetForHome(day: CycleDay, locale: Locale): CultureSnippet | null {
  return cultureSnippetForDay(day, locale) ?? cultureSnippetForUpcomingTerm(day, locale)
}
