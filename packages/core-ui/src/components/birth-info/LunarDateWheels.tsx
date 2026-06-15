/**
 * LunarDateWheels — 农历 year / month / day scroll-wheels (+ leap-month variants).
 *
 * Self-contained: give it the current {year, month, day, isLeap} and an
 * `onChange`, and it derives the leap month for the year, the day-count of the
 * selected month, and clamps the day when the month changes underneath it.
 *
 * Columns are the shared `Wheel` (so 农历 and 阳历 entry look identical); month +
 * day wrap (首尾相连), year is a bounded range. Extracted from BirthDateStep so the
 * single-page settings forms (e.g. auspice Me) reuse the exact same lunar input
 * as the onboarding wizard.
 *
 * The column-derivation + clamp/sanitize lives in `useLunarColumns` so the native
 * iOS picker (`LunarPickerIOS`) shares the exact same leap-month + day logic — only
 * the rendering differs.
 */

import {
  getLeapMonth,
  getLeapMonthDays,
  getLunarMonthDays,
  LUNAR_DAY_NAMES,
  LUNAR_MONTH_NAMES,
} from '@zhop/astro-core'
import { useEffect, useMemo } from 'react'
import { View } from 'react-native'
import { useTheme } from '../../theme'
import { WHEEL_HEIGHT, Wheel } from '../Wheel'

const LUNAR_YEAR_MIN = 1901 // safe lower bound (1900 partial)
const LUNAR_YEAR_MAX = 2099

export type LunarDateValue = { year: number; month: number; day: number; isLeap: boolean }

export interface LunarColumns {
  years: number[]
  months: { value: number; isLeap: boolean; label: string }[]
  days: { value: number; label: string }[]
  /** The day clamped into the selected month (≤ its real length). */
  safeDay: number
  /** `isLeap` after dropping it if the selected year has no such leap month. */
  safeLeap: boolean
}

/**
 * Derive the three lunar columns for {year, month, day, isLeap} and keep the
 * controlling parent in sync when the selection becomes impossible underneath it.
 * Two corrections, both emitted up via `onChange`:
 *   • day clamp — 廿九/三十 when the month shrinks (a 29-day month, or 闰月).
 *   • leap sanitize — drop a stale 闰 flag the moment the year no longer HAS that
 *     leap month. The picker seeds (or is left) on e.g. 2001 闰四月, the year then
 *     scrolls to 壬申/1992 which has NO leap month, and without this the flag rode
 *     all the way to confirm and produced the reported "壬申年 闰四月初六".
 */
export function useLunarColumns(
  { year, month, day, isLeap }: LunarDateValue,
  onChange: (next: LunarDateValue) => void
): LunarColumns {
  const leapMonthOfYear = useMemo(() => getLeapMonth(year), [year])

  const safeLeap = isLeap && leapMonthOfYear === month
  const daysInSelectedMonth = useMemo(() => {
    if (safeLeap) return getLeapMonthDays(year)
    return getLunarMonthDays(year, month) || 30
  }, [year, month, safeLeap])
  const safeDay = Math.min(day, daysInSelectedMonth)

  useEffect(() => {
    if (safeDay !== day || safeLeap !== isLeap) {
      onChange({ year, month, day: safeDay, isLeap: safeLeap })
    }
  }, [safeDay, safeLeap, day, isLeap, year, month, onChange])

  const years = useMemo(() => {
    const out: number[] = []
    for (let y = LUNAR_YEAR_MIN; y <= LUNAR_YEAR_MAX; y++) out.push(y)
    return out
  }, [])
  const months = useMemo(() => {
    const out: { value: number; isLeap: boolean; label: string }[] = []
    for (let m = 1; m <= 12; m++) {
      out.push({
        value: m,
        isLeap: false,
        label: LUNAR_MONTH_NAMES[m - 1] ?? `${m}月`,
      })
      // Insert leap variant immediately after the corresponding normal month.
      if (leapMonthOfYear > 0 && m === leapMonthOfYear) {
        out.push({
          value: m,
          isLeap: true,
          label: `闰${LUNAR_MONTH_NAMES[m - 1] ?? `${m}月`}`,
        })
      }
    }
    return out
  }, [leapMonthOfYear])
  const days = useMemo(() => {
    const out: { value: number; label: string }[] = []
    for (let d = 1; d <= daysInSelectedMonth; d++) {
      out.push({ value: d, label: LUNAR_DAY_NAMES[d - 1] ?? `${d}` })
    }
    return out
  }, [daysInSelectedMonth])

  return { years, months, days, safeDay, safeLeap }
}

export function LunarDateWheels({
  year,
  month,
  day,
  isLeap,
  accent,
  onChange,
}: {
  year: number
  month: number
  day: number
  isLeap: boolean
  accent: string
  onChange: (next: LunarDateValue) => void
}) {
  const { colors } = useTheme()
  const { years, months, days, safeDay, safeLeap } = useLunarColumns(
    { year, month, day, isLeap },
    onChange
  )

  return (
    <View
      style={{
        flexDirection: 'row',
        height: WHEEL_HEIGHT,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderColor: colors.separator,
      }}
    >
      <Wheel
        items={years.map((y) => ({ key: String(y), label: `${y}`, value: y }))}
        selectedKey={String(year)}
        onSelect={(v) => onChange({ year: v as number, month, day: safeDay, isLeap: safeLeap })}
        accent={accent}
      />
      <Wheel
        items={months.map((m) => ({
          key: `${m.value}-${m.isLeap}`,
          label: m.label,
          value: m,
        }))}
        selectedKey={`${month}-${safeLeap}`}
        onSelect={(v) => {
          const m = v as { value: number; isLeap: boolean }
          onChange({ year, month: m.value, day: safeDay, isLeap: m.isLeap })
        }}
        accent={accent}
        loop
      />
      <Wheel
        items={days.map((d) => ({
          key: String(d.value),
          label: d.label,
          value: d.value,
        }))}
        selectedKey={String(safeDay)}
        onSelect={(v) => onChange({ year, month, day: v as number, isLeap: safeLeap })}
        accent={accent}
        loop
      />
    </View>
  )
}
