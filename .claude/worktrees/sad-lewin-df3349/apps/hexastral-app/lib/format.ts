/**
 * Locale-aware formatters for chart-side display.
 *
 * Use these instead of `formatDate()` from `@zhop/hexastral-tokens/constants/fortune`
 * (which hardcodes Chinese `M月D日 HH:mm`) and instead of `TIME_INDEX_LABELS`
 * (which hardcodes Chinese 时辰 strings).
 */
import { type Locale, labelize } from '@zhop/astro-i18n'

const SHICHEN_KEYS = [
  '子时',
  '丑时',
  '寅时',
  '卯时',
  '辰时',
  '巳时',
  '午时',
  '未时',
  '申时',
  '酉时',
  '戌时',
  '亥时',
  '子时',
] as const

const SHICHEN_RANGES = [
  '23:00–01:00',
  '01:00–03:00',
  '03:00–05:00',
  '05:00–07:00',
  '07:00–09:00',
  '09:00–11:00',
  '11:00–13:00',
  '13:00–15:00',
  '15:00–17:00',
  '17:00–19:00',
  '19:00–21:00',
  '21:00–23:00',
  '23:00–01:00',
] as const

/**
 * Map app locale to BCP 47 tag for Intl APIs.
 */
function intlTag(locale: Locale): string {
  if (locale === 'zh') return 'zh-CN'
  if (locale === 'zh-Hant') return 'zh-Hant'
  return locale
}

/**
 * Format an ISO timestamp as `Mon D, HH:mm` (or locale equivalent).
 * Replaces the hardcoded `${month}月${day}日 ${hh}:${mm}` from hexastral-tokens.
 */
export function formatDateTime(iso: string, locale: Locale): string {
  const date = new Date(iso)
  return new Intl.DateTimeFormat(intlTag(locale), {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/** Time-of-day only — for history rows where the section header carries the calendar date. */
export function formatTimeHm(iso: string, locale: Locale): string {
  const date = new Date(iso)
  return new Intl.DateTimeFormat(intlTag(locale), {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/**
 * Format an ISO date (no time) as locale-friendly short date.
 */
export function formatDate(iso: string, locale: Locale): string {
  const date = new Date(iso)
  return new Intl.DateTimeFormat(intlTag(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

/**
 * Format a Bazi `timeIndex` (0–12) as localized 时辰 + range.
 * @example formatShichen(3, 'en') -> 'Mao Hour 05:00–07:00'
 */
export function formatShichen(timeIndex: number, locale: Locale): string {
  if (timeIndex < 0 || timeIndex >= SHICHEN_KEYS.length) return ''
  const key = SHICHEN_KEYS[timeIndex]
  const label = labelize('shichen', key, locale)
  const range = SHICHEN_RANGES[timeIndex]
  return `${label} ${range}`
}

/**
 * Just the localized 时辰 name without the time range.
 */
export function formatShichenLabel(timeIndex: number, locale: Locale): string {
  if (timeIndex < 0 || timeIndex >= SHICHEN_KEYS.length) return ''
  return labelize('shichen', SHICHEN_KEYS[timeIndex], locale)
}
