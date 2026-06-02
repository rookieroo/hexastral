import * as Haptics from 'expo-haptics'
import { useCallback, useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import type { CityOption } from '@/lib/data/worldCities'
import { WORLD_CITIES } from '@/lib/data/worldCities'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { searchCity } from '@/lib/ux/geocode'
import { CTAButton, SkipLink } from './OnboardingChrome'
import { onboardingStyles as ob } from './styles'

export function BirthCityStep({
  onNext,
  selectedCity,
  setSelectedCity,
}: {
  onNext: () => void
  selectedCity: CityOption | null
  setSelectedCity: (c: CityOption | null) => void
}) {
  const { t } = useI18n()
  const { colors, isDark } = useTheme()
  const [query, setQuery] = useState(selectedCity?.name ?? '')
  const [results, setResults] = useState<CityOption[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const liveSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearch = useCallback(
    (text: string) => {
      setQuery(text)
      setSelectedCity(null)

      if (liveSearchTimer.current) clearTimeout(liveSearchTimer.current)

      if (text.trim().length < 1) {
        setResults([])
        setIsSearching(false)
        return
      }

      const q = text.toLowerCase()

      // 1. Instant local match from static bundle
      const local = WORLD_CITIES.filter(
        (c) => c.name.toLowerCase().startsWith(q) || c.name.toLowerCase().includes(q)
      )
        .sort((a, b) => {
          const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1
          const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1
          return aStarts - bStarts || a.name.localeCompare(b.name)
        })
        .slice(0, 7)

      setResults(local)

      // 2. Live fallback via hexastral-api → svc-geocode when local returns < 3 hits
      if (text.trim().length >= 2 && local.length < 3) {
        setIsSearching(true)
        liveSearchTimer.current = setTimeout(async () => {
          try {
            const geocoded = await searchCity(text.trim(), 'zh-CN', 7)
            const live: CityOption[] = geocoded.map((g) => ({
              name: g.name,
              country: g.countryCode,
              lat: g.lat,
              lng: g.lon,
              timezone: g.timezone,
            }))
            // Merge: local results first (if any), then live, deduplicate by name
            const seen = new Set(local.map((c) => c.name.toLowerCase()))
            const merged = [...local, ...live.filter((c) => !seen.has(c.name.toLowerCase()))].slice(
              0,
              7
            )
            setResults(merged)
          } catch (e) {
            if (__DEV__) console.warn('[onboarding] city search live failed:', e)
          } finally {
            setIsSearching(false)
          }
        }, 350)
      }
    },
    [setSelectedCity]
  )

  const handleSelect = useCallback(
    (city: CityOption) => {
      setQuery(city.name)
      setSelectedCity(city)
      setResults([])
      Haptics.selectionAsync()
    },
    [setSelectedCity]
  )

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[ob.stepWrap, { backgroundColor: colors.background }]}>
        <View style={ob.stepHeader}>
          <Text style={[ob.stepQuestion, { color: colors.text }]}>{t('ob_city_q')}</Text>
          <Text style={[ob.stepHint, { color: colors.textSecondary }]}>{t('ob_city_hint')}</Text>
        </View>

        {/* Search input */}
        <View
          style={[
            ob.citySearchBox,
            {
              borderBottomColor: selectedCity ? colors.primary : colors.border,
            },
          ]}
        >
          <TextInput
            value={query}
            onChangeText={handleSearch}
            placeholder={t('ob_city_search_ph')}
            placeholderTextColor={`${colors.textSecondary}88`}
            style={[ob.citySearchInput, { color: colors.text }]}
            autoCorrect={false}
            autoCapitalize='words'
            returnKeyType='search'
          />
          {selectedCity && <Text style={[ob.citySelectedBadge, { color: colors.primary }]}>✓</Text>}
          {isSearching && !selectedCity && (
            <Text style={[ob.citySelectedBadge, { color: colors.textSecondary }]}>…</Text>
          )}
        </View>

        {/* Results list */}
        {results.length > 0 && (
          <View style={[ob.cityResultsWrap, { borderColor: colors.border }]}>
            {results.map((city, idx) => (
              <TouchableOpacity
                key={`${city.name}-${city.country}-${idx}`}
                onPress={() => handleSelect(city)}
                style={[ob.cityResultRow, { borderBottomColor: colors.border }]}
                activeOpacity={0.65}
              >
                <Text style={[ob.cityResultName, { color: colors.text }]}>{city.name}</Text>
                <Text style={[ob.cityResultCountry, { color: colors.textSecondary }]}>
                  {city.country}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {query.length > 1 && !selectedCity && results.length === 0 && !isSearching && (
          <Text style={[ob.cityNoResults, { color: `${colors.textSecondary}88` }]}>
            {t('ob_city_no_results')}
          </Text>
        )}

        <View style={ob.stepFooter}>
          <Text style={[ob.cityNote, { color: `${colors.textSecondary}BB` }]}>
            {t('ob_city_note')}
          </Text>
          <CTAButton
            label={t('ob_continue')}
            onPress={onNext}
            disabled={!selectedCity}
            dark={isDark}
          />
          <SkipLink onPress={onNext} label={t('ob_city_skip')} dark={isDark} />
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

// ─── Step: BRIDGE ─────────────────────────────────────────────────────────────
