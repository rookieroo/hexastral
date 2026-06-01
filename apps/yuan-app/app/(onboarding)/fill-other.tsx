/**
 * Onboarding · Screen 7b — Fill in for the other person (solo mode)
 *
 * For when A doesn't want to send an invite (e.g., "what's my compatibility
 * with [public figure]" or "how do I match with my late grandmother").
 *
 * Single screen — power-user shortcut. Collects everything POST /api/bonds/solo
 * needs (name, date, time, gender, place, relationship); the actual submission
 * happens on /reveal where the 2.7s animation masks API latency.
 */

import {
  CityPicker,
  type CityRecord,
  DEFAULT_TOP_CITIES,
  type ShichenIndex,
  ShichenPicker,
} from '@zhop/core-ui'
import { yuanLight, yuanPresets, yuanSpacing, yuanType } from '@zhop/hexastral-tokens/yuan'
import { type RelationshipType, RelationshipTypeSelector } from '@zhop/scenario-yuan'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ProgressIndicator } from '@/components/ProgressIndicator'
import { searchCity } from '@/lib/geocode'
import { resolveLocale, t } from '@/lib/i18n'
import { updateDraft, useDraft } from '@/lib/onboardingDraft'

function localeToLang(loc: string): string {
  if (loc === 'en') return 'en-US'
  if (loc === 'ja') return 'ja-JP'
  if (loc === 'zh-Hant') return 'zh-TW'
  return 'zh-CN'
}

export default function FillOtherScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const draft = useDraft()
  const lang = useMemo(() => localeToLang(locale), [locale])
  const [name, setName] = useState<string>(draft.otherName)
  const [date, setDate] = useState<string>(draft.otherSolarDate)
  const [pickedCity, setPickedCity] = useState<CityRecord | null>(() =>
    draft.otherBirthCity
      ? {
          name: draft.otherBirthCity,
          country: '',
          lat: draft.otherBirthLat ?? 0,
          lng: draft.otherBirthLng ?? 0,
          timezone: draft.otherBirthTimezone,
        }
      : null
  )
  const [gender, setGender] = useState<'男' | '女' | null>(draft.otherGender)
  const draftOtherTime = draft.otherTimeIndex
  const [shichen, setShichen] = useState<ShichenIndex | null>(
    typeof draftOtherTime === 'number' && draftOtherTime >= 0 && draftOtherTime <= 11
      ? (draftOtherTime as ShichenIndex)
      : null
  )
  const [relType, setRelType] = useState<RelationshipType | null>(
    (draft.relationshipLabel as RelationshipType) || 'romantic'
  )

  const cityName = pickedCity?.name.trim() ?? ''
  const canContinue =
    name.trim().length > 0 &&
    date.length === 10 &&
    cityName.length > 0 &&
    gender !== null &&
    relType !== null

  const handleSearchCity = useCallback((q: string) => searchCity(q, lang, 7), [lang])
  const handlePickCity = useCallback((picked: CityRecord) => {
    setPickedCity(picked)
  }, [])

  const handleNext = () => {
    if (!canContinue) return
    updateDraft({
      otherMode: 'fill',
      otherName: name.trim(),
      otherSolarDate: date,
      otherTimeIndex: shichen,
      otherBirthCity: cityName,
      otherBirthLat: pickedCity && Number.isFinite(pickedCity.lat) ? pickedCity.lat : null,
      otherBirthLng: pickedCity && Number.isFinite(pickedCity.lng) ? pickedCity.lng : null,
      otherBirthTimezone: pickedCity?.timezone ?? null,
      otherGender: gender,
      relationshipLabel: relType ?? '',
    })
    router.push('/(onboarding)/reveal')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: yuanLight.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: yuanSpacing.screenH,
          paddingTop: yuanSpacing.xl,
          paddingBottom: yuanSpacing.xxl,
        }}
        keyboardShouldPersistTaps='handled'
      >
        <ProgressIndicator step={6} total={6} />
        <View style={{ height: yuanSpacing.xl }} />
        <Text style={[yuanType.title, { color: yuanLight.text }]}>{t(locale, 'fill.title')}</Text>
        <View style={{ height: yuanSpacing.xl }} />

        <Field label={t(locale, 'fill.name')} value={name} onChangeText={setName} />
        <Field
          label={t(locale, 'fill.date')}
          value={date}
          onChangeText={setDate}
          placeholder='1995-01-01'
        />
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
              selected={gender === '男'}
              onPress={() => setGender('男')}
            />
            <GenderChip
              label={t(locale, 'fill.gender.female')}
              selected={gender === '女'}
              onPress={() => setGender('女')}
            />
          </View>
        </View>

        <View style={{ marginBottom: yuanSpacing.lg }}>
          <SectionLabel>{t(locale, 'fill.time')}</SectionLabel>
          <ShichenPicker
            value={shichen}
            onChange={setShichen}
            onSelect={() => Haptics.selectionAsync()}
            accentColor={yuanLight.accent}
          />
          <Pressable
            onPress={() => {
              Haptics.selectionAsync()
              setShichen(null)
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

        <View style={{ marginBottom: yuanSpacing.lg }}>
          <SectionLabel>{t(locale, 'fill.relationship')}</SectionLabel>
          <RelationshipTypeSelector value={relType} onChange={setRelType} />
        </View>

        <View style={{ height: yuanSpacing.xl }} />
        <Pressable
          onPress={handleNext}
          disabled={!canContinue}
          hitSlop={12}
          style={{ alignSelf: 'flex-end', opacity: canContinue ? 1 : 0.3 }}
        >
          <Text style={yuanPresets.ctaText}>{t(locale, 'fill.done')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text style={[yuanType.seal, { color: yuanLight.textSecondary, marginBottom: yuanSpacing.sm }]}>
      {children}
    </Text>
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

interface FieldProps {
  label: string
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
}

function Field({ label, value, onChangeText, placeholder }: FieldProps) {
  return (
    <View style={{ marginBottom: yuanSpacing.lg }}>
      <SectionLabel>{label}</SectionLabel>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={yuanLight.textMuted}
        style={{
          fontSize: yuanType.body.fontSize,
          color: yuanLight.text,
          borderBottomWidth: 0.5,
          borderBottomColor: yuanLight.border,
          paddingVertical: yuanSpacing.sm,
        }}
      />
    </View>
  )
}
