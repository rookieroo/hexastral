/**
 * LunarDateWheels — 农历 year / month / day scroll-wheels (+ leap-month variants).
 *
 * Self-contained: give it the current {year, month, day, isLeap} and an
 * `onChange`, and it derives the leap month for the year, the day-count of the
 * selected month, and clamps the day when the month changes underneath it.
 *
 * Plain ScrollView-based wheels (no extra picker dep). Each column is a
 * vertical snap-scroll list; the centred row is the selection. Extracted from
 * BirthDateStep so the single-page settings forms (e.g. auspice Me) can reuse
 * the exact same lunar input as the onboarding wizard.
 */

import {
  getLeapMonth,
  getLeapMonthDays,
  getLunarMonthDays,
  LUNAR_DAY_NAMES,
  LUNAR_MONTH_NAMES,
} from '@zhop/astro-core'
import * as Haptics from 'expo-haptics'
import { useEffect, useMemo } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useTheme } from '../../theme'

const WHEEL_ITEM_HEIGHT = 36
// 7 visible rows (was 5) — 5-row wheels read as "crammed at the top" on
// modern phone heights. 7 rows = 252px, centred wheel feels balanced.
const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * 7
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
        colors={colors}
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
        colors={colors}
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
        colors={colors}
      />
    </View>
  )
}

interface WheelItem<T> {
  key: string
  label: string
  value: T
}

function Wheel<T>({
  items,
  selectedKey,
  onSelect,
  accent,
  colors,
}: {
  items: WheelItem<T>[]
  selectedKey: string
  onSelect: (value: T) => void
  accent: string
  colors: ReturnType<typeof useTheme>['colors']
}) {
  const selectedIdx = Math.max(
    0,
    items.findIndex((it) => it.key === selectedKey)
  )
  const initialOffset = selectedIdx * WHEEL_ITEM_HEIGHT

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      {/* Center selection band — 3 rows above the centred slot in a 7-row wheel */}
      <View
        pointerEvents='none'
        style={{
          position: 'absolute',
          top: WHEEL_ITEM_HEIGHT * 3,
          left: 0,
          right: 0,
          height: WHEEL_ITEM_HEIGHT,
          borderTopWidth: 0.5,
          borderBottomWidth: 0.5,
          borderColor: `${accent}66`,
          backgroundColor: `${accent}0A`,
        }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate='fast'
        contentOffset={{ x: 0, y: initialOffset }}
        contentContainerStyle={{
          // 3 padding rows top + 3 bottom = centred item at row 4 of 7
          paddingVertical: WHEEL_ITEM_HEIGHT * 3,
        }}
        onMomentumScrollEnd={(e) => {
          const y = e.nativeEvent.contentOffset.y
          const idx = Math.round(y / WHEEL_ITEM_HEIGHT)
          const clamped = Math.max(0, Math.min(items.length - 1, idx))
          const picked = items[clamped]
          if (picked) {
            Haptics.selectionAsync()
            onSelect(picked.value)
          }
        }}
      >
        {items.map((it, i) => (
          <View
            key={it.key}
            style={{
              height: WHEEL_ITEM_HEIGHT,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 16,
                color: i === selectedIdx ? colors.text : colors.secondary,
                fontWeight: i === selectedIdx ? '600' : '400',
              }}
            >
              {it.label}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}
