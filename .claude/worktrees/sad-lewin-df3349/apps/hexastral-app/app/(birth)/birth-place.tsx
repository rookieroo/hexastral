/**
 * Birth onboarding · Step 4 — Place (city)
 *
 * Text input + debounced live `searchCity` results. Picks lat/lng + IANA
 * timezone (required for true-solar-time correction in `chart-skeleton`).
 * Locale-aware suggestions for the empty state, mirroring yuan-app.
 */

import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ProgressIndicator } from '@/components/onboarding/ProgressIndicator'
import { updateBirthDraft, useBirthDraft } from '@/lib/birthDraft'
import { useI18n } from '@/lib/i18n'
import { useIosPalette } from '@/lib/theme'
import { searchCity } from '@/lib/ux/geocode'

interface CityHit {
  name: string
  lat: number
  lon: number
  timezone?: string | null
  countryCode?: string
}

const SUGGESTED: Record<string, ReadonlyArray<string>> = {
  en: ['New York', 'San Francisco', 'London'],
  zh: ['北京', '上海', '广州'],
  'zh-Hant': ['台北', '香港', '新加坡'],
  ja: ['東京', '大阪', '京都'],
}

export default function BirthPlaceScreen() {
  const router = useRouter()
  const { t, locale } = useI18n()
  const ios = useIosPalette()
  const draft = useBirthDraft()

  const [query, setQuery] = useState<string>(draft.birthCity || '')
  const [results, setResults] = useState<CityHit[]>([])
  const [picked, setPicked] = useState<CityHit | null>(
    draft.birthCity && draft.latitude != null && draft.longitude != null
      ? {
          name: draft.birthCity,
          lat: draft.latitude,
          lon: draft.longitude,
          timezone: draft.timezoneId,
        }
      : null
  )
  const [busy, setBusy] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const suggestions = SUGGESTED[locale] ?? SUGGESTED.en

  const onChange = useCallback(
    (text: string) => {
      setQuery(text)
      setPicked(null)
      if (debounce.current) clearTimeout(debounce.current)
      if (text.trim().length < 2) {
        setResults([])
        return
      }
      setBusy(true)
      debounce.current = setTimeout(async () => {
        try {
          const hits = await searchCity(text.trim(), locale, 7)
          setResults(
            hits.map((h) => ({
              name: h.name,
              lat: h.lat,
              lon: h.lon,
              timezone: h.timezone ?? null,
              countryCode: h.countryCode,
            }))
          )
        } catch {
          /* silent */
        } finally {
          setBusy(false)
        }
      }, 300)
    },
    [locale]
  )

  const pick = (hit: CityHit) => {
    Haptics.selectionAsync()
    setPicked(hit)
    setQuery(hit.name)
    setResults([])
  }

  const handleNext = () => {
    if (!picked) return
    Haptics.selectionAsync()
    updateBirthDraft({
      birthCity: picked.name,
      latitude: picked.lat,
      longitude: picked.lon,
      timezoneId: picked.timezone ?? null,
    })
    router.push('/birth-review')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <ProgressIndicator step={4} total={5} />
          <View style={{ height: 28 }} />
          <Text style={{ color: ios.text, fontSize: 26, fontWeight: '500', letterSpacing: 0.4 }}>
            {t('birth_conv_place_title')}
          </Text>
          <View style={{ height: 24 }} />

          <TextInput
            value={query}
            onChangeText={onChange}
            autoFocus
            placeholder={t('birth_conv_place_search_placeholder')}
            placeholderTextColor={ios.secondary}
            style={{
              fontSize: 18,
              color: ios.text,
              borderBottomWidth: 0.5,
              borderBottomColor: ios.separator,
              paddingVertical: 12,
            }}
            returnKeyType="search"
          />

          {results.length > 0 ? (
            <View style={{ marginTop: 12 }}>
              {results.map((r) => (
                <Pressable
                  key={`${r.name}-${r.lat}-${r.lon}`}
                  onPress={() => pick(r)}
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 0.5,
                    borderBottomColor: ios.separator,
                  }}
                >
                  <Text style={{ color: ios.text, fontSize: 15, fontWeight: '400' }}>{r.name}</Text>
                  {r.countryCode ? (
                    <Text style={{ color: ios.secondary, fontSize: 11, marginTop: 2 }}>
                      {r.countryCode}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : query.length < 2 ? (
            <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {suggestions.map((s) => (
                <Pressable key={s} onPress={() => onChange(s)} hitSlop={6}>
                  <Text style={{ color: ios.secondary, fontSize: 13 }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          ) : busy ? (
            <Text style={{ color: ios.secondary, fontSize: 13, marginTop: 16 }}>…</Text>
          ) : null}

          <View style={{ flex: 1, minHeight: 24 }} />

          <Pressable
            onPress={handleNext}
            disabled={!picked}
            hitSlop={12}
            style={{
              alignSelf: 'flex-end',
              paddingVertical: 12,
              opacity: picked ? 1 : 0.3,
            }}
          >
            <Text
              style={{
                color: ios.text,
                fontSize: 14,
                fontWeight: '500',
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              {t('birth_conv_next')}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
