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

  const leapMonthOfYear = useMemo(() => getLeapMonth(year), [year])
  const daysInSelectedMonth = useMemo(() => {
    if (isLeap) return getLeapMonthDays(year)
    return getLunarMonthDays(year, month) || 30
  }, [year, month, isLeap])

  // Clamp the day when the month changes underneath it — emit the corrected
  // value up so the controlling parent's state stays in sync.
  const safeDay = Math.min(day, daysInSelectedMonth)
  useEffect(() => {
    if (safeDay !== day) onChange({ year, month, day: safeDay, isLeap })
  }, [safeDay, day, year, month, isLeap, onChange])

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
    const out: number[] = []
    for (let d = 1; d <= daysInSelectedMonth; d++) out.push(d)
    return out
  }, [daysInSelectedMonth])

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
        onSelect={(v) => onChange({ year: v as number, month, day: safeDay, isLeap })}
        accent={accent}
      />
      <Wheel
        items={months.map((m) => ({
          key: `${m.value}-${m.isLeap}`,
          label: m.label,
          value: m,
        }))}
        selectedKey={`${month}-${isLeap}`}
        onSelect={(v) => {
          const m = v as { value: number; isLeap: boolean }
          onChange({ year, month: m.value, day: safeDay, isLeap: m.isLeap })
        }}
        accent={accent}
        loop
      />
      <Wheel
        items={days.map((d) => ({
          key: String(d),
          label: LUNAR_DAY_NAMES[d - 1] ?? `${d}`,
          value: d,
        }))}
        selectedKey={String(safeDay)}
        onSelect={(v) => onChange({ year, month, day: v as number, isLeap })}
        accent={accent}
        loop
      />
    </View>
  )
}
