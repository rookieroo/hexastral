/**
 * BirthForm — Kindred's single-page birth-info form.
 *
 * Extracted from pair-input.tsx so both the first-run pair flow AND the
 * post-onboarding "I know their details" flow (other-meta.tsx, reached from
 * the home "+" → mode) can mount the same single-page UI. Previously the
 * post-onboarding path chained mode → other-meta → other-birth, where
 * other-birth re-mounted the multi-step `BirthInfoForm` wizard — that gave
 * users "page-by-page" filling instead of the single-page form they'd just
 * used moments earlier for themselves.
 *
 * Layout (top → bottom):
 *   - Date (BirthDateField — prominent boxed input + sheet picker, solar/lunar)
 *   - Gender (Segmented — 男/女)
 *   - 时辰 (ShichenField — one-line summary + almanac wheel sheet, required)
 *   - Precise-time disclosure (self only, opt-in via `allowPreciseTime`): an
 *     HH:MM picker + birth city + 真太阳时 calibration toggle. 时辰 mode collects
 *     no birth place at all.
 *
 * Field, NameInput exports are utility pieces consumers wrap around the
 * BirthForm — e.g. for the partner header "Name" + "Relationship type".
 * Segmented stays private; only gender needs it today.
 */

import { resolveBirthHour } from '@zhop/astro-core'
import {
  BirthClockField,
  BirthDateField,
  type BirthDateFieldLabels,
  type BirthDateFieldValue,
  birthInputToSolar,
  CityPicker,
  type CityRecord,
  DEFAULT_TOP_CITIES,
  ShichenField,
  type ShichenIndex,
  shichenFieldLabelsForLocale,
} from '@zhop/core-ui'
import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import * as Haptics from 'expo-haptics'
import { type ReactNode, type RefObject, useState } from 'react'
import { Pressable, type ScrollView, Switch, Text, TextInput, View } from 'react-native'

import { kindredBirthCopy } from '@/lib/birthInfoCopy'
import { type Locale, t } from '@/lib/i18n'
import type { OnboardingDraft } from '@/lib/onboardingDraft'

const SHICHEN_BRANCHES = '子丑寅卯辰巳午未申酉戌亥'

/** Clock minutes → 时辰 index 0..11 (子时 = 0, covers 23:00–01:00). */
function clockToShichenIndex(min: number): number {
  const h = Math.floor(min / 60)
  return Math.floor((h + 1) / 2) % 12
}
function pad2(n: number): string {
  return String(n).padStart(2, '0')
}
function formatMinutes(min: number): string {
  return `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`
}
/** 排盘小时 → 时辰 label (14 → 未时). */
function shichenLabelForHour(hour: number): string {
  const idx = hour === 23 ? 0 : Math.floor((hour + 1) / 2) % 12
  return `${SHICHEN_BRANCHES[idx]}时`
}

export interface BirthFormProps {
  locale: Locale
  /** BCP-47 tag (e.g. 'zh-CN') for the native date picker. */
  lang: string
  date: BirthDateFieldValue
  onDate: (next: BirthDateFieldValue) => void
  dateLabels: BirthDateFieldLabels
  timeIndex: number | null
  onTime: (idx: number | null) => void
  gender: '男' | '女' | null
  onGender: (g: '男' | '女') => void
  city: string
  lat: number | null
  lng: number | null
  timezone: string | null
  onCity: (patch: Partial<OnboardingDraft>) => void
  searchCity: (query: string) => Promise<CityRecord[]>
  /** 'self' / 'other' — picks which draft fields the city write targets. */
  fieldPrefix: 'self' | 'other'
  /** Opt into the precise-time disclosure (self only): an HH:MM picker, birth
   *  city, and 真太阳时 calibration toggle below the 时辰 wheel. When false/unset
   *  the form is 时辰-only and collects NO birth place. */
  allowPreciseTime?: boolean
  /** Precise birth clock, minutes since midnight 0..1439 (precise mode). */
  clockMinutes?: number | null
  /** Commit a precise clock (minutes since midnight). */
  onClock?: (minutes: number) => void
  /** 真太阳时 calibration toggle (precise mode); null/true = on, false = off. */
  calibrate?: boolean | null
  /** Commit the calibration toggle. */
  onCalibrate?: (on: boolean) => void
  /** Host ScrollView — the city field scrolls itself above the keyboard on focus. */
  scrollRef: RefObject<ScrollView | null>
}

