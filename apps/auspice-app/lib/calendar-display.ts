/**
 * Calendar display helpers — decouple lunar labels from UI locale.
 *
 * Lunisolar dates show for all locales using day names (初一, …) or M/D numerals.
 * Solar terms are localized per UI locale. en skips rating cell shading only.
 */

import { localizeSolarTermName } from './culture'
import type { AuspiceMonthDay } from './api'
import type { Locale } from './i18n'

export type CalendarDisplayMode = 'full' | 'compact' | 'holidaysOnly'

/** Default display mode per locale (v1 — no user toggle yet). */
export function defaultCalendarDisplayMode(locale: Locale): CalendarDisplayMode {
  if (locale === 'en') return 'compact'
  return 'full'
}

/** Cell sub-label under the gregorian day number in CalendarStrip / WeekStrip. */
export function lunarCellLabel(
  day: AuspiceMonthDay,
  locale: Locale,
  mode: CalendarDisplayMode = defaultCalendarDisplayMode(locale)
): string {
  if (mode === 'holidaysOnly') {
    return day.publicHoliday ?? ''
  }
  if (day.publicHoliday) return day.publicHoliday
  if (day.solarTermName) return localizeSolarTermName(day.solarTermName, locale)
  return day.lunarDayName ?? ''
}

/** Month header lunisolar label (shown beside gregorian month). */
export function lunarHeaderLabel(
  header: string,
  locale: Locale,
  mode: CalendarDisplayMode = defaultCalendarDisplayMode(locale)
): string {
  if (mode === 'holidaysOnly' || !header) return ''
  // Strip redundant 阳历 year prefix — the gregorian year is already shown.
  const stripped = header.replace(/^\d+年\s*/, '')
  if (mode === 'compact' && locale === 'en') {
    return stripped
  }
  return stripped
}

/** Day identity row — lunisolar portion for DayIdentityHeader. */
export function dayIdentityLunarLabel(
  lunar: { month: number; day: number; monthName: string; dayName: string } | null | undefined,
  locale: Locale,
  _mode: CalendarDisplayMode = defaultCalendarDisplayMode(locale)
): string {
  if (!lunar) return ''
  if (lunar.monthName && lunar.dayName) {
    return locale === 'en'
      ? `${lunar.monthName} ${lunar.dayName}`
      : `${lunar.monthName}${lunar.dayName}`
  }
  return `${lunar.month}/${lunar.day}`
}

/** Whether 吉凶 rating shading applies in month cells. */
export function showRatingCellShading(locale: Locale): boolean {
  return locale !== 'en'
}
