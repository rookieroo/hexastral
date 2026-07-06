/**
 * In-app birth info — the single-page HexAstral standard form (Fēng / Yuun / Yuel).
 * Atomic fields: BirthDateField + ShichenField + gender + opt-in 真太阳时 disclosure.
 * Persists via portfolio birth-info SSOT (`@zhop/portfolio-client`).
 */

import { resolveBirthHour } from '@zhop/astro-core'
import {
  BirthClockField,
  BirthDateField,
  type BirthDateFieldValue,
  birthDateFieldLabelsForLocale,
  CityPicker,
  type CityRecord,
  DEFAULT_TOP_CITIES,
  formatHourMinute,
  isCjkScript,
  ShichenField,
  type ShichenIndex,
  shichenFieldLabelsForLocale,
  shichenInlineLabel,
  shichenRange,
  Toggle,
  useTheme,
} from '@zhop/core-ui'
import { getPortfolioUserId } from '@zhop/satellite-runtime'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { CoinCastSealLogo } from '@/components/CoinCastSealLogo'
import { type CoincastBirthInfo, fetchBirthInfo, saveCoincastBirthInfo } from '@/lib/birth-info'
import { coincastBirthCopy, type CoincastUiLocale } from '@/lib/birthInfoCopy'
import { searchCity } from '@/lib/geocode'
import { useSatelliteI18n } from '@/lib/i18n'

const SHICHEN_BRANCHES = '子丑寅卯辰巳午未申酉戌亥'
const SHICHEN_RANGES = [
  '23:00 – 01:00',
  '01:00 – 03:00',
  '03:00 – 05:00',
  '05:00 – 07:00',
  '07:00 – 09:00',
  '09:00 – 11:00',
  '11:00 – 13:00',
  '13:00 – 15:00',
  '15:00 – 17:00',
  '17:00 – 19:00',
  '19:00 – 21:00',
  '21:00 – 23:00',
] as const

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}
function formatMinutes(min: number): string {
  return `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`
}
function clockToShichenIndex(min: number): ShichenIndex {
  const h = Math.floor(min / 60)
  return (Math.floor((h + 1) / 2) % 12) as ShichenIndex
}
function shichenSummaryLabel(index: number, locale: string): string {
  if (isCjkScript(locale)) {
    return shichenInlineLabel(index, SHICHEN_BRANCHES[index] ?? '', locale)
  }
  return shichenRange(SHICHEN_RANGES[index] ?? '', locale)
}
function shichenLabelForHour(hour: number, locale: string): string {
  const idx = hour === 23 ? 0 : Math.floor((hour + 1) / 2) % 12
  return shichenSummaryLabel(idx, locale)
}

async function searchCityRecords(query: string): Promise<CityRecord[]> {
  const results = await searchCity(query)
  return results.map((c) => ({
    name: c.name,
    country: c.countryCode,
    lat: c.lat,
    lng: c.lon,
    timezone: c.timezone,
    displayName: c.displayName,
  }))
}

