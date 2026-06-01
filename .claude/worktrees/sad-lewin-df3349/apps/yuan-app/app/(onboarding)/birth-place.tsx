/**
 * Onboarding · Screen 5 — Your birth place
 *
 * Text input + 3 suggested cities (IP geo would be a nice-to-have).
 * Backend geocoder runs on /api/geocode/search; for v0 we just store the
 * free-text city and let the server resolve coordinates server-side.
 */

import { useMemo, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { yuanLight, yuanType, yuanSpacing, yuanPresets } from '@zhop/hexastral-tokens/yuan'
import { ProgressIndicator } from '@/components/ProgressIndicator'
import { resolveLocale, t } from '@/lib/i18n'
import { useDraft, updateDraft } from '@/lib/onboardingDraft'

const SUGGESTED_CITIES: Record<string, ReadonlyArray<string>> = {
  en: ['New York', 'San Francisco', 'London'],
  zh: ['北京', '上海', '广州'],
  'zh-Hant': ['台北', '香港', '新加坡'],
  ja: ['東京', '大阪', '京都'],
}

export default function BirthPlaceScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const draft = useDraft()
  const [city, setCity] = useState<string>(draft.selfBirthCity)
  const canContinue = city.trim().length >= 1
  const suggestions = SUGGESTED_CITIES[locale] ?? SUGGESTED_CITIES.en

  const handleNext = () => {
    if (!canContinue) return
    updateDraft({ selfBirthCity: city.trim() })
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
        <TextInput
          value={city}
          onChangeText={setCity}
          autoFocus
          style={{
            fontSize: yuanType.heading.fontSize,
            color: yuanLight.text,
            borderBottomWidth: 0.5,
            borderBottomColor: yuanLight.border,
            paddingVertical: yuanSpacing.md,
          }}
          returnKeyType="next"
          onSubmitEditing={handleNext}
        />
        <View style={{ height: yuanSpacing.lg, flexDirection: 'row', gap: yuanSpacing.md, flexWrap: 'wrap' }}>
          {suggestions.map((s) => (
            <Pressable key={s} onPress={() => setCity(s)} hitSlop={6}>
              <Text style={[yuanType.caption, { color: yuanLight.textSecondary }]}>{s}</Text>
            </Pressable>
          ))}
        </View>
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
