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
 * navigates internally between steps; we only handle the terminal submit.
 *
 * Submit forks on onboarding state (ADR-0021 solo-first):
 *  - First run → persist self birth, complete onboarding, land on /(reading)
 *    (the solo 八字紫微 report — no partner required)
 *  - Re-entered later (Threads "+" / edit birth) → persist + on to the mode
 *    picker, the partner flow unchanged
 *
 * V15Moon is rendered as the form's crown so the brand anchor is visible
 * throughout the wizard (matches the home header + HomeSplash logo).
 */

import { BirthInfoForm, type BirthInfoValue, type CityRecord } from '@zhop/core-ui'
import { kindredDark } from '@zhop/hexastral-tokens/kindred'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { KindredMoon } from '@/components/KindredMoon'
import { useAuth } from '@/lib/auth'
import { kindredBirthCopy } from '@/lib/birthInfoCopy'
import { searchCity as searchCityApi } from '@/lib/geocode'
import { resolveLocale } from '@/lib/i18n'
import { type OnboardingDraft, updateDraft, useDraft } from '@/lib/onboardingDraft'
import { saveSelfBirth, syncSelfBirthToServer } from '@/lib/selfBirth'
import { suppressNextSplash } from '@/lib/splash-control'
import { isOnboardingComplete, markOnboardingComplete } from '../index'

function localeToLang(loc: string): string {
  if (loc === 'en') return 'en-US'
  if (loc === 'ja') return 'ja-JP'
  if (loc === 'zh-Hant') return 'zh-TW'
  return 'zh-CN'
}

export default function SelfBirthScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const { userId } = useAuth()
  const draft = useDraft()
  const lang = useMemo(() => localeToLang(locale), [locale])
  // Kindred reads the hour pillar, so timeIndex is mandatory; the city is
  // optional but improves 真太阳时 accuracy of the hour stem/branch. Override
  // the shared copy's hint lines so the user knows which fields matter.
  const copy = useMemo(() => kindredBirthCopy(locale), [locale])

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
    // Persist self birth — the solo reading computes from this for the life
    // of the install (the onboarding draft gets cleared, this doesn't).
    if (draft.selfSolarDate && draft.selfGender) {
      const birth = {
        solarDate: draft.selfSolarDate,
        timeIndex: draft.selfTimeIndex,
        gender: draft.selfGender,
        city: draft.selfBirthCity || undefined,
        lat: draft.selfBirthLat ?? undefined,
        lng: draft.selfBirthLng ?? undefined,
        timezone: draft.selfBirthTimezone ?? undefined,
      }
      await saveSelfBirth(birth)
      // Server sync (K2) — the bonds API reads person A's birth from the users
      // table; fire-and-forget here, Threads re-attempts before bond creation.
      if (userId) void syncSelfBirthToServer(userId, birth)
    }

    // First run: solo-first (ADR-0021) — straight to the reading, no partner gate.
    if (!(await isOnboardingComplete())) {
      await markOnboardingComplete()
      suppressNextSplash()
      router.replace('/(reading)')
      return
    }

    // Re-entered from Threads "+" — continue to the partner flow.
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
          crown={<KindredMoon size={64} />}
          copy={copy}
          searchCity={handleSearchCity}
          locale={locale}
          requireTime
          placeOptional
        />
      </View>
    </SafeAreaView>
  )
}