export default function CoinCastBirthInfoScreen() {
  const router = useRouter()
  const { colors, spacing } = useTheme()
  const { locale, uiLocale, t } = useSatelliteI18n()
  const preciseCopy = coincastBirthCopy(uiLocale as CoincastUiLocale)

  const [birth, setBirth] = useState<CoincastBirthInfo>({
    birthSolarDate: '',
    birthTimeIndex: 0,
    gender: '男',
  })
  const [dateField, setDateField] = useState<BirthDateFieldValue>({
    input: '',
    calendar: 'solar',
    isLeap: false,
    solarDate: null,
  })
  const [loading, setLoading] = useState(true)
  const [guest, setGuest] = useState(false)
  const [saving, setSaving] = useState(false)
  const [birthSaved, setBirthSaved] = useState(false)
  const [showPrecise, setShowPrecise] = useState(false)
  const [timeIndex, setTimeIndex] = useState<ShichenIndex | null>(0)

  const scrollRef = useRef<ScrollView>(null)

  const dateLabels = useMemo(
    () => ({
      ...birthDateFieldLabelsForLocale(locale),
      solar: t('birthCalendarSolar'),
      lunar: t('birthCalendarLunar'),
      lunarHint: t('birthCalendarLunarHint'),
    }),
    [locale, t]
  )

  const computedSolarDate = dateField.solarDate
  const birthValid = computedSolarDate !== null

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const uid = await getPortfolioUserId()
        if (!uid) {
          if (!cancelled) setGuest(true)
          return
        }
        const existing = await fetchBirthInfo()
        if (existing && !cancelled) {
          setBirth(existing)
          setTimeIndex(
            typeof existing.birthTimeIndex === 'number' &&
              existing.birthTimeIndex >= 0 &&
              existing.birthTimeIndex <= 11
              ? (existing.birthTimeIndex as ShichenIndex)
              : null
          )
          if (existing.birthClockMinutes != null || existing.birthCity?.trim()) {
            setShowPrecise(true)
          }
          const isLunar = existing.birthCalendarType === 'lunar' && !!existing.birthLunarInput
          setDateField({
            input:
              isLunar && existing.birthLunarInput
                ? existing.birthLunarInput
                : existing.birthSolarDate,
            calendar: isLunar ? 'lunar' : 'solar',
            isLeap: isLunar && existing.birthLunarIsLeap === true,
            solarDate: existing.birthSolarDate || null,
          })
        }
      } catch (err) {
        console.warn('[coincast-birth] load failed', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const cityValue: CityRecord | null = birth.birthCity
    ? {
        name: birth.birthCity,
        country: '',
        lat: birth.birthLatitude ? Number(birth.birthLatitude) : 0,
        lng: birth.birthLongitude ? Number(birth.birthLongitude) : 0,
        timezone: birth.birthTimezoneId ?? null,
      }
    : null

  const lng = birth.birthLongitude ? Number(birth.birthLongitude) : null

  const handleClock = (min: number) => {
    const snapped = clockToShichenIndex(min)
    setBirth((prev) => ({ ...prev, birthClockMinutes: min, birthTimeIndex: snapped }))
    setTimeIndex(snapped)
  }
  const handlePreciseCity = (city: CityRecord) =>
    setBirth((prev) => ({
      ...prev,
      birthCity: city.name,
      birthLatitude: String(city.lat),
      birthLongitude: String(city.lng),
      birthTimezoneId: city.timezone ?? undefined,
    }))

  let calibrationPreview: string | null = null
  if (birth.birthClockMinutes != null && lng != null && computedSolarDate) {
    const [yStr, mStr, dStr] = computedSolarDate.split('-')
    const y = Number.parseInt(yStr ?? '', 10)
    const mo = Number.parseInt(mStr ?? '', 10)
    const d = Number.parseInt(dStr ?? '', 10)
    if (y && mo && d) {
      const resolved = resolveBirthHour({
        year: y,
        month: mo,
        day: d,
        clockMinutes: birth.birthClockMinutes,
        calibrate: birth.birthSolarCalibrate ?? undefined,
        longitude: lng,
        timezoneId: birth.birthTimezoneId ?? undefined,
        city: birth.birthCity || undefined,
      })
      if (resolved.calibrated) {
        calibrationPreview = `${formatHourMinute(formatMinutes(birth.birthClockMinutes), locale)} → ${preciseCopy.trueSolarLabel} ${formatHourMinute(`${pad2(resolved.hour)}:${pad2(resolved.minute)}`, locale)} · ${shichenLabelForHour(resolved.hour, locale)}`
      }
    }
  }

  const saveBirth = async () => {
    if (!birthValid || !computedSolarDate) return
    const isLunar = dateField.calendar === 'lunar'
    const updated: CoincastBirthInfo = {
      ...birth,
      birthSolarDate: computedSolarDate,
      birthTimeIndex: timeIndex ?? 0,
      birthCalendarType: dateField.calendar,
      birthLunarInput: isLunar ? dateField.input : undefined,
      birthLunarIsLeap: isLunar ? dateField.isLeap : undefined,
    }
    setSaving(true)
    try {
      await saveCoincastBirthInfo(updated)
      setBirth(updated)
      setBirthSaved(true)
      setTimeout(() => setBirthSaved(false), 2000)
    } catch (err) {
      console.warn('[coincast-birth] save failed', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <StatusBar style='auto' />
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }

  if (guest) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style='auto' />
        <View style={{ padding: spacing.xl, gap: spacing.md }}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole='button'>
            <Text style={{ color: colors.accent, fontSize: 24 }}>‹</Text>
          </Pressable>
          <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>{t('birthInfoGuestHint')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style='auto' />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}
        keyboardShouldPersistTaps='handled'
        automaticallyAdjustKeyboardInsets
      >
        <View style={{ alignItems: 'center', gap: spacing.md, marginTop: spacing.sm }}>
          <CoinCastSealLogo />
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>{t('birthInfoTitle')}</Text>
          <Text
            style={{
              color: colors.secondary,
              fontSize: 13,
              lineHeight: 19,
              textAlign: 'center',
            }}
          >
            {t('birthInfoSubtitle')}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 14,
            padding: spacing.lg,
            gap: spacing.lg,
          }}
        >
            <View style={{ gap: spacing.sm }}>
              <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 2 }}>
                {t('birthDateLabel')}
              </Text>
              <BirthDateField
                value={dateField}
                onChange={setDateField}
                accent={colors.accent}
                labels={dateLabels}
                locale={locale}
              />
            </View>

            <View style={{ gap: spacing.sm }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 2 }}>
                  {t('birthTimeLabel')}
                </Text>
                <Pressable
                  onPress={() => setTimeIndex(null)}
                  hitSlop={6}
                  accessibilityRole='button'
                  accessibilityLabel={t('birthTimeUnknown')}
                >
                  <Text
                    style={{
                      color: timeIndex === null ? colors.accent : colors.secondary,
                      fontSize: 12,
                      fontWeight: timeIndex === null ? '600' : '400',
                    }}
                  >
                    {t('birthTimeUnknown')}
                  </Text>
                </Pressable>
              </View>
              <ShichenField
                value={timeIndex}
                onChange={(idx: ShichenIndex) => setTimeIndex(idx)}
                accent={colors.accent}
                labels={shichenFieldLabelsForLocale(locale)}
                locale={locale}
              />
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 2 }}>
                {t('birthGenderLabel')}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {(
                  [
                    ['男', t('birthGenderMale')],
                    ['女', t('birthGenderFemale')],
                  ] as const
                ).map(([key, label]) => {
                  const selected = birth.gender === key
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setBirth((prev) => ({ ...prev, gender: key }))}
                      style={{
                        flex: 1,
                        paddingVertical: spacing.sm,
                        borderRadius: 10,
                        borderWidth: 0.5,
                        borderColor: selected ? colors.accent : colors.separator,
                        backgroundColor: selected ? colors.accent : 'transparent',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: selected ? colors.tintFg : colors.text,
                          fontSize: 15,
                          fontWeight: selected ? '600' : '400',
                        }}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            <View style={{ gap: spacing.sm }}>
              <Pressable
                onPress={() => setShowPrecise((s) => !s)}
                hitSlop={8}
                accessibilityRole='button'
                accessibilityLabel={preciseCopy.precisePrompt}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Text style={{ color: colors.accent, fontSize: 13 }}>
                  {`${showPrecise ? '▾  ' : '▸  '}${preciseCopy.precisePrompt}`}
                </Text>
              </Pressable>

              {showPrecise ? (
                <View style={{ gap: spacing.md }}>
                  <BirthClockField
                    value={birth.birthClockMinutes ?? null}
                    onChange={handleClock}
                    accent={colors.accent}
                    locale={locale}
                    labels={{
                      placeholder: preciseCopy.preciseTimeLabel,
                      done: preciseCopy.done,
                    }}
                  />

                  {birth.birthClockMinutes != null ? (
                    <View style={{ gap: spacing.md }}>
                      <Text style={{ color: colors.secondary, fontSize: 12, lineHeight: 18 }}>
                        {preciseCopy.preciseCityLabel}
                      </Text>
                      <CityPicker
                        value={cityValue}
                        onSelect={handlePreciseCity}
                        search={searchCityRecords}
                        topCities={DEFAULT_TOP_CITIES}
                        placeholder={preciseCopy.preciseCityPlaceholder}
                        scrollRef={scrollRef}
                      />

                      {lng != null ? (
                        <View style={{ gap: spacing.sm }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Text style={{ color: colors.text, fontSize: 15 }}>
                              {preciseCopy.calibrateLabel}
                            </Text>
                            <Toggle
                              value={birth.birthSolarCalibrate !== false}
                              onValueChange={(on) =>
                                setBirth((prev) => ({ ...prev, birthSolarCalibrate: on }))
                              }
                              accent={colors.accent}
                            />
                          </View>
                          {calibrationPreview ? (
                            <Text style={{ color: colors.secondary, fontSize: 12, lineHeight: 18 }}>
                              {calibrationPreview}
                            </Text>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>

            <Pressable
              onPress={() => void saveBirth()}
              disabled={!birthValid || saving}
              accessibilityRole='button'
              accessibilityLabel={t('birthSave')}
              style={{
                marginTop: spacing.sm,
                alignSelf: 'stretch',
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: birthValid ? colors.accent : colors.accentGhost,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: birthValid ? colors.tintFg : colors.secondary,
                  fontSize: 15,
                  fontWeight: '600',
                  letterSpacing: 1,
                }}
              >
                {saving ? t('birthSaving') : birthSaved ? t('birthSaved') : t('birthSave')}
              </Text>
            </Pressable>
            <Text style={{ color: colors.secondary, fontSize: 12 }}>{t('birthHint')}</Text>
        </View>

        <Pressable
          onPress={() => router.back()}
          accessibilityRole='button'
          accessibilityLabel={preciseCopy.done}
          style={({ pressed }) => ({
            alignSelf: 'center',
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.xl,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ color: colors.secondary, fontSize: 14 }}>{preciseCopy.done}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
