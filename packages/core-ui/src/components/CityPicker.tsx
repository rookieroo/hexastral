/**
 * CityPicker — debounced city search with offline top-cities fallback.
 *
 * Lifted from apps/hexastral-app/app/(birth)/city-picker.tsx so yuan-app,
 * feng-app, and other onboarding flows can reuse the same UX without each
 * re-implementing TextInput + debounce + results list.
 *
 * The component is **inline** (renders search input + results list in flow),
 * not a modal — embed inside a screen. Callers pass `search` to hit their
 * own API (typically `/api/geocode/search` via hexastral-client).
 */

import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  type ScrollView,
  type StyleProp,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native'
import { useTheme } from '../theme'

export interface CityRecord {
  /** Localized city name (e.g. "上海" or "Tokyo"). */
  name: string
  /** ISO 2-letter country code (e.g. "CN", "JP"). */
  country: string
  /** Decimal latitude. */
  lat: number
  /** Decimal longitude. */
  lng: number
  /** IANA timezone (e.g. "Asia/Shanghai") — null when unknown. */
  timezone?: string | null
  /** Full display name (e.g. "上海市, 中国") — optional, used in subtitle. */
  displayName?: string
}

export interface CityPickerProps {
  /** Current value (controlled). When set, search box shows this city name. */
  value?: CityRecord | null
  /** Called whenever the user taps a result. */
  onSelect: (city: CityRecord) => void
  /** Async search function — typically wraps GET /api/geocode/search. */
  search: (query: string) => Promise<CityRecord[]>
  /** Optional offline top-cities list — matched instantly before debounce fires. */
  topCities?: ReadonlyArray<CityRecord>
  /** Placeholder text for the input. */
  placeholder?: string
  /** Hint shown when there are no results yet. */
  noResultsLabel?: string
  /** Autofocus on mount. */
  autoFocus?: boolean
  /** Max results shown. Default 7. */
  limit?: number
  /** Debounce in ms before hitting `search`. Default 400. */
  debounceMs?: number
  /** Optional style override for the outer container. */
  style?: StyleProp<ViewStyle>
  /**
   * Host ScrollView ref. When provided, focusing the search input scrolls the
   * picker to the top of the visible area so the input + the results list sit
   * ABOVE the keyboard (2026-06 form-standards feedback: "City 录入自动调整
   * 位置到输入法上方"). Pair with `automaticallyAdjustKeyboardInsets` on the
   * host ScrollView.
   */
  scrollRef?: RefObject<ScrollView | null>
  /** Fired when the search input gains focus (runs alongside scrollRef handling). */
  onInputFocus?: () => void
}

export function CityPicker({
  value,
  onSelect,
  search,
  topCities,
  placeholder,
  noResultsLabel,
  autoFocus,
  limit = 7,
  debounceMs = 400,
  style,
  scrollRef,
  onInputFocus,
}: CityPickerProps) {
  const { colors, spacing } = useTheme()
  const [query, setQuery] = useState<string>(value?.name ?? '')
  const [results, setResults] = useState<CityRecord[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastApiQueryRef = useRef('')
  const rootRef = useRef<View>(null)

  // Keyboard positioning — when the input focuses, pin the picker to the top
  // of the host scroll view so the input + result rows stay above the keyboard.
  const handleInputFocus = useCallback(() => {
    onInputFocus?.()
    const scrollNode = scrollRef?.current
    const rootNode = rootRef.current
    if (!scrollNode || !rootNode) return
    rootNode.measureLayout(
      scrollNode.getInnerViewNode(),
      (_x: number, y: number) => scrollNode.scrollTo({ y: Math.max(0, y - 12), animated: true }),
      () => undefined
    )
  }, [onInputFocus, scrollRef])

  // Keep input in sync if `value` changes externally (e.g. draft hydration).
  // Listing `query` here would loop on every keystroke.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  useEffect(() => {
    if (value?.name && value.name !== query) {
      setQuery(value.name)
    }
  }, [value])

  const handleSearch = useCallback(
    (text: string) => {
      setQuery(text)
      if (timerRef.current) clearTimeout(timerRef.current)

      const trimmed = text.trim()
      if (trimmed.length < 1) {
        setResults([])
        setIsSearching(false)
        return
      }

      timerRef.current = setTimeout(async () => {
        const q = trimmed.toLowerCase()
        const localPool = topCities ?? []
        const local = localPool
          .filter((c) => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q))
          .sort((a, b) => {
            const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1
            const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1
            return aStarts - bStarts || a.name.localeCompare(b.name)
          })
          .slice(0, limit)

        setResults(local)

        // Hit the API fallback when local doesn't fill the list and we haven't
        // already queried for this exact term.
        if (trimmed.length >= 2 && local.length < 3 && lastApiQueryRef.current !== trimmed) {
          lastApiQueryRef.current = trimmed
          setIsSearching(true)
          try {
            const live = await search(trimmed)
            const seen = new Set(local.map((c) => c.name.toLowerCase()))
            const merged = [...local, ...live.filter((c) => !seen.has(c.name.toLowerCase()))]
            setResults(merged.slice(0, limit))
          } catch {
            // Silent — local results (if any) stay visible.
          } finally {
            setIsSearching(false)
          }
        }
      }, debounceMs)
    },
    [debounceMs, limit, search, topCities]
  )

  const handlePick = useCallback(
    (city: CityRecord) => {
      setResults([])
      setQuery(city.name)
      onSelect(city)
    },
    [onSelect]
  )

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    []
  )

  const showEmpty = query.trim().length > 1 && results.length === 0 && !isSearching

  return (
    <View ref={rootRef} collapsable={false} style={style}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 0.5,
          borderBottomColor: colors.separator,
          paddingVertical: spacing.md,
        }}
      >
        <TextInput
          value={query}
          onChangeText={handleSearch}
          placeholder={placeholder}
          placeholderTextColor={`${colors.secondary}88`}
          style={{
            flex: 1,
            fontSize: 16,
            fontWeight: '300',
            color: colors.text,
            padding: 0,
          }}
          autoFocus={autoFocus}
          autoCorrect={false}
          autoCapitalize='words'
          returnKeyType='search'
          onFocus={handleInputFocus}
        />
        {isSearching ? (
          <ActivityIndicator size='small' color={colors.secondary} style={{ marginLeft: 8 }} />
        ) : null}
      </View>

      {results.length > 0 ? (
        <View>
          {results.map((city, idx) => (
            <Pressable
              key={`${city.name}-${city.country}-${idx}`}
              onPress={() => handlePick(city)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.md,
                borderBottomWidth: 0.5,
                borderBottomColor: colors.separator,
                opacity: pressed ? 0.65 : 1,
              })}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '300', color: colors.text }}>
                  {city.name}
                </Text>
                {city.displayName && city.displayName !== city.name ? (
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '300',
                      color: colors.secondary,
                      marginTop: 2,
                    }}
                  >
                    {city.displayName}
                  </Text>
                ) : null}
              </View>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '300',
                  color: colors.secondary,
                  letterSpacing: 1,
                }}
              >
                {city.country}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {showEmpty && noResultsLabel ? (
        <Text
          style={{
            paddingTop: spacing.lg,
            fontSize: 13,
            fontWeight: '300',
            color: `${colors.secondary}88`,
          }}
        >
          {noResultsLabel}
        </Text>
      ) : null}
    </View>
  )
}

