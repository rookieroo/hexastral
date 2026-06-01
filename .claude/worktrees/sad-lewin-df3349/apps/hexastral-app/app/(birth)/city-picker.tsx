/**
 * City Picker — standalone birth place search modal
 *
 * Route: /city-picker (pushed from Settings › Birth Place)
 * On confirm: saves birthCity/lat/lng to AsyncStorage and pops back.
 * Search strategy: local TOP_CITIES instant match + svc-geocode API fallback.
 */

import { useRouter } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { useCallback, useRef, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { getBirthInfo, saveBirthInfo } from '@/lib/domain/birthInfo'
import { checkSubscriptionStatus } from '@/lib/domain/subscription'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { searchCity } from '@/lib/ux/geocode'

interface CityResult {
  name: string
  country: string
  lat: number
  lng: number
  timezone?: string | null
}

// Top 30 cities — instant offline fallback (major cities worldwide)
const TOP_CITIES: CityResult[] = [
  { name: '北京', country: 'CN', lat: 39.9042, lng: 116.4074 },
  { name: '上海', country: 'CN', lat: 31.2304, lng: 121.4737 },
  { name: '广州', country: 'CN', lat: 23.1291, lng: 113.2644 },
  { name: '深圳', country: 'CN', lat: 22.5431, lng: 114.0579 },
  { name: '成都', country: 'CN', lat: 30.5728, lng: 104.0668 },
  { name: '武汉', country: 'CN', lat: 30.5928, lng: 114.3055 },
  { name: '西安', country: 'CN', lat: 34.3416, lng: 108.9398 },
  { name: '杭州', country: 'CN', lat: 30.2741, lng: 120.1551 },
  { name: '南京', country: 'CN', lat: 32.0603, lng: 118.7969 },
  { name: '重庆', country: 'CN', lat: 29.563, lng: 106.5516 },
  { name: '天津', country: 'CN', lat: 39.3434, lng: 117.3616 },
  { name: '沈阳', country: 'CN', lat: 41.8057, lng: 123.4315 },
  { name: '哈尔滨', country: 'CN', lat: 45.8038, lng: 126.5349 },
  { name: '长沙', country: 'CN', lat: 28.2278, lng: 112.9388 },
  { name: '郑州', country: 'CN', lat: 34.7474, lng: 113.6253 },
  { name: '青岛', country: 'CN', lat: 36.0671, lng: 120.3826 },
  { name: '乌鲁木齐', country: 'CN', lat: 43.8256, lng: 87.6168 },
  { name: '香港', country: 'HK', lat: 22.3193, lng: 114.1694 },
  { name: '澳门', country: 'MO', lat: 22.1987, lng: 113.5439 },
  { name: '台北', country: 'TW', lat: 25.033, lng: 121.5654 },
  { name: '新加坡', country: 'SG', lat: 1.3521, lng: 103.8198 },
  { name: '首尔', country: 'KR', lat: 37.5665, lng: 126.978 },
  { name: 'Tokyo', country: 'JP', lat: 35.6762, lng: 139.6503 },
  { name: 'New York', country: 'US', lat: 40.7128, lng: -74.006 },
  { name: 'Los Angeles', country: 'US', lat: 34.0522, lng: -118.2437 },
  { name: 'London', country: 'GB', lat: 51.5074, lng: -0.1278 },
  { name: 'Paris', country: 'FR', lat: 48.8566, lng: 2.3522 },
  { name: 'Sydney', country: 'AU', lat: -33.8688, lng: 151.2093 },
  { name: 'Toronto', country: 'CA', lat: 43.6532, lng: -79.3832 },
  { name: 'Dubai', country: 'AE', lat: 25.2048, lng: 55.2708 },
]

export default function CityPickerScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const { t } = useI18n()
  const { userId } = useAuth()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CityResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastApiQueryRef = useRef('')

  const handleSearch = useCallback((text: string) => {
    setQuery(text)

    if (timerRef.current) clearTimeout(timerRef.current)

    const trimmed = text.trim()
    if (trimmed.length < 1) {
      setResults([])
      setIsSearching(false)
      return
    }

    // Unified debounce: local + API in one timer at 400ms to avoid excessive renders
    timerRef.current = setTimeout(async () => {
      const q = trimmed.toLowerCase()
      const local = TOP_CITIES.filter(
        (c) => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
      )
        .sort((a, b) => {
          const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1
          const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1
          return aStarts - bStarts || a.name.localeCompare(b.name)
        })
        .slice(0, 7)

      setResults(local)

      // API fallback: only when local hits < 3 and query changed
      if (trimmed.length >= 2 && local.length < 3 && lastApiQueryRef.current !== trimmed) {
        lastApiQueryRef.current = trimmed
        setIsSearching(true)
        try {
          const geocoded = await searchCity(trimmed, 'zh-CN', 7)
          const live: CityResult[] = geocoded.map((g) => ({
            name: g.name,
            country: g.countryCode,
            lat: g.lat,
            lng: g.lon,
            timezone: g.timezone,
          }))
          const seen = new Set(local.map((c) => c.name.toLowerCase()))
          setResults([...local, ...live.filter((c) => !seen.has(c.name.toLowerCase()))].slice(0, 7))
        } catch {
          // silent — local results already visible
        } finally {
          setIsSearching(false)
        }
      }
    }, 400)
  }, [])

  // Tap a city → save + go back immediately (single-tap UX)
  const handleSelect = useCallback(
    async (city: CityResult) => {
      // Gate: free users cannot change birth info (triggers full chart regeneration)
      const { isSubscribed } = await checkSubscriptionStatus()
      if (!isSubscribed) {
        Alert.alert(t('birth_change_gate_title'), t('birth_change_gate_desc'), [
          { text: t('cancel'), style: 'cancel' },
          { text: t('paywall_upgrade'), onPress: () => router.push('/paywall') },
        ])
        return
      }
      setResults([])
      setQuery(city.name)
      await saveBirthInfo({
        birthCity: city.name,
        latitude: city.lat,
        longitude: city.lng,
        timezoneId: city.timezone ?? undefined,
      })
      // Sync to server — fire-and-forget
      if (userId && !userId.startsWith('guest_')) {
        const info = await getBirthInfo()
        if (info.solarDate && info.timeIndex != null) {
          apiClient.api.user[':userId']['birth-info']
            .$put({
              param: { userId },
              json: {
                birthSolarDate: info.solarDate,
                birthTimeIndex: info.timeIndex,
                birthGender: (info.gender ?? '男') as '男' | '女',
                birthCity: city.name,
                birthLongitude: String(city.lng),
                birthLatitude: String(city.lat),
                birthTimezoneId: city.timezone ?? undefined,
              },
            })
            .catch(() => {}) // non-blocking
        }
      }
      router.back()
    },
    [router, userId, t]
  )

  const showEmpty = query.trim().length > 1 && results.length === 0 && !isSearching

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={20} color={colors.text} strokeWidth={1.5} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 13,
            fontWeight: '400',
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: colors.text,
          }}
        >
          {t('settings_birth_place')}
        </Text>
        <View style={{ width: 20 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Search input */}
        <View
          style={{
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 14,
          }}
        >
          <TextInput
            value={query}
            onChangeText={handleSearch}
            placeholder={t('ob_city_search_ph')}
            placeholderTextColor={`${colors.textSecondary}88`}
            style={{
              flex: 1,
              fontSize: 16,
              fontWeight: '300',
              color: colors.text,
              padding: 0,
            }}
            autoFocus
            autoCorrect={false}
            autoCapitalize='words'
            returnKeyType='search'
          />
          {isSearching && (
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginLeft: 8 }}>…</Text>
          )}
        </View>

        {/* Results — single tap saves and navigates back */}
        {results.length > 0 && (
          <View>
            {results.map((city, idx) => (
              <TouchableOpacity
                key={`${city.name}-${city.country}-${idx}`}
                onPress={() => handleSelect(city)}
                activeOpacity={0.65}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  paddingVertical: 15,
                  borderBottomWidth: 0.5,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '300', color: colors.text }}>
                  {city.name}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '300',
                    color: colors.textSecondary,
                    letterSpacing: 1,
                  }}
                >
                  {city.country}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {showEmpty && (
          <Text
            style={{
              paddingHorizontal: 20,
              paddingTop: 20,
              fontSize: 13,
              fontWeight: '300',
              color: `${colors.textSecondary}88`,
              letterSpacing: 0.5,
            }}
          >
            {t('ob_city_no_results')}
          </Text>
        )}

        {/* Hint */}
        <Text
          style={{
            paddingHorizontal: 20,
            paddingTop: results.length > 0 ? 12 : 20,
            fontSize: 11,
            fontWeight: '300',
            color: `${colors.textSecondary}66`,
            letterSpacing: 0.5,
          }}
        >
          {t('ob_city_note')}
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
