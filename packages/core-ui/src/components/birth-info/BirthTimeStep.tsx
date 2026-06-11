/**
 * BirthTimeStep — step 2: 12-cell 十二时辰 grid.
 *
 * Thin layout shell around the existing `ShichenPicker` primitive. Adds
 * the step chrome (progress / title / subtitle), the Skip ("I don't know")
 * affordance, and the Next CTA.
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

  const handleNext = () => {
    if (picked === null) return
    Haptics.selectionAsync()
    onChange({ timeIndex: picked })
    onNext()
  }

  // ── Precise-time disclosure (opt-in via allowPreciseTime) ─────────────────
  const [showPrecise, setShowPrecise] = useState(value.clockMinutes != null)

  // Entering a precise clock also snaps the 时辰 wheel to that clock's 时辰, so
  // 紫微 (which reads timeIndex) stays consistent with the 八字 the precise clock
  // calibrates. The before→after line below shows the calibrated 时辰 separately
  // (it can differ for births near a 时辰 boundary).
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

  // Live 真太阳时 before→after preview — only when a clock + city are present and
  // calibration is on. Computed through the SAME resolver the chart uses.
  let calibrationPreview: string | null = null
  if (allowPreciseTime && value.clockMinutes != null && value.lng != null && value.solarDate) {
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
        calibrate: value.calibrate,
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

  // Skip is only available when the host hasn't marked time as required.
  // For apps that read the hour pillar (kindred / yuan / numerology / cycle),
  // a null timeIndex breaks the chart; they pass `requireTime` to lock this.
  const handleSkip = requireTime
    ? null
    : () => {
        Haptics.selectionAsync()
        onChange({ timeIndex: null })
        onNext()
      }

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

        {/* Precise-time opt-in — collapsed by default so the 时辰 wheel stays the
            low-friction hero. Revealing it adds an HH:MM picker, a birth-city
            picker, and a 真太阳时 calibration toggle (default on once a city is
            set). Only rendered for hosts that pass allowPreciseTime. */}
        {allowPreciseTime ? (
          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync().catch(() => undefined)
                setShowPrecise((s) => !s)
              }}
              hitSlop={8}
              accessibilityRole='button'
            >
              <Text style={{ color: accent, fontSize: 13, fontWeight: '500' }}>
                {`${showPrecise ? '▾  ' : '▸  '}${copy.precisePrompt ?? '知道确切出生时间？更精准'}`}
              </Text>
            </Pressable>

            {showPrecise ? (
              <View style={{ gap: spacing.md }}>
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
            ) : null}
          </View>
        ) : null}

        <View style={{ flex: 1, minHeight: spacing.lg }} />

        <View
          style={[
            styles.footer,
            // Without a skip affordance the CTA aligns right (no left sibling
            // to balance against), which matches every other required step.
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
            disabled={picked === null}
            style={{ opacity: picked === null ? 0.3 : 1 }}
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
