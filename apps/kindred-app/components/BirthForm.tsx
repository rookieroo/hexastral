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
 *   - Date (BirthDateField — compact + sheet picker, solar/lunar toggle)
 *   - Gender (Segmented — 男/女)
 *   - 时辰 (ShichenPicker grid, ALWAYS visible, required)
 *   - City (CityPicker, optional, with clear shortcut)
 *
 * Field, NameInput exports are utility pieces consumers wrap around the
 * BirthForm — e.g. for the partner header "Name" + "Relationship type".
 * Segmented stays private; only gender needs it today.
 */

import {
  BirthDateField,
  type BirthDateFieldLabels,
  type BirthDateFieldValue,
  type CityRecord,
  CityPicker,
  DEFAULT_TOP_CITIES,
  type ShichenIndex,
  ShichenPicker,
} from '@zhop/core-ui'
import {
  kindredDark,
  kindredSpacing,
  kindredType,
} from '@zhop/hexastral-tokens/kindred'
import * as Haptics from 'expo-haptics'
import type { ReactNode, RefObject } from 'react'
import { Pressable, type ScrollView, Text, TextInput, View } from 'react-native'

import { type Locale, t } from '@/lib/i18n'
import type { OnboardingDraft } from '@/lib/onboardingDraft'

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
  scrollRef,
}: BirthFormProps) {
  // 时辰 is REQUIRED — it drives the hour pillar of the 八字 (without it the
  // chart engine has to guess, silently producing a wrong chapter). The
  // picker is always visible; city stays inline with an "optional" hint.
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

  const clearCity = () => {
    void Haptics.selectionAsync().catch(() => undefined)
    onCity(
      fieldPrefix === 'self'
        ? {
            selfBirthCity: '',
            selfBirthLat: null,
            selfBirthLng: null,
            selfBirthTimezone: null,
          }
        : {
            otherBirthCity: '',
            otherBirthLat: null,
            otherBirthLng: null,
            otherBirthTimezone: null,
          }
    )
  }

  return (
    <View style={{ gap: kindredSpacing.lg }}>
      <Field label={t(locale, 'date.title')}>
        <BirthDateField
          value={date}
          onChange={onDate}
          accent={kindredDark.accent}
          labels={dateLabels}
          locale={lang}
        />
      </Field>

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
        <ShichenPicker
          value={shichen}
          onChange={(idx) => onTime(idx)}
          accentColor={kindredDark.accent}
        />
      </View>

      <View style={{ gap: kindredSpacing.sm }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={[kindredType.seal, { color: kindredDark.textSecondary }]}>
            {t(locale, 'place.title')}
          </Text>
          {city.length > 0 ? (
            <Pressable onPress={clearCity} hitSlop={6} accessibilityRole='button'>
              <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>
                {t(locale, 'pairInput.cityClear')}
              </Text>
            </Pressable>
          ) : (
            <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>
              {t(locale, 'pairInput.cityOptional')}
            </Text>
          )}
        </View>
        <Text style={[kindredType.caption, { color: kindredDark.textMuted, lineHeight: 18 }]}>
          {t(locale, 'pairInput.cityHint')}
        </Text>
        <CityPicker
          value={cityValue}
          onSelect={(c) =>
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
          }
          search={searchCity}
          topCities={DEFAULT_TOP_CITIES}
          placeholder={t(locale, 'pairInput.cityPlaceholder')}
          scrollRef={scrollRef}
        />
      </View>
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
