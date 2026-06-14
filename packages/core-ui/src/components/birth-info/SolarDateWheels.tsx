/**
 * SolarDateWheels — 公历 year / month / day scroll-wheels.
 *
 * The 阳历 counterpart to LunarDateWheels, built on the same shared `Wheel` so
 * both calendars share one look. Used by BirthDateField on Android in place of
 * the system `DateTimePicker` spinner (which looked nothing like the 农历 wheels
 * and read as out-of-place); iOS keeps its native spinner.
 *
 * Month + day wrap (首尾相连); year is a bounded range. The day count follows the
 * selected year+month (leap February) and the day clamps when the month shrinks
 * underneath it.
 */

import { useEffect, useMemo } from 'react'
import { View } from 'react-native'
import { useTheme } from '../../theme'
import { WHEEL_HEIGHT, Wheel } from '../Wheel'

export type SolarDateValue = { year: number; month: number; day: number }

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Days in a gregorian month — `new Date(y, m, 0)` is the last day of month m. */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function SolarDateWheels({
  year,
  month,
  day,
  accent,
  minYear,
  maxYear,
  onChange,
}: {
  year: number
  month: number
  day: number
  accent: string
  minYear: number
  maxYear: number
  onChange: (next: SolarDateValue) => void
}) {
  const { colors } = useTheme()

  const dim = daysInMonth(year, month)
  // Clamp the day when the month/year shrinks it (e.g. 31 → Feb) and report up.
  const safeDay = Math.min(day, dim)
  useEffect(() => {
    if (safeDay !== day) onChange({ year, month, day: safeDay })
  }, [safeDay, day, year, month, onChange])

  const years = useMemo(() => {
    const out: number[] = []
    for (let y = minYear; y <= maxYear; y++) out.push(y)
    return out
  }, [minYear, maxYear])
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), [])
  const days = useMemo(() => Array.from({ length: dim }, (_, i) => i + 1), [dim])

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
        onSelect={(v) => onChange({ year: v as number, month, day: safeDay })}
        accent={accent}
      />
      <Wheel
        items={months.map((m) => ({ key: String(m), label: pad2(m), value: m }))}
        selectedKey={String(month)}
        onSelect={(v) => onChange({ year, month: v as number, day: safeDay })}
        accent={accent}
        loop
      />
      <Wheel
        items={days.map((d) => ({ key: String(d), label: pad2(d), value: d }))}
        selectedKey={String(safeDay)}
        onSelect={(v) => onChange({ year, month, day: v as number })}
        accent={accent}
        loop
      />
    </View>
  )
}
