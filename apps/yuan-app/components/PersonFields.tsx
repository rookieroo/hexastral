/**
 * PersonFields — the compact single-scroll birth-info field stack shared by
 * both tabs of pair-input (self, and the "I know their details" other path).
 *
 * Lifted from the former fill-other.tsx so the two tabs share one
 * implementation. Binds directly to the onboarding draft (self* / other*
 * blocks) by `person` prop, mirroring how birth-info.tsx / fill-other.tsx
 * already read+write the draft. The self tab hides the relationship selector;
 * the other tab shows it.
 */

import {
  CityPicker,
  type CityRecord,
  DEFAULT_TOP_CITIES,
  type ShichenIndex,
  ShichenPicker,
} from '@zhop/core-ui'
import { yuanLight, yuanSpacing, yuanType } from '@zhop/hexastral-tokens/yuan'
import { type RelationshipType, RelationshipTypeSelector } from '@zhop/scenario-yuan'
import * as Haptics from 'expo-haptics'
import { useCallback, useMemo } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { searchCity } from '@/lib/geocode'
import { type Locale, type TranslationKey, t } from '@/lib/i18n'
import { type OnboardingDraft, updateDraft, useDraft } from '@/lib/onboardingDraft'

function localeToLang(loc: string): string {
  if (loc === 'en') return 'en-US'
  if (loc === 'ja') return 'ja-JP'
  if (loc === 'zh-Hant') return 'zh-TW'
  return 'zh-CN'
}

/** Generic field values, prefix-agnostic. */
interface FieldValues {
  name: string
  date: string
  city: string
  lat: number | null
  lng: number | null
  tz: string | null
  gender: '男' | '女' | null
  time: number | null
}

type FieldPatch = Partial<FieldValues>

export interface PersonFieldsProps {
  person: 'self' | 'other'
  locale: Locale
  /** Show the relationship-type selector (other tab only). */
  showRelationship?: boolean
}

