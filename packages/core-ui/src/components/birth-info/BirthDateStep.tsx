/**
 * BirthDateStep — step 1: solar / lunar date entry.
 *
 * Solar mode: native `DateTimePicker` (inline iOS, calendar Android).
 * Lunar mode: the shared `LunarDateWheels` (year / month / day / leap variants),
 * backed by the compressed-table helpers in `@zhop/astro-core/lunar`.
 *
 * Both modes commit `solarDate` (canonical ISO YYYY-MM-DD). Lunar mode
 * also sets `lunarDate` (echo-back for the review screen).
 */

import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { lunarToSolar, solarToLunar } from '@zhop/astro-core'
import * as Haptics from 'expo-haptics'
import { useCallback, useMemo, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../theme'
import { BirthProgressIndicator } from './BirthProgressIndicator'
import { LunarDateWheels } from './LunarDateWheels'
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
            <LunarDateWheels
              year={lunarYear}
              month={lunarMonth}
              day={lunarDay}
              isLeap={lunarIsLeap}
              accent={accent}
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
