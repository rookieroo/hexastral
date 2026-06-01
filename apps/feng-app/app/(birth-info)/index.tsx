/**
 * In-app birth info — date, shichen, gender, birth city (geocoded).
 * Persists via PUT /api/portfolio/birth-info (HMAC).
 */

import DateTimePicker from '@react-native-community/datetimepicker'
import { Button, Card, useTheme } from '@zhop/core-ui'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth'
import { fetchBirthInfo, saveBirthInfo } from '@/lib/birth-info'
import type { GeocodedCity } from '@/lib/geocode'
import { searchCity } from '@/lib/geocode'
import { resolveLocale, useStrings } from '@/lib/i18n'

const SHICHEN = [
  { index: 0, branch: '子' },
  { index: 1, branch: '丑' },
  { index: 2, branch: '寅' },
  { index: 3, branch: '卯' },
  { index: 4, branch: '辰' },
  { index: 5, branch: '巳' },
  { index: 6, branch: '午' },
  { index: 7, branch: '未' },
  { index: 8, branch: '申' },
  { index: 9, branch: '酉' },
  { index: 10, branch: '戌' },
  { index: 11, branch: '亥' },
] as const

function dateToIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map((v) => Number.parseInt(v, 10))
  if (!y || !m || !d) return new Date(1990, 0, 1)
  return new Date(y, m - 1, d)
}

export default function BirthInfoScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors, spacing } = useTheme()
  const t = useStrings(resolveLocale())
  const locale = resolveLocale()
  const { refreshUser } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [solarDate, setSolarDate] = useState('1990-01-01')
  const [birthDate, setBirthDate] = useState(() => isoToDate('1990-01-01'))
  const [timeIndex, setTimeIndex] = useState<number | null>(6)
  const [gender, setGender] = useState<'男' | '女'>('男')
  const [cityQuery, setCityQuery] = useState('')
  const [cityResults, setCityResults] = useState<GeocodedCity[]>([])
  const [selectedCity, setSelectedCity] = useState<GeocodedCity | null>(null)
  const [searchingCity, setSearchingCity] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const existing = await fetchBirthInfo()
        if (existing) {
          setSolarDate(existing.birthSolarDate)
          setBirthDate(isoToDate(existing.birthSolarDate))
          setTimeIndex(existing.birthTimeIndex)
          setGender(existing.gender)
          if (existing.birthCity) {
            setCityQuery(existing.birthCity)
            setSelectedCity({
              name: existing.birthCity,
              displayName: existing.birthCity,
              lat: Number(existing.birthLatitude ?? 0),
              lon: Number(existing.birthLongitude ?? 0),
              country: '',
              countryCode: '',
              timezone: existing.birthTimezoneId ?? null,
            })
          }
        }
      } catch (err) {
        if (__DEV__) console.warn('[birth-info] load failed', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const runCitySearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim()
      if (trimmed.length < 1) {
        setCityResults([])
        return
      }
      setSearchingCity(true)
      try {
        const lang = locale.startsWith('zh') ? 'zh-CN' : locale === 'ja' ? 'ja' : 'en'
        const rows = await searchCity(trimmed, lang, 8)
        setCityResults(rows)
      } finally {
        setSearchingCity(false)
      }
    },
    [locale]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      void runCitySearch(cityQuery)
    }, 400)
    return () => clearTimeout(timer)
  }, [cityQuery, runCitySearch])

  const handleSave = async () => {
    if (!selectedCity && cityQuery.trim().length < 1) {
      Alert.alert(t.birth_info_title, t.birth_city_required)
      return
    }
    const city = selectedCity
    if (!city) return

    setSaving(true)
    try {
      await saveBirthInfo({
        birthSolarDate: solarDate,
        birthTimeIndex: timeIndex ?? 6,
        gender,
        birthCity: city.name,
        birthLatitude: String(city.lat),
        birthLongitude: String(city.lon),
        birthTimezoneId: city.timezone ?? undefined,
      })
      await refreshUser()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch (err) {
      Alert.alert(t.err_generic, err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.lg,
        paddingHorizontal: spacing.xl,
        paddingBottom: insets.bottom + spacing.xl,
        gap: spacing.lg,
      }}
      keyboardShouldPersistTaps='handled'
    >
      <Pressable onPress={() => router.back()} hitSlop={12}>
        <Text style={{ color: colors.secondary, fontSize: 15 }}>← {t.cancel}</Text>
      </Pressable>

      <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>
        {t.birth_info_title}
      </Text>
      <Text style={{ color: colors.secondary, fontSize: 14, lineHeight: 20 }}>
        {t.birth_info_subtitle}
      </Text>

      <Card variant='elevated' padding='lg' style={{ gap: spacing.md }}>
        <Text style={{ color: colors.secondary, fontSize: 12, letterSpacing: 1 }}>
          {t.birth_date_label}
        </Text>
        <DateTimePicker
          value={birthDate}
          mode='date'
          display='inline'
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
          onChange={(_, selected) => {
            if (!selected) return
            setBirthDate(selected)
            setSolarDate(dateToIso(selected))
          }}
        />
      </Card>

      <Card variant='elevated' padding='lg' style={{ gap: spacing.sm }}>
        <Text style={{ color: colors.secondary, fontSize: 12, letterSpacing: 1 }}>
          {t.birth_time_label}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SHICHEN.map((s) => {
            const active = timeIndex === s.index
            return (
              <Pressable
                key={s.index}
                onPress={() => setTimeIndex(s.index)}
                style={{
                  width: 44,
                  height: 44,
                  borderWidth: 0.5,
                  borderColor: active ? colors.accent : colors.separator,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: active ? colors.accent : colors.text, fontSize: 16 }}>
                  {s.branch}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <Pressable onPress={() => setTimeIndex(null)}>
          <Text style={{ color: colors.secondary, fontSize: 13 }}>{t.birth_time_unknown}</Text>
        </Pressable>
      </Card>

      <Card variant='elevated' padding='lg' style={{ gap: spacing.md }}>
        <Text style={{ color: colors.secondary, fontSize: 12, letterSpacing: 1 }}>
          {t.birth_gender_label}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          {(['男', '女'] as const).map((g) => (
            <Pressable
              key={g}
              onPress={() => setGender(g)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderWidth: 0.5,
                borderColor: gender === g ? colors.accent : colors.separator,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: gender === g ? colors.accent : colors.text }}>{g}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card variant='elevated' padding='lg' style={{ gap: spacing.sm }}>
        <Text style={{ color: colors.secondary, fontSize: 12, letterSpacing: 1 }}>
          {t.birth_city_label}
        </Text>
        <TextInput
          value={cityQuery}
          onChangeText={(text) => {
            setCityQuery(text)
            setSelectedCity(null)
          }}
          placeholder={t.birth_city_placeholder}
          placeholderTextColor={colors.secondary}
          style={{
            borderWidth: 0.5,
            borderColor: colors.separator,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: colors.text,
            fontSize: 15,
          }}
        />
        {searchingCity ? <ActivityIndicator color={colors.accent} /> : null}
        {cityResults.map((c) => (
          <Pressable
            key={`${c.name}-${c.lat}`}
            onPress={() => {
              setSelectedCity(c)
              setCityQuery(c.displayName || c.name)
              setCityResults([])
            }}
            style={{ paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.separator }}
          >
            <Text style={{ color: colors.text }}>{c.displayName || c.name}</Text>
          </Pressable>
        ))}
      </Card>

      <Button variant='primary' size='lg' disabled={saving} onPress={() => void handleSave()}>
        {saving ? t.birth_saving : t.birth_save}
      </Button>
    </ScrollView>
  )
}
