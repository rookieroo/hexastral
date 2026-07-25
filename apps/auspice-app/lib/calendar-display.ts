/**
 * Calendar display helpers — decouple lunar labels from UI locale.
 *
 * Lunisolar dates: CJK keeps traditional day names (初一…); en/ja use numerals
 * so the strip never looks “stuck in Chinese”. Solar terms stay localized.
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

function isCjkLocale(locale: Locale): boolean {
  return locale === 'zh-Hans' || locale === 'zh-Hant'
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
  if (isCjkLocale(locale)) return day.lunarDayName ?? ''
  // en / ja — numeral day-of-lunar-month (avoid opaque 初一/廿七 in Latin UI).
  return String(day.lunarDay)
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
  if (!isCjkLocale(locale)) {
    // Server header is CJK (e.g. "五月"); non-CJK UIs skip it rather than show glyphs.
    return ''
  }
  return stripped
}

/**
 * Day identity row — lunisolar portion for DayIdentityHeader.
 * zh: 五月十五 / 闰六月初一 · en: Chinese calendar 5/15 · ja: 旧暦5月15日
 */
export function dayIdentityLunarLabel(
  lunar: {
    month: number
    day: number
    monthName?: string
    dayName?: string
    isLeap?: boolean
  } | null | undefined,
  locale: Locale,
  _mode: CalendarDisplayMode = defaultCalendarDisplayMode(locale)
): string {
  if (!lunar) return ''
  if (locale === 'en') {
    // 农历 ≠ western "lunar month" — prefer Chinese calendar / Nónglì framing.
    return lunar.isLeap
      ? `Chinese calendar (leap) ${lunar.month}/${lunar.day}`
      : `Chinese calendar ${lunar.month}/${lunar.day}`
  }
  if (locale === 'ja') {
    return lunar.isLeap
      ? `旧暦閏${lunar.month}月${lunar.day}日`
      : `旧暦${lunar.month}月${lunar.day}日`
  }
  if (lunar.monthName && lunar.dayName) {
    return `${lunar.monthName}${lunar.dayName}`
  }
  return `${lunar.month}/${lunar.day}`
}

/** Gregorian ISO YYYY-MM-DD → locale-aware short date for the home identity row. */
export function formatGregorianIdentity(iso: string, locale: Locale): string {
  const parts = iso.split('-').map(Number)
  const y = parts[0]
  const m = parts[1]
  const d = parts[2]
  if (!y || !m || !d) return iso
  if (locale === 'en') {
    const dt = new Date(y, m - 1, d)
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  return `${y}年${m}月${d}日`
}

/** Whether 吉凶 rating shading applies in month cells. */
export function showRatingCellShading(locale: Locale): boolean {
  return locale !== 'en'
}
