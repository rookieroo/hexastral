/**
 * Onboarding · Screen 5 — Your birth place
 *
 * Debounced city search via /api/geocode/search (svc-geocode → offline DB +
 * Nominatim fallback). Resolved lat/lng/timezone are persisted to the draft
 * so backend chart compute can do 真太阳时 correction without re-geocoding.
 *
 * V0 stored only the free-text city name; this is the Y3 fix per
 * docs/ROADMAP.md Phase H plan (CityPicker rollout).
 */

import { CityPicker, type CityRecord, DEFAULT_TOP_CITIES } from '@zhop/core-ui'
import { yuanLight, yuanPresets, yuanSpacing, yuanType } from '@zhop/hexastral-tokens/yuan'
import { useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
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

export default function BirthPlaceScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const draft = useDraft()
  const lang = useMemo(() => localeToLang(locale), [locale])

  const [picked, setPicked] = useState<CityRecord | null>(() =>
    draft.selfBirthCity
      ? {
          name: draft.selfBirthCity,
          country: '',
          lat: draft.selfBirthLat ?? 0,
          lng: draft.selfBirthLng ?? 0,
          timezone: draft.selfBirthTimezone,
        }
      : null
  )

  const canContinue = picked !== null && picked.name.trim().length > 0

  const handleSearch = useCallback((q: string) => searchCity(q, lang, 7), [lang])

  const handleSelect = useCallback((city: CityRecord) => {
    setPicked(city)
    updateDraft({
      selfBirthCity: city.name,
      selfBirthLat: Number.isFinite(city.lat) ? city.lat : null,
      selfBirthLng: Number.isFinite(city.lng) ? city.lng : null,
      selfBirthTimezone: city.timezone ?? null,
    })
  }, [])

  const handleNext = () => {
    if (!canContinue) return
    router.push('/(onboarding)/mode')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: yuanLight.bg }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: yuanSpacing.screenH,
          paddingTop: yuanSpacing.xl,
        }}
      >
        <ProgressIndicator step={4} total={6} />
        <View style={{ height: yuanSpacing.xxl }} />
        <Text style={[yuanType.title, { color: yuanLight.text }]}>{t(locale, 'place.title')}</Text>
        <View style={{ height: yuanSpacing.xl }} />

        <CityPicker
          value={picked}
          onSelect={handleSelect}
          search={handleSearch}
          topCities={DEFAULT_TOP_CITIES}
          placeholder={t(locale, 'place.title')}
          noResultsLabel={t(locale, 'common.next')}
          autoFocus
        />

        <View style={{ flex: 1 }} />
        <Pressable
          onPress={handleNext}
          disabled={!canContinue}
          hitSlop={12}
          style={{ alignSelf: 'flex-end', opacity: canContinue ? 1 : 0.3 }}
        >
          <Text style={yuanPresets.ctaText}>{t(locale, 'common.next')}</Text>
        </Pressable>
        <View style={{ height: yuanSpacing.xxl }} />
      </View>
    </SafeAreaView>
  )
}
