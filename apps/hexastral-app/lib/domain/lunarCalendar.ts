/**
 * Chinese Lunar ↔ Gregorian Solar calendar utilities
 * Uses lunar-javascript (pure JS, no native deps, covers 1900-2100)
 */
import { Lunar, LunarYear } from 'lunar-javascript'

/**
 * Returns true if lunar year `y` has a leap version of month `m`.
 * e.g. hasLeapMonth(2023, 2) === true because 2023 has 闰二月
 */
export function hasLeapMonth(lunarYear: number, month: number): boolean {
  try {
    return LunarYear.fromYear(lunarYear).getLeapMonth() === month
  } catch {
    return false
  }
}

/**
 * Convert a Chinese lunar date to a Gregorian Solar date.
 *
 * lunar-javascript represents leap months as negative month numbers:
 *   month 2  → regular 二月
 *   month -2 → leap 闰二月
 *
 * @param lunarYear  - Chinese lunar year, e.g. 1990
 * @param lunarMonth - Lunar month 1-12
 * @param lunarDay   - Lunar day 1-30
 * @param isLeap     - Whether this is the leap instance of the month
 * @returns Gregorian Date (midnight local)
 */
export function lunarToSolar(
  lunarYear: number,
  lunarMonth: number,
  lunarDay: number,
  isLeap: boolean
): Date {
  try {
    const month = isLeap ? -lunarMonth : lunarMonth
    const lunar = Lunar.fromYmd(lunarYear, month, lunarDay)
    const solar = lunar.getSolar()
    return new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay())
  } catch {
    // Graceful fallback: treat as solar date — avoids blank state
    return new Date(lunarYear, lunarMonth - 1, lunarDay)
  }
}

/** Format a Date as YYYY-MM-DD for display */
export function formatSolarDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
