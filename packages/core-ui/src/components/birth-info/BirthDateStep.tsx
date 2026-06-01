/**
 * BirthDateStep — step 1: solar / lunar date entry.
 *
 * Solar mode: native `DateTimePicker` (inline iOS, calendar Android).
 * Lunar mode: 4 inline wheels (year / month / day / leap-toggle) backed by
 * the compressed-table helpers in `@zhop/astro-core/lunar`.
 *
 * Both modes commit `solarDate` (canonical ISO YYYY-MM-DD). Lunar mode
 * also sets `lunarDate` (echo-back for the review screen).
 */

import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import {
  getLeapMonth,
  getLeapMonthDays,
  getLunarMonthDays,
  LUNAR_DAY_NAMES,
  LUNAR_MONTH_NAMES,
  lunarToSolar,
  solarToLunar,
} from '@zhop/astro-core'
import * as Haptics from 'expo-haptics'
import { useCallback, useMemo, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../theme'
import { BirthProgressIndicator } from './BirthProgressIndicator'
import type { BirthStepProps } from './types'

type Mode = 'solar' | 'lunar'

const MIN_DATE = new Date(1900, 0, 1)
const MAX_DATE = new Date()
// Default: today minus 25 years, mid-month — typical user is born ~25y ago
// and an arbitrary fixed date (was 1990-01-01) just looks like a UI default.
function defaultBirthDate(): Date {
  const now = new Date()
  return new Date(now.getFullYear() - 25, 5, 15) // June 15, 25 years ago
}

/** Parse `YYYY-MM-DD` into a Date in local time. Returns null on bad input. */
function parseSolarDate(iso: string | undefined): Date | null {
  if (!iso || iso.length !== 10) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function formatSolarDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function BirthDateStep({
  value,
  onChange,
  onNext,
  accent,
  copy,
  step,
  totalSteps,
  crown,
  locale,
}: BirthStepProps) {
  const { colors, spacing } = useTheme()
  const [mode, setMode] = useState<Mode>(value.lunarDate ? 'lunar' : 'solar')

  // ── Solar mode state ──────────────────────────────────────────────────
  const initialSolar = parseSolarDate(value.solarDate) ?? defaultBirthDate()
  const [solar, setSolar] = useState<Date>(initialSolar)

  const handleSolarChange = useCallback((_: DateTimePickerEvent, picked?: Date) => {
    if (!picked) return
    setSolar(picked)
  }, [])

  // ── Lunar mode state ──────────────────────────────────────────────────
  const initialLunar = useMemo(() => {
    if (value.lunarDate) {
      return {
        year: value.lunarDate.year,
        month: value.lunarDate.month,
        day: value.lunarDate.day,
        isLeap: value.lunarDate.isLeap,
      }
    }
    // Default: today's lunar equivalent
    const today = new Date()
    try {
      const l = solarToLunar(today.getFullYear(), today.getMonth() + 1, today.getDate())
      return { year: l.year, month: l.month, day: l.day, isLeap: l.isLeap }
    } catch {
      return { year: 1990, month: 1, day: 1, isLeap: false }
    }
  }, [value.lunarDate])

  const [lunarYear, setLunarYear] = useState<number>(initialLunar.year)
  const [lunarMonth, setLunarMonth] = useState<number>(initialLunar.month)
  const [lunarDay, setLunarDay] = useState<number>(initialLunar.day)
  const [lunarIsLeap, setLunarIsLeap] = useState<boolean>(initialLunar.isLeap)

  const leapMonthOfYear = useMemo(() => getLeapMonth(lunarYear), [lunarYear])
  const daysInSelectedMonth = useMemo(() => {
    if (lunarIsLeap) return getLeapMonthDays(lunarYear)
    return getLunarMonthDays(lunarYear, lunarMonth) || 30
  }, [lunarYear, lunarMonth, lunarIsLeap])

  // Clamp the day when the month changes underneath it.
  const safeDay = Math.min(lunarDay, daysInSelectedMonth)
  if (safeDay !== lunarDay) {
    // Defer the state write so we don't update mid-render.
    queueMicrotask(() => setLunarDay(safeDay))
  }

  // ── Toggle handler ────────────────────────────────────────────────────
  const handleToggle = useCallback(
    (next: Mode) => {
      if (next === mode) return
      Haptics.selectionAsync()
      setMode(next)
    },
    [mode]
  )

  // ── Commit + advance ──────────────────────────────────────────────────
  const handleNext = useCallback(() => {
    Haptics.selectionAsync()
    if (mode === 'solar') {
      onChange({ solarDate: formatSolarDate(solar), lunarDate: undefined })
    } else {
      try {
        const solarDate = lunarToSolar(lunarYear, lunarMonth, lunarDay, lunarIsLeap)
        // Re-compute LunarDate from the canonical solar so monthName /
        // dayName / yearGanZhi / zodiac are always populated correctly.
        const fullLunar = solarToLunar(
          solarDate.getFullYear(),
          solarDate.getMonth() + 1,
          solarDate.getDate()
        )
        onChange({ solarDate: formatSolarDate(solarDate), lunarDate: fullLunar })
      } catch (err) {
        if (__DEV__) console.warn('[BirthDateStep] lunarToSolar failed', err)
        return
      }
    }
    onNext()
  }, [mode, solar, lunarYear, lunarMonth, lunarDay, lunarIsLeap, onChange, onNext])

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.xl,
          paddingBottom: spacing.xl,
          flexGrow: 1,
        }}
      >
        <BirthProgressIndicator step={step} total={totalSteps} accentColor={accent} />
        {crown ? (
          <View style={{ alignItems: 'center', marginTop: spacing.lg }}>{crown}</View>
        ) : null}

        <View style={{ marginTop: spacing['2xl'], gap: spacing.sm }}>
          <Text style={[styles.title, { color: colors.text }]}>{copy.dateTitle}</Text>
          {copy.dateSubtitle ? (
            <Text style={[styles.subtitle, { color: colors.secondary }]}>{copy.dateSubtitle}</Text>
          ) : null}
        </View>

        {/* Mode toggle */}
        <View style={[styles.modeRow, { marginTop: spacing.xl }]}>
          <ModePill
            label={copy.dateSolarLabel}
            active={mode === 'solar'}
            accent={accent}
            colors={colors}
            onPress={() => handleToggle('solar')}
          />
          <ModePill
            label={copy.dateLunarLabel}
            active={mode === 'lunar'}
            accent={accent}
            colors={colors}
            onPress={() => handleToggle('lunar')}
          />
        </View>

        <View style={{ marginTop: spacing.lg }}>
          {mode === 'solar' ? (
            <DateTimePicker
              value={solar}
              mode='date'
              display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
              minimumDate={MIN_DATE}
              maximumDate={MAX_DATE}
              onChange={handleSolarChange}
              accentColor={accent}
              locale={locale}
            />
          ) : (
            <LunarColumns
              year={lunarYear}
              month={lunarMonth}
              day={safeDay}
              isLeap={lunarIsLeap}
              leapMonthOfYear={leapMonthOfYear}
              daysInMonth={daysInSelectedMonth}
              accent={accent}
              colors={colors}
              onChange={({ year, month, day, isLeap }) => {
                setLunarYear(year)
                setLunarMonth(month)
                setLunarDay(day)
                setLunarIsLeap(isLeap)
              }}
            />
          )}
        </View>

        <View style={{ flex: 1, minHeight: spacing.lg }} />

        <View style={[styles.footer, { marginTop: spacing.xl }]}>
          <Pressable onPress={handleNext} hitSlop={12}>
            <Text style={[styles.cta, { color: accent }]}>{copy.next}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  )
}