export function PersonFields({ person, locale, showRelationship = false }: PersonFieldsProps) {
  const draft = useDraft()
  const lang = useMemo(() => localeToLang(locale), [locale])

  const v: FieldValues =
    person === 'self'
      ? {
          name: draft.selfName,
          date: draft.selfSolarDate,
          city: draft.selfBirthCity,
          lat: draft.selfBirthLat,
          lng: draft.selfBirthLng,
          tz: draft.selfBirthTimezone,
          gender: draft.selfGender,
          time: draft.selfTimeIndex,
        }
      : {
          name: draft.otherName,
          date: draft.otherSolarDate,
          city: draft.otherBirthCity,
          lat: draft.otherBirthLat,
          lng: draft.otherBirthLng,
          tz: draft.otherBirthTimezone,
          gender: draft.otherGender,
          time: draft.otherTimeIndex,
        }

  const apply = useCallback(
    (p: FieldPatch) => {
      const d: Partial<OnboardingDraft> = {}
      if (person === 'self') {
        if (p.name !== undefined) d.selfName = p.name
        if (p.date !== undefined) d.selfSolarDate = p.date
        if (p.city !== undefined) d.selfBirthCity = p.city
        if (p.lat !== undefined) d.selfBirthLat = p.lat
        if (p.lng !== undefined) d.selfBirthLng = p.lng
        if (p.tz !== undefined) d.selfBirthTimezone = p.tz
        if (p.gender !== undefined) d.selfGender = p.gender
        if (p.time !== undefined) d.selfTimeIndex = p.time
      } else {
        if (p.name !== undefined) d.otherName = p.name
        if (p.date !== undefined) d.otherSolarDate = p.date
        if (p.city !== undefined) d.otherBirthCity = p.city
        if (p.lat !== undefined) d.otherBirthLat = p.lat
        if (p.lng !== undefined) d.otherBirthLng = p.lng
        if (p.tz !== undefined) d.otherBirthTimezone = p.tz
        if (p.gender !== undefined) d.otherGender = p.gender
        if (p.time !== undefined) d.otherTimeIndex = p.time
      }
      updateDraft(d)
    },
    [person]
  )

  const pickedCity: CityRecord | null = v.city
    ? { name: v.city, country: '', lat: v.lat ?? 0, lng: v.lng ?? 0, timezone: v.tz }
    : null

  const shichen: ShichenIndex | null =
    typeof v.time === 'number' && v.time >= 0 && v.time <= 11 ? (v.time as ShichenIndex) : null

  const relType: RelationshipType | null = (draft.relationshipLabel as RelationshipType) || null

  const handleSearchCity = useCallback((q: string) => searchCity(q, lang, 7), [lang])
  const handlePickCity = useCallback(
    (picked: CityRecord) => {
      apply({
        city: picked.name.trim(),
        lat: Number.isFinite(picked.lat) ? picked.lat : null,
        lng: Number.isFinite(picked.lng) ? picked.lng : null,
        tz: picked.timezone ?? null,
      })
    },
    [apply]
  )

  const nameLabel: TranslationKey = person === 'self' ? 'pair.self.nameOptional' : 'fill.name'

  return (
    <View>
      <View style={{ marginBottom: yuanSpacing.lg }}>
        <SectionLabel>{t(locale, nameLabel)}</SectionLabel>
        <UnderlineInput
          value={v.name}
          onChangeText={(name) => apply({ name })}
          placeholder={t(locale, 'name.placeholder')}
        />
      </View>

      <View style={{ marginBottom: yuanSpacing.lg }}>
        <SectionLabel>{t(locale, 'fill.date')}</SectionLabel>
        <UnderlineInput
          value={v.date}
          onChangeText={(date) => apply({ date })}
          placeholder='1995-01-01'
          keyboardType='numbers-and-punctuation'
          maxLength={10}
        />
      </View>

      <View style={{ marginBottom: yuanSpacing.lg }}>
        <SectionLabel>{t(locale, 'fill.place')}</SectionLabel>
        <CityPicker
          value={pickedCity}
          onSelect={handlePickCity}
          search={handleSearchCity}
          topCities={DEFAULT_TOP_CITIES}
          placeholder={t(locale, 'fill.place')}
        />
      </View>

      <View style={{ marginBottom: yuanSpacing.lg }}>
        <SectionLabel>{t(locale, 'fill.gender')}</SectionLabel>
        <View style={{ flexDirection: 'row', gap: yuanSpacing.sm }}>
          <GenderChip
            label={t(locale, 'fill.gender.male')}
            selected={v.gender === '男'}
            onPress={() => apply({ gender: '男' })}
          />
          <GenderChip
            label={t(locale, 'fill.gender.female')}
            selected={v.gender === '女'}
            onPress={() => apply({ gender: '女' })}
          />
        </View>
      </View>

      <View style={{ marginBottom: yuanSpacing.lg }}>
        <SectionLabel>{t(locale, 'fill.time')}</SectionLabel>
        <ShichenPicker
          value={shichen}
          onChange={(idx) => apply({ time: idx })}
          onSelect={() => Haptics.selectionAsync()}
          accentColor={yuanLight.accent}
        />
        <Pressable
          onPress={() => {
            Haptics.selectionAsync()
            apply({ time: null })
          }}
          hitSlop={8}
          style={{ marginTop: yuanSpacing.sm, alignSelf: 'flex-start' }}
        >
          <Text
            style={[
              yuanType.caption,
              { color: yuanLight.textMuted, textDecorationLine: 'underline' },
            ]}
          >
            {t(locale, 'fill.timeUnknown')}
          </Text>
        </Pressable>
      </View>

      {showRelationship && (
        <View style={{ marginBottom: yuanSpacing.lg }}>
          <SectionLabel>{t(locale, 'fill.relationship')}</SectionLabel>
          <RelationshipTypeSelector
            value={relType}
            onChange={(rt) => updateDraft({ relationshipLabel: rt })}
          />
        </View>
      )}
    </View>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text style={[yuanType.seal, { color: yuanLight.textSecondary, marginBottom: yuanSpacing.sm }]}>
      {children}
    </Text>
  )
}

interface UnderlineInputProps {
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
  keyboardType?: 'default' | 'numbers-and-punctuation'
  maxLength?: number
}

function UnderlineInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
}: UnderlineInputProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={yuanLight.textMuted}
      keyboardType={keyboardType}
      maxLength={maxLength}
      style={{
        fontSize: yuanType.body.fontSize,
        color: yuanLight.text,
        borderBottomWidth: 0.5,
        borderBottomColor: yuanLight.border,
        paddingVertical: yuanSpacing.sm,
      }}
    />
  )
}

interface GenderChipProps {
  label: string
  selected: boolean
  onPress: () => void
}

function GenderChip({ label, selected, onPress }: GenderChipProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{
        paddingVertical: yuanSpacing.sm,
        paddingHorizontal: yuanSpacing.lg,
        borderRadius: 999,
        borderWidth: 0.5,
        borderColor: selected ? yuanLight.accent : yuanLight.border,
        backgroundColor: selected ? `${yuanLight.accent}14` : 'transparent',
      }}
    >
      <Text style={[yuanType.body, { color: selected ? yuanLight.accent : yuanLight.text }]}>
        {label}
      </Text>
    </Pressable>
  )
}