/**
 * Default top-cities list shared across HexAstral onboarding flows.
 * Apps can override via `topCities` prop with their own market-specific list.
 */
export const DEFAULT_TOP_CITIES: ReadonlyArray<CityRecord> = [
  { name: '北京', country: 'CN', lat: 39.9042, lng: 116.4074, timezone: 'Asia/Shanghai' },
  { name: '上海', country: 'CN', lat: 31.2304, lng: 121.4737, timezone: 'Asia/Shanghai' },
  { name: '广州', country: 'CN', lat: 23.1291, lng: 113.2644, timezone: 'Asia/Shanghai' },
  { name: '深圳', country: 'CN', lat: 22.5431, lng: 114.0579, timezone: 'Asia/Shanghai' },
  { name: '成都', country: 'CN', lat: 30.5728, lng: 104.0668, timezone: 'Asia/Shanghai' },
  { name: '武汉', country: 'CN', lat: 30.5928, lng: 114.3055, timezone: 'Asia/Shanghai' },
  { name: '西安', country: 'CN', lat: 34.3416, lng: 108.9398, timezone: 'Asia/Shanghai' },
  { name: '杭州', country: 'CN', lat: 30.2741, lng: 120.1551, timezone: 'Asia/Shanghai' },
  { name: '南京', country: 'CN', lat: 32.0603, lng: 118.7969, timezone: 'Asia/Shanghai' },
  { name: '重庆', country: 'CN', lat: 29.563, lng: 106.5516, timezone: 'Asia/Shanghai' },
  { name: '天津', country: 'CN', lat: 39.3434, lng: 117.3616, timezone: 'Asia/Shanghai' },
  { name: '长沙', country: 'CN', lat: 28.2278, lng: 112.9388, timezone: 'Asia/Shanghai' },
  { name: '青岛', country: 'CN', lat: 36.0671, lng: 120.3826, timezone: 'Asia/Shanghai' },
  { name: '香港', country: 'HK', lat: 22.3193, lng: 114.1694, timezone: 'Asia/Hong_Kong' },
  { name: '台北', country: 'TW', lat: 25.033, lng: 121.5654, timezone: 'Asia/Taipei' },
  { name: '新加坡', country: 'SG', lat: 1.3521, lng: 103.8198, timezone: 'Asia/Singapore' },
  { name: '首尔', country: 'KR', lat: 37.5665, lng: 126.978, timezone: 'Asia/Seoul' },
  { name: 'Tokyo', country: 'JP', lat: 35.6762, lng: 139.6503, timezone: 'Asia/Tokyo' },
  { name: 'Osaka', country: 'JP', lat: 34.6937, lng: 135.5023, timezone: 'Asia/Tokyo' },
  { name: 'New York', country: 'US', lat: 40.7128, lng: -74.006, timezone: 'America/New_York' },
  {
    name: 'Los Angeles',
    country: 'US',
    lat: 34.0522,
    lng: -118.2437,
    timezone: 'America/Los_Angeles',
  },
  {
    name: 'San Francisco',
    country: 'US',
    lat: 37.7749,
    lng: -122.4194,
    timezone: 'America/Los_Angeles',
  },
  { name: 'London', country: 'GB', lat: 51.5074, lng: -0.1278, timezone: 'Europe/London' },
  { name: 'Paris', country: 'FR', lat: 48.8566, lng: 2.3522, timezone: 'Europe/Paris' },
  { name: 'Sydney', country: 'AU', lat: -33.8688, lng: 151.2093, timezone: 'Australia/Sydney' },
  { name: 'Toronto', country: 'CA', lat: 43.6532, lng: -79.3832, timezone: 'America/Toronto' },
]
