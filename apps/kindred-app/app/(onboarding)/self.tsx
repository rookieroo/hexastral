/**
 * Onboarding · Self birth info.
 *
 * Mounts core-ui's `<BirthInfoForm>` — the canonical 5-step wizard with
 * solar/lunar toggle, real DateTimePicker, ShichenPicker, gender chips,
 * CityPicker and review. Replaces the cramped manual-entry PersonFields
 * stack so dates use a real picker and lunar entry is supported.
 *
 * Binds directly to the onboarding draft (self* fields) — every step
 * commits via onChange so a backgrounded app preserves progress. The form
 * navigates internally between steps; we only handle the terminal submit
 * (→ mode picker).
 *
 * V15Moon is rendered as the form's crown so the brand anchor is visible
 * throughout the wizard (matches the home header + HomeSplash logo).
 */

import {
  BirthInfoForm,
  type BirthInfoValue,
  birthInfoCopyForLocale,
  type CityRecord,
} from '@zhop/core-ui'
import { V15Moon } from '@zhop/core-ui/motion'
import { kindredDark } from '@zhop/hexastral-tokens/kindred'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { searchCity as searchCityApi } from '@/lib/geocode'
import { resolveLocale } from '@/lib/i18n'
import { type OnboardingDraft, updateDraft, useDraft } from '@/lib/onboardingDraft'

function localeToLang(loc: string): string {
  if (loc === 'en') return 'en-US'
  if (loc === 'ja') return 'ja-JP'
  if (loc === 'zh-Hant') return 'zh-TW'
  return 'zh-CN'
}

export default function SelfBirthScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const draft = useDraft()
  const lang = useMemo(() => localeToLang(locale), [locale])
  const copy = useMemo(() => birthInfoCopyForLocale(locale), [locale])

  const value: Partial<BirthInfoValue> = {
    solarDate: draft.selfSolarDate || undefined,
    timeIndex:
      typeof draft.selfTimeIndex === 'number' &&
      draft.selfTimeIndex >= 0 &&
      draft.selfTimeIndex <= 11
        ? (draft.selfTimeIndex as BirthInfoValue['timeIndex'])
        : null,
    gender: draft.selfGender ?? undefined,
    city: draft.selfBirthCity || undefined,
    lat: draft.selfBirthLat ?? undefined,
    lng: draft.selfBirthLng ?? undefined,
    timezone: draft.selfBirthTimezone ?? undefined,
  }

  const handleChange = (next: Partial<BirthInfoValue>) => {
    const patch: Partial<OnboardingDraft> = {}
    if (next.solarDate !== undefined) patch.selfSolarDate = next.solarDate
    if (next.timeIndex !== undefined) patch.selfTimeIndex = next.timeIndex
    if (next.gender !== undefined) patch.selfGender = next.gender
    if (next.city !== undefined) patch.selfBirthCity = next.city
    if (next.lat !== undefined) patch.selfBirthLat = next.lat
    if (next.lng !== undefined) patch.selfBirthLng = next.lng
    if (next.timezone !== undefined) patch.selfBirthTimezone = next.timezone
    updateDraft(patch)
  }

  const handleSearchCity = async (query: string): Promise<CityRecord[]> =>
    searchCityApi(query, lang, 7)

  const handleSubmit = async () => {
    router.push('/(onboarding)/mode')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
      <View style={{ flex: 1 }}>
        <BirthInfoForm
          value={value}
          onChange={handleChange}
          onSubmit={handleSubmit}
          accent={kindredDark.accent}
          crown={<V15Moon size={64} />}
          copy={copy}
          searchCity={handleSearchCity}
          locale={locale}
        />
      </View>
    </SafeAreaView>
  )
}
