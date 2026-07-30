/**
 * BirthTimeStep — step 2: 十二时辰 OR exact clock + city (mutually exclusive).
 *
 * When `allowPreciseTime` is on, a segmented toggle chooses the mode. Switching
 * to 时辰 clears clock / city / calibrate so the chart engine cannot keep a
 * stale precise path under a shichen UI.
 */

import { resolveBirthHour } from '@zhop/astro-core'
import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { useTheme } from '../../theme'
import { CityPicker, type CityRecord } from '../CityPicker'
import { type ShichenIndex, ShichenPicker } from '../ShichenPicker'
import { BirthClockField } from './BirthClockField'
import { BirthProgressIndicator } from './BirthProgressIndicator'
import { BirthTimeModeToggle } from './BirthTimeModeToggle'
import {
  type BirthTimeMode,
  birthTimeModeFromClock,
  clearedPreciseBirthFields,
} from './birthTimeMode'
import { ShichenWheel } from './ShichenWheel'
import type { BirthStepProps } from './types'

const SHICHEN_BRANCHES = '子丑寅卯辰巳午未申酉戌亥'

/** Clock minutes → 时辰 index 0..11 (子时 = index 0, covers 23:00–01:00). */
function clockToShichenIndex(min: number): ShichenIndex {
  const h = Math.floor(min / 60)
  return (Math.floor((h + 1) / 2) % 12) as ShichenIndex
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/**排盘小时 → 时辰 label (e.g. 14 → 未时). */
function shichenLabelForHour(hour: number): string {
  const idx = hour === 23 ? 0 : Math.floor((hour + 1) / 2) % 12
  return `${SHICHEN_BRANCHES[idx]}时`
}

export function BirthTimeStep({
  value,
  onChange,
  onNext,
  accent,
  copy,
  step,
  totalSteps,
  requireTime,
  timeInputStyle = 'grid',
  allowPreciseTime,
  searchCity,
  topCities,
  locale,
}: BirthStepProps) {
  const { colors, spacing } = useTheme()
  const isWheel = timeInputStyle === 'wheel'
  const initial = value.timeIndex ?? null
  // The wheel always has a centred value, so it starts on the saved 时辰 (or 子)
  // rather than null — otherwise Next would read as disabled under a clearly
  // selected row. The grid keeps null so the user must tap to choose.
  const [picked, setPicked] = useState<ShichenIndex | null>(isWheel ? (initial ?? 0) : initial)
  const [mode, setMode] = useState<BirthTimeMode>(() => birthTimeModeFromClock(value.clockMinutes))

  const switchMode = (next: BirthTimeMode) => {
    setMode(next)
    if (next === 'shichen') {
      onChange(clearedPreciseBirthFields())
      return
    }
    // Entering precise: keep current 时辰 as a starting hint until clock is set.
    if (picked != null) onChange({ timeIndex: picked })
  }

  const handleNext = () => {
    if (mode === 'shichen') {
      if (picked === null) return
      Haptics.selectionAsync()
      onChange({ ...clearedPreciseBirthFields(), timeIndex: picked })
      onNext()
      return
    }
    if (value.clockMinutes == null) return
    Haptics.selectionAsync()
    onChange({
      clockMinutes: value.clockMinutes,
      timeIndex: clockToShichenIndex(value.clockMinutes),
    })
    onNext()
  }

  const handleClock = (min: number) => {
    const idx = clockToShichenIndex(min)
    setPicked(idx)
    onChange({ clockMinutes: min, timeIndex: idx })
  }
  const handleCity = (c: CityRecord) => {
    Haptics.selectionAsync()
    onChange({ city: c.name, lat: c.lat, lng: c.lng, timezone: c.timezone ?? undefined })
  }
  const cityValue: CityRecord | null = value.city
    ? {
        name: value.city,
        country: '',
        lat: value.lat ?? 0,
        lng: value.lng ?? 0,
        timezone: value.timezone ?? null,
      }
    : null

  let calibrationPreview: string | null = null
  if (
    allowPreciseTime &&
    mode === 'precise' &&
    value.clockMinutes != null &&
    value.lng != null &&
    value.solarDate
  ) {
    const [yStr, mStr, dStr] = value.solarDate.split('-')
    const y = Number.parseInt(yStr ?? '', 10)
    const m = Number.parseInt(mStr ?? '', 10)
    const d = Number.parseInt(dStr ?? '', 10)
    if (y && m && d) {
      const resolved = resolveBirthHour({
        year: y,
        month: m,
        day: d,
        clockMinutes: value.clockMinutes,
        calibrate: value.calibrate ?? undefined,
        longitude: value.lng,
        timezoneId: value.timezone,
        city: value.city,
      })
      if (resolved.calibrated) {
        const from = `${pad2(Math.floor(value.clockMinutes / 60))}:${pad2(value.clockMinutes % 60)}`
        const to = `${pad2(resolved.hour)}:${pad2(resolved.minute)}`
        calibrationPreview = `${from} → ${copy.trueSolarLabel ?? '真太阳时'} ${to} · ${shichenLabelForHour(resolved.hour)}`
      }
    }
  }

  const handleSkip = requireTime
    ? null
    : () => {
        Haptics.selectionAsync()
        onChange({ ...clearedPreciseBirthFields(), timeIndex: null })
        onNext()
      }

  const nextDisabled = mode === 'shichen' ? picked === null : value.clockMinutes == null

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

        <View style={{ marginTop: spacing['2xl'], gap: spacing.sm }}>
          <Text style={[styles.title, { color: colors.text }]}>{copy.timeTitle}</Text>
          {copy.timeSubtitle ? (
            <Text style={[styles.subtitle, { color: colors.secondary }]}>{copy.timeSubtitle}</Text>
          ) : null}
        </View>

        {allowPreciseTime ? (
          <View style={{ marginTop: spacing.xl }}>
            <BirthTimeModeToggle
              value={mode}
              onChange={switchMode}
              accent={accent}
              labels={{
                shichen: copy.modeShichen ?? '时辰',
                precise: copy.modePrecise ?? '精确时间',
              }}
            />
          </View>
        ) : null}

        {mode === 'shichen' || !allowPreciseTime ? (
          <View style={{ marginTop: spacing.xl }}>
            {isWheel ? (
              <ShichenWheel value={picked ?? 0} onChange={setPicked} accent={accent} />
            ) : (
              <ShichenPicker
                value={picked}
                onChange={setPicked}
                onSelect={() => Haptics.selectionAsync()}
                accentColor={accent}
              />
            )}
          </View>
        ) : (
          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            {copy.preciseTimeLabel ? (
              <Text style={[styles.fieldLabel, { color: colors.secondary }]}>
                {copy.preciseTimeLabel}
              </Text>
            ) : null}
            <BirthClockField
              value={value.clockMinutes ?? null}
              onChange={handleClock}
              accent={accent}
              locale={locale}
              labels={{
                placeholder: copy.preciseTimeLabel ?? '选择确切时间',
                done: copy.next,
              }}
            />

            {value.clockMinutes != null ? (
              <View style={{ gap: spacing.md }}>
                {copy.preciseCityLabel ? (
                  <Text style={[styles.fieldLabel, { color: colors.secondary }]}>
                    {copy.preciseCityLabel}
                  </Text>
                ) : null}
                {searchCity ? (
                  <CityPicker
                    value={cityValue}
                    onSelect={handleCity}
                    search={searchCity}
                    topCities={topCities ? Array.from(topCities) : undefined}
                    placeholder={copy.preciseCityPlaceholder ?? '搜索出生城市'}
                  />
                ) : null}

                {value.lng != null ? (
                  <View style={{ gap: spacing.sm }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text style={{ color: colors.text, fontSize: 14 }}>
                        {copy.calibrateLabel ?? '真太阳时校准'}
                      </Text>
                      <Switch
                        value={value.calibrate !== false}
                        onValueChange={(on) => onChange({ calibrate: on })}
                        trackColor={{ true: accent, false: colors.separator }}
                      />
                    </View>
                    {calibrationPreview ? (
                      <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 18 }}>
                        {calibrationPreview}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        )}

        <View style={{ flex: 1, minHeight: spacing.lg }} />

        <View
          style={[
            styles.footer,
            { marginTop: spacing.xl, justifyContent: handleSkip ? 'space-between' : 'flex-end' },
          ]}
        >
          {handleSkip ? (
            <Pressable onPress={handleSkip} hitSlop={12}>
              <Text style={[styles.skip, { color: colors.secondary }]}>{copy.timeSkipLabel}</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={handleNext}
            hitSlop={12}
            disabled={nextDisabled}
            style={{ opacity: nextDisabled ? 0.3 : 1 }}
          >
            <Text style={[styles.cta, { color: accent }]}>{copy.next}</Text>
          </Pressable>
        </View>
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
  fieldLabel: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skip: {
    fontSize: 13,
    fontWeight: '300',
    textDecorationLine: 'underline',
  },
  cta: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
})