export function BirthForm({
  locale,
  lang,
  date,
  onDate,
  dateLabels,
  timeIndex,
  onTime,
  gender,
  onGender,
  city,
  lat,
  lng,
  timezone,
  onCity,
  searchCity,
  fieldPrefix,
  allowPreciseTime,
  clockMinutes,
  onClock,
  calibrate,
  onCalibrate,
  scrollRef,
}: BirthFormProps) {
  // 时辰 is REQUIRED — it drives the hour pillar of the 八字 (without it the
  // chart engine has to guess, silently producing a wrong chapter). It's a
  // collapsed ShichenField (one-line summary + almanac wheel sheet). Birth place
  // is NOT an always-on field: 时辰 mode collects none, and the precise-time
  // disclosure (self only) carries the city for 真太阳时 calibration.
  const shichen =
    typeof timeIndex === 'number' && timeIndex >= 0 && timeIndex <= 11
      ? (timeIndex as ShichenIndex)
      : null

  const cityValue =
    city.length > 0
      ? {
          name: city,
          country: '',
          lat: lat ?? 0,
          lng: lng ?? 0,
          timezone: timezone ?? null,
        }
      : null

  const preciseCopy = kindredBirthCopy(locale)
  const [showPrecise, setShowPrecise] = useState(clockMinutes != null)

  // A precise clock also snaps the 时辰 wheel to that clock's 时辰 (紫微 reads
  // timeIndex; the 八字 calibrates the clock on top — they can differ for a
  // birth near a 时辰 boundary, which the before→after line makes visible).
  const handleClock = (min: number) => {
    void Haptics.selectionAsync().catch(() => undefined)
    onClock?.(min)
    onTime(clockToShichenIndex(min))
  }
  const handlePreciseCity = (c: CityRecord) =>
    onCity(
      fieldPrefix === 'self'
        ? {
            selfBirthCity: c.name,
            selfBirthLat: c.lat,
            selfBirthLng: c.lng,
            selfBirthTimezone: c.timezone ?? null,
          }
        : {
            otherBirthCity: c.name,
            otherBirthLat: c.lat,
            otherBirthLng: c.lng,
            otherBirthTimezone: c.timezone ?? null,
          }
    )

  // Live 真太阳时 before→after preview — only when a clock + city are present and
  // calibration is on. Computed through the SAME resolver the chart uses.
  let calibrationPreview: string | null = null
  if (allowPreciseTime && clockMinutes != null && lng != null && date.solarDate) {
    const [yStr, mStr, dStr] = date.solarDate.split('-')
    const y = Number.parseInt(yStr ?? '', 10)
    const mo = Number.parseInt(mStr ?? '', 10)
    const d = Number.parseInt(dStr ?? '', 10)
    if (y && mo && d) {
      const resolved = resolveBirthHour({
        year: y,
        month: mo,
        day: d,
        clockMinutes,
        calibrate: calibrate ?? undefined,
        longitude: lng,
        timezoneId: timezone ?? undefined,
        city: city || undefined,
      })
      if (resolved.calibrated) {
        calibrationPreview = `${formatMinutes(clockMinutes)} → ${preciseCopy.trueSolarLabel ?? '真太阳时'} ${pad2(resolved.hour)}:${pad2(resolved.minute)} · ${shichenLabelForHour(resolved.hour)}`
      }
    }
  }

  const shichenLabels = shichenFieldLabelsForLocale(lang)

  // Solar is the quiet default; a small 农历 switch sits beside the "生日" title
  // instead of a full-width 公历/农历 segmented control (2026-06: "默认就是 Solar
  // birth，Birthday 标题右侧放一个小的农历开关"). Flipping it recomputes the
  // canonical solar date from the same typed input, exactly like the field's own
  // (now hidden) toggle did.
  const toggleCalendar = () => {
    const next = date.calendar === 'lunar' ? 'solar' : 'lunar'
    void Haptics.selectionAsync().catch(() => undefined)
    onDate({
      input: date.input,
      calendar: next,
      isLeap: false,
      solarDate: birthInputToSolar(date.input, next, false),
    })
  }

  return (
    <View style={{ gap: kindredSpacing.lg }}>
      <View style={{ gap: kindredSpacing.sm }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={[kindredType.seal, { color: kindredDark.textSecondary }]}>
            {t(locale, 'date.title')}
          </Text>
          <LunarSwitch
            on={date.calendar === 'lunar'}
            label={dateLabels.lunar}
            onToggle={toggleCalendar}
          />
        </View>
        <BirthDateField
          value={date}
          onChange={onDate}
          accent={kindredDark.accent}
          labels={dateLabels}
          locale={lang}
          prominent
          hideCalendarToggle
        />
      </View>

      <Field label={t(locale, 'fill.gender')}>
        <Segmented
          options={[
            { key: '男', label: t(locale, 'fill.gender.male') },
            { key: '女', label: t(locale, 'fill.gender.female') },
          ]}
          value={gender ?? ''}
          onChange={(k) => onGender(k as '男' | '女')}
        />
      </Field>

      <View style={{ gap: kindredSpacing.sm }}>
        <Text style={[kindredType.seal, { color: kindredDark.textSecondary }]}>
          {t(locale, 'time.title')}
        </Text>
        <Text style={[kindredType.caption, { color: kindredDark.textMuted, lineHeight: 18 }]}>
          {t(locale, 'pairInput.timeHint')}
        </Text>
        <ShichenField
          value={shichen}
          onChange={(idx) => onTime(idx)}
          accent={kindredDark.accent}
          labels={shichenLabels}
        />
      </View>

      {allowPreciseTime ? (
        <View style={{ gap: kindredSpacing.sm }}>
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync().catch(() => undefined)
              setShowPrecise((s) => !s)
            }}
            hitSlop={8}
            accessibilityRole='button'
          >
            <Text style={[kindredType.caption, { color: kindredDark.accent }]}>
              {`${showPrecise ? '▾  ' : '▸  '}${preciseCopy.precisePrompt ?? '知道确切出生时间？更精准'}`}
            </Text>
          </Pressable>

          {showPrecise ? (
            <View style={{ gap: kindredSpacing.md }}>
              <BirthClockField
                value={clockMinutes ?? null}
                onChange={handleClock}
                accent={kindredDark.accent}
                locale={lang}
                labels={{
                  placeholder: preciseCopy.preciseTimeLabel ?? '选择确切时间',
                  done: preciseCopy.next,
                }}
              />

              {clockMinutes != null ? (
                <View style={{ gap: kindredSpacing.md }}>
                  <Text
                    style={[kindredType.caption, { color: kindredDark.textMuted, lineHeight: 18 }]}
                  >
                    {preciseCopy.preciseCityLabel ?? '出生城市（用于真太阳时校准）'}
                  </Text>
                  <CityPicker
                    value={cityValue}
                    onSelect={handlePreciseCity}
                    search={searchCity}
                    topCities={DEFAULT_TOP_CITIES}
                    placeholder={preciseCopy.preciseCityPlaceholder ?? '搜索出生城市'}
                    scrollRef={scrollRef}
                  />

                  {lng != null ? (
                    <View style={{ gap: kindredSpacing.sm }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text style={[kindredType.body, { color: kindredDark.text }]}>
                          {preciseCopy.calibrateLabel ?? '真太阳时校准'}
                        </Text>
                        <Switch
                          value={calibrate !== false}
                          onValueChange={(on) => onCalibrate?.(on)}
                          trackColor={{ true: kindredDark.accent, false: kindredDark.border }}
                        />
                      </View>
                      {calibrationPreview ? (
                        <Text
                          style={[
                            kindredType.caption,
                            { color: kindredDark.textMuted, lineHeight: 18 },
                          ]}
                        >
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
    </View>
  )
}

/** Section label + child content. Used inside BirthForm and around it for
 *  free-form rows like Name / Relationship that aren't part of the birth
 *  data itself. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: kindredSpacing.sm }}>
      <Text style={[kindredType.seal, { color: kindredDark.textSecondary }]}>{label}</Text>
      {children}
    </View>
  )
}

/** Inline single-line text input themed to the kindred dark surface. */
export function NameInput({
  value,
  placeholder,
  onChange,
}: {
  value: string
  placeholder: string
  onChange: (v: string) => void
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={kindredDark.textMuted}
      style={{
        fontSize: kindredType.body.fontSize,
        color: kindredDark.text,
        borderBottomWidth: 0.5,
        borderBottomColor: kindredDark.border,
        paddingVertical: kindredSpacing.sm,
      }}
    />
  )
}

/** Compact 农历 switch — sits to the right of the "生日" title. Off = solar
 *  (the default); on = lunar. A label + tiny track/thumb so it reads as a
 *  switch, not another segmented control. */
function LunarSwitch({
  on,
  label,
  onToggle,
}: {
  on: boolean
  label: string
  onToggle: () => void
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole='switch'
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      hitSlop={10}
      style={{ flexDirection: 'row', alignItems: 'center', gap: kindredSpacing.sm }}
    >
      <Text
        style={[
          kindredType.caption,
          { color: on ? kindredDark.accent : kindredDark.textMuted, letterSpacing: 1 },
        ]}
      >
        {label}
      </Text>
      <View
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          padding: 2,
          borderWidth: 0.5,
          borderColor: on ? kindredDark.accent : kindredDark.border,
          backgroundColor: on ? `${kindredDark.accent}33` : 'transparent',
          alignItems: on ? 'flex-end' : 'flex-start',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: on ? kindredDark.accent : kindredDark.textMuted,
          }}
        />
      </View>
    </Pressable>
  )
}

/** Equal-width pill segmented control, private to BirthForm (gender only). */
function Segmented({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ key: string; label: string }>
  value: string
  onChange: (key: string) => void
}) {
  return (
    <View style={{ flexDirection: 'row', gap: kindredSpacing.sm }}>
      {options.map((o) => {
        const selected = value === o.key
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole='button'
            accessibilityState={{ selected }}
            style={{
              flex: 1,
              paddingVertical: kindredSpacing.sm,
              borderRadius: 10,
              borderWidth: 0.5,
              borderColor: selected ? kindredDark.accent : kindredDark.border,
              backgroundColor: selected ? `${kindredDark.accent}1F` : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text
              style={[
                kindredType.body,
                {
                  color: selected ? kindredDark.accent : kindredDark.text,
                  fontWeight: selected ? '600' : '400',
                },
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