function ModePill({
  label,
  active,
  accent,
  colors,
  onPress,
}: {
  label: string
  active: boolean
  accent: string
  colors: ReturnType<typeof useTheme>['colors']
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole='button'
      accessibilityState={{ selected: active }}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 0.5,
        borderColor: active ? accent : colors.separator,
        backgroundColor: active ? `${accent}14` : 'transparent',
      }}
    >
      <Text
        style={{
          color: active ? accent : colors.secondary,
          fontSize: 13,
          fontWeight: '500',
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}

// ── Lunar wheel columns ───────────────────────────────────────────────────
//
// Plain ScrollView-based wheels (no extra picker dep). Each column is a
// vertical snap-scroll list; the centered row is the selection.

const WHEEL_ITEM_HEIGHT = 36
// 7 visible rows (was 5) — 5-row wheels read as "crammed at the top" on
// modern phone heights. 7 rows = 252px, centred wheel feels balanced.
const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * 7
const LUNAR_YEAR_MIN = 1901 // safe lower bound (1900 partial)
const LUNAR_YEAR_MAX = 2099

function LunarColumns({
  year,
  month,
  day,
  isLeap,
  leapMonthOfYear,
  daysInMonth,
  accent,
  colors,
  onChange,
}: {
  year: number
  month: number
  day: number
  isLeap: boolean
  leapMonthOfYear: number
  daysInMonth: number
  accent: string
  colors: ReturnType<typeof useTheme>['colors']
  onChange: (next: { year: number; month: number; day: number; isLeap: boolean }) => void
}) {
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
    for (let d = 1; d <= daysInMonth; d++) out.push(d)
    return out
  }, [daysInMonth])

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
        onSelect={(v) => onChange({ year: v as number, month, day, isLeap })}
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
          onChange({ year, month: m.value, day, isLeap: m.isLeap })
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
        selectedKey={String(day)}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '500',
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '300',
    lineHeight: 20,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cta: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
})
