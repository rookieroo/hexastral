/**
 * Birth onboarding — unified `<BirthInfoForm>` host (Phase J.2.1).
 *
 * Replaces the 5 separate step files (date / time / gender / place / review)
 * + the inline city-picker screen with a single screen that mounts the
 * shared core-ui form. Existing entry contract preserved: external callers
 * still navigate to `/birth-info` (intro screen); intro's "Tap to start"
 * routes here.
 *
 * Submit handler is ported from the old `birth-review.tsx`:
 *   - free-plan guard (regenerating the chart is Pro-only),
 *   - local `saveBirthInfo` cache write,
 *   - server-side PUT for authed users,
 *   - chart-warming bootstrap POST,
 *   - draft clear + route to home.
 */

import { BirthInfoForm, type BirthInfoValue, type CityRecord, useTheme } from '@zhop/core-ui'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { Alert } from 'react-native'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { type BirthDraft, clearBirthDraft, updateBirthDraft, useBirthDraft } from '@/lib/birthDraft'
import { saveBirthInfo } from '@/lib/domain/birthInfo'
import { checkSubscriptionStatus } from '@/lib/domain/subscription'
import { useI18n } from '@/lib/i18n'
import { searchCity } from '@/lib/ux/geocode'

const SEARCH_LIMIT = 7

export default function BirthFormScreen() {
  const router = useRouter()
  const { t, locale } = useI18n()
  const { colors } = useTheme()
  const { userId } = useAuth()
  const draft = useBirthDraft()

  // The shared form expects a single `value` and `onChange` shape. We bridge
  // those into hexastral-app's existing BirthDraft store so the rest of the
  // app's read paths (history, review-edit, etc.) keep working unchanged.
  const value: Partial<BirthInfoValue> = {
    solarDate: draft.solarDate || undefined,
    timeIndex:
      typeof draft.timeIndex === 'number' && draft.timeIndex >= 0 && draft.timeIndex <= 11
        ? (draft.timeIndex as BirthInfoValue['timeIndex'])
        : null,
    gender: draft.gender ?? undefined,
    city: draft.birthCity || undefined,
    lat: draft.latitude ?? undefined,
    lng: draft.longitude ?? undefined,
    timezone: draft.timezoneId ?? undefined,
  }

  const handleChange = (next: Partial<BirthInfoValue>) => {
    const patch: Partial<BirthDraft> = {}
    if (next.solarDate !== undefined) patch.solarDate = next.solarDate
    if (next.timeIndex !== undefined) patch.timeIndex = next.timeIndex
    if (next.gender !== undefined) patch.gender = next.gender
    if (next.city !== undefined) patch.birthCity = next.city
    if (next.lat !== undefined) patch.latitude = next.lat
    if (next.lng !== undefined) patch.longitude = next.lng
    if (next.timezone !== undefined) patch.timezoneId = next.timezone
    updateBirthDraft(patch)
  }

  // Adapt hexastral-app's `searchCity` (GeocodedCity with `lon`) to the
  // shared CityPicker shape (CityRecord with `lng`).
  const handleSearchCity = async (query: string): Promise<CityRecord[]> => {
    const hits = await searchCity(query, locale, SEARCH_LIMIT)
    return hits.map((h) => ({
      name: h.name,
      country: h.countryCode,
      lat: h.lat,
      lng: h.lon,
      timezone: h.timezone,
      displayName: h.displayName,
    }))
  }

  const handleSubmit = async (final: BirthInfoValue) => {
    // Free-plan guard mirrors the legacy birth-review flow.
    const sub = await checkSubscriptionStatus().catch(() => ({ isSubscribed: true }))
    if (!sub.isSubscribed) {
      Alert.alert(t('birth_change_gate_title'), t('birth_change_gate_desc'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('paywall_upgrade'), onPress: () => router.push('/paywall') },
      ])
      return
    }

    await saveBirthInfo({
      solarDate: final.solarDate,
      birthYear: final.solarDate.split('-')[0],
      timeIndex: final.timeIndex ?? undefined,
      gender: final.gender,
      birthCity: final.city,
      latitude: final.lat,
      longitude: final.lng,
      timezoneId: final.timezone,
    })

    // Sync to server. Authed real users only — guests stay local.
    if (userId && !userId.startsWith('guest_')) {
      const put = await apiClient.api.user[':userId']['birth-info'].$put({
        param: { userId },
        json: {
          birthSolarDate: final.solarDate,
          birthTimeIndex: final.timeIndex ?? 6,
          birthGender: final.gender,
          birthCity: final.city,
          birthLongitude: String(final.lng),
          birthLatitude: String(final.lat),
          birthTimezoneId: final.timezone,
        },
      })
      if (!put.ok && __DEV__) {
        console.warn('[birth-form] PUT failed', put.status, await put.text())
      }

      // Warm the chart synchronously so home → hero shows real data.
      await apiClient.api.onboarding.bootstrap
        .$post({ json: { explanationMode: 'plain' } })
        .catch((err) => {
          if (__DEV__) console.warn('[birth-form] bootstrap threw', err)
        })
    }

    await clearBirthDraft()
    router.replace('/(tabs)' as never)
  }

  // Skip rendering until hydration completes (draft store seeds from server
  // birth info in the intro screen; we just consume whatever's there).
  useEffect(() => {
    // No-op — the form fully drives itself once mounted.
  }, [])

  const copy = {
    dateTitle: t('birth_conv_date_title'),
    dateSolarLabel: 'Solar',
    dateLunarLabel: 'Lunar',
    timeTitle: t('birth_conv_time_title'),
    timeSubtitle: t('birth_conv_time_subtitle'),
    timeSkipLabel: t('birth_conv_time_skip'),
    genderTitle: t('birth_conv_gender_title'),
    genderSubtitle: t('birth_conv_gender_subtitle'),
    genderMale: t('birth_conv_gender_male'),
    genderFemale: t('birth_conv_gender_female'),
    placeTitle: t('birth_conv_place_title'),
    placeSearchPlaceholder: t('birth_conv_place_search_placeholder'),
    reviewTitle: t('birth_conv_review_title'),
    reviewLabels: {
      solarDate: t('birth_conv_date_title'),
      lunarDate: 'Lunar',
      timeIndex: t('birth_conv_time_title'),
      gender: t('birth_conv_gender_title'),
      city: t('birth_conv_place_title'),
    },
    reviewTimeUnknown: t('birth_conv_time_unknown'),
    reviewSubmit: t('birth_conv_review_submit'),
    reviewSubmitLoading: t('fate_hero_generating'),
    reviewEditCue: 'edit',
    next: t('birth_conv_next'),
  }

  return (
    <BirthInfoForm
      value={value}
      onChange={handleChange}
      onSubmit={handleSubmit}
      accent={colors.text}
      copy={copy}
      searchCity={handleSearchCity}
      locale={locale}
    />
  )
}
