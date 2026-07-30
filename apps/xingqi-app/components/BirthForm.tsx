/**
 * BirthForm — Xingqi's single-page birth-info form (ported from Kindred).
 *
 * Layout (top → bottom):
 *   - Date (BirthDateField — prominent boxed input + sheet picker, solar/lunar)
 *   - Gender (Segmented — 男/女)
 *   - Time mode (when `allowPreciseTime`): 时辰 XOR exact clock + city
 *   - Without `allowPreciseTime`: ShichenField only (no birth place)
 */

import { resolveBirthHour } from '@zhop/astro-core'
import {
  BirthClockField,
  BirthDateField,
  type BirthDateFieldLabels,
  type BirthDateFieldValue,
  type BirthTimeMode,
  BirthTimeModeToggle,
  birthTimeModeFromClock,
  CityPicker,
  type CityRecord,
  clearedPreciseBirthFields,
  DEFAULT_TOP_CITIES,
  formatHourMinute,
  ShichenField,
  type ShichenIndex,
  shichenFieldLabelsForLocale,
  shichenInlineLabel,
  switchBirthCalendar,
  Toggle,
  useTheme,
} from '@zhop/core-ui'
import { kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import * as Haptics from 'expo-haptics'
import { type ReactNode, type RefObject, useState } from 'react'
import { Pressable, type ScrollView, Text, TextInput, View } from 'react-native'

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
/** 排盘小时 → 时辰 label (14 → 未时 / "Goat"), locale-aware. */
function shichenLabelForHour(hour: number, locale: string): string {
  const idx = hour === 23 ? 0 : Math.floor((hour + 1) / 2) % 12
  return shichenInlineLabel(idx, SHICHEN_BRANCHES[idx] ?? '', locale)
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
  /** Opt into 时辰 XOR exact-time modes. When false/unset the form is
   *  时辰-only and collects NO birth place. */
  allowPreciseTime?: boolean
  /** Precise birth clock, minutes since midnight 0..1439 (precise mode). */
  clockMinutes?: number | null
  /** Commit a precise clock, or null when leaving precise mode. */
  onClock?: (minutes: number | null) => void
  /** 真太阳时 calibration toggle (precise mode); null/true = on, false = off. */
  calibrate?: boolean | null
  /** Commit the calibration toggle (null when leaving precise mode). */
  onCalibrate?: (on: boolean | null) => void
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
  const { colors } = useTheme()
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
  const [timeMode, setTimeMode] = useState<BirthTimeMode>(() =>
    birthTimeModeFromClock(clockMinutes)
  )

  const clearPrecise = () => {
    const cleared = clearedPreciseBirthFields()
    onClock?.(cleared.clockMinutes)
    onCalibrate?.(cleared.calibrate)
    onCity({
      selfBirthCity: '',
      selfBirthLat: null,
      selfBirthLng: null,
      selfBirthTimezone: null,
    })
  }

  const switchTimeMode = (next: BirthTimeMode) => {
    setTimeMode(next)
    if (next === 'shichen') clearPrecise()
  }

  const handleClock = (min: number) => {
    void Haptics.selectionAsync().catch(() => undefined)
    onClock?.(min)
    onTime(clockToShichenIndex(min))
  }
  const handlePreciseCity = (c: CityRecord) =>
    onCity({
      selfBirthCity: c.name,
      selfBirthLat: c.lat,
      selfBirthLng: c.lng,
      selfBirthTimezone: c.timezone ?? null,
    })

  let calibrationPreview: string | null = null
  if (
    allowPreciseTime &&
    timeMode === 'precise' &&
    clockMinutes != null &&
    lng != null &&
    date.solarDate
  ) {
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
        calibrationPreview = `${formatHourMinute(formatMinutes(clockMinutes), locale)} → ${preciseCopy.trueSolarLabel ?? '真太阳时'} ${formatHourMinute(`${pad2(resolved.hour)}:${pad2(resolved.minute)}`, locale)} · ${shichenLabelForHour(resolved.hour, locale)}`
      }
    }
  }

  const shichenLabels = shichenFieldLabelsForLocale(lang)

  const toggleCalendar = () => {
    const next = date.calendar === 'lunar' ? 'solar' : 'lunar'
    void Haptics.selectionAsync().catch(() => undefined)
    onDate(switchBirthCalendar(date.input, date.calendar, date.isLeap ?? false, next))
  }

  const showShichen = !allowPreciseTime || timeMode === 'shichen'

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
          <Text style={[kindredType.seal, { color: colors.secondary }]}>
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
          accent={colors.accent}
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
        <Text style={[kindredType.seal, { color: colors.secondary }]}>
          {t(locale, 'time.title')}
        </Text>
        <Text style={[kindredType.caption, { color: colors.dim, lineHeight: 18 }]}>
          {t(locale, 'pairInput.timeHint')}
        </Text>

        {allowPreciseTime ? (
          <BirthTimeModeToggle
            value={timeMode}
            onChange={switchTimeMode}
            accent={colors.accent}
            labels={{
              shichen: preciseCopy.modeShichen ?? '时辰',
              precise: preciseCopy.modePrecise ?? '精确时间',
            }}
          />
        ) : null}

        {showShichen ? (
          <ShichenField
            value={shichen}
            onChange={(idx) => {
              clearPrecise()
              onTime(idx)
            }}
            accent={colors.accent}
            labels={shichenLabels}
            locale={locale}
          />
        ) : (
          <View style={{ gap: kindredSpacing.md }}>
            <BirthClockField
              value={clockMinutes ?? null}
              onChange={handleClock}
              accent={colors.accent}
              locale={lang}
              labels={{
                placeholder: preciseCopy.preciseTimeLabel ?? '选择确切时间',
                done: preciseCopy.next,
              }}
            />

            {clockMinutes != null ? (
              <View style={{ gap: kindredSpacing.md }}>
                <Text style={[kindredType.caption, { color: colors.dim, lineHeight: 18 }]}>
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
                      <Text style={[kindredType.body, { color: colors.text }]}>
                        {preciseCopy.calibrateLabel ?? '真太阳时校准'}
                      </Text>
                      <Toggle
                        value={calibrate !== false}
                        onValueChange={(on) => onCalibrate?.(on)}
                        accent={colors.accent}
                        accessibilityLabel={preciseCopy.calibrateLabel ?? '真太阳时校准'}
                      />
                    </View>
                    {calibrationPreview ? (
                      <Text style={[kindredType.caption, { color: colors.dim, lineHeight: 18 }]}>
                        {calibrationPreview}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        )}
      </View>
    </View>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  const { colors } = useTheme()
  return (
    <View style={{ gap: kindredSpacing.sm }}>
      <Text style={[kindredType.seal, { color: colors.secondary }]}>{label}</Text>
      {children}
    </View>
  )
}

export function NameInput({
  value,
  placeholder,
  onChange,
}: {
  value: string
  placeholder: string
  onChange: (v: string) => void
}) {
  const { colors } = useTheme()
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.dim}
      style={{
        fontSize: kindredType.body.fontSize,
        color: colors.text,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.separator,
        paddingVertical: kindredSpacing.sm,
      }}
    />
  )
}

function LunarSwitch({
  on,
  label,
  onToggle,
}: {
  on: boolean
  label: string
  onToggle: () => void
}) {
  const { colors } = useTheme()
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
        style={[kindredType.caption, { color: on ? colors.accent : colors.dim, letterSpacing: 1 }]}
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
          borderColor: on ? colors.accent : colors.separator,
          backgroundColor: on ? `${colors.accent}33` : 'transparent',
          alignItems: on ? 'flex-end' : 'flex-start',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: on ? colors.accent : colors.dim,
          }}
        />
      </View>
    </Pressable>
  )
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ key: string; label: string }>
  value: string
  onChange: (key: string) => void
}) {
  const { colors } = useTheme()
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
              borderColor: selected ? colors.accent : colors.separator,
              backgroundColor: selected ? `${colors.accent}1F` : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text
              style={[
                kindredType.body,
                {
                  color: selected ? colors.accent : colors.text,
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
