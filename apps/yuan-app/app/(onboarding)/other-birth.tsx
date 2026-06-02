/**
 * Onboarding · Their birth info.
 *
 * Mounts core-ui's `<BirthInfoForm>` bound to the draft's other* fields, with
 * `skipSteps={['review']}` so submitting the last step routes straight to
 * /reveal — no double-review. Reveal then runs the solo create + ceremony.
 */

import {
  BirthInfoForm,
  type BirthInfoValue,
  birthInfoCopyForLocale,
  type CityRecord,
} from '@zhop/core-ui'
import { yuanDark } from '@zhop/hexastral-tokens/yuan'
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

export default function OtherBirthScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const draft = useDraft()
  const lang = useMemo(() => localeToLang(locale), [locale])
  const copy = useMemo(() => birthInfoCopyForLocale(locale), [locale])

  const value: Partial<BirthInfoValue> = {
    solarDate: draft.otherSolarDate || undefined,
    timeIndex:
      typeof draft.otherTimeIndex === 'number' &&
      draft.otherTimeIndex >= 0 &&
      draft.otherTimeIndex <= 11
        ? (draft.otherTimeIndex as BirthInfoValue['timeIndex'])
        : null,
    gender: draft.otherGender ?? undefined,
    city: draft.otherBirthCity || undefined,
    lat: draft.otherBirthLat ?? undefined,
    lng: draft.otherBirthLng ?? undefined,
    timezone: draft.otherBirthTimezone ?? undefined,
  }

  const handleChange = (next: Partial<BirthInfoValue>) => {
    const patch: Partial<OnboardingDraft> = {}
    if (next.solarDate !== undefined) patch.otherSolarDate = next.solarDate
    if (next.timeIndex !== undefined) patch.otherTimeIndex = next.timeIndex
    if (next.gender !== undefined) patch.otherGender = next.gender
    if (next.city !== undefined) patch.otherBirthCity = next.city
    if (next.lat !== undefined) patch.otherBirthLat = next.lat
    if (next.lng !== undefined) patch.otherBirthLng = next.lng
    if (next.timezone !== undefined) patch.otherBirthTimezone = next.timezone
    updateDraft(patch)
  }

  const handleSearchCity = async (query: string): Promise<CityRecord[]> =>
    searchCityApi(query, lang, 7)

  const handleSubmit = async () => {
    updateDraft({ otherMode: 'fill' })
    router.push('/(onboarding)/reveal')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: yuanDark.bg }}>
      <View style={{ flex: 1 }}>
        <BirthInfoForm
          value={value}
          onChange={handleChange}
          onSubmit={handleSubmit}
          accent={yuanDark.accent}
          copy={copy}
          searchCity={handleSearchCity}
          locale={locale}
          skipSteps={['review']}
        />
      </View>
    </SafeAreaView>
  )
}
