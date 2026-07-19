import {
  type BirthDateFieldValue,
  Button,
  birthDateFieldLabelsForLocale,
  birthInputToSolar,
  useTheme,
} from '@zhop/core-ui'
import { hasEntitlement, saveAndCacheBirthInfo, useEntitlements } from '@zhop/satellite-runtime'
import { router, Stack } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BirthForm } from '@/components/BirthForm'
import { searchCity as searchCityApi } from '@/lib/geocode'
import { type Locale, resolveLocale } from '@/lib/i18n'
import { isCjkZh, pickZh } from '@/lib/locale-zh'
import type { OnboardingDraft } from '@/lib/onboardingDraft'
import {
  draftHasThreePhotos,
  draftReadyForPaywall,
  getReadingDraft,
  hydrateReadingDraft,
  patchReadingDraft,
} from '@/lib/reading-draft'
import { alertIfPhotosUnchanged } from '@/lib/reading-preflight'
import { getReadingJobState, showReadingStartedHandoff, startReadingJob } from '@/lib/reading-job'

function localeToLang(loc: Locale): string {
  if (loc === 'en') return 'en-US'
  if (loc === 'ja') return 'ja-JP'
  if (loc === 'zh-Hant') return 'zh-TW'
  return 'zh-CN'
}

export default function BirthScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const s = (hans: string, hant: string, en: string) =>
    isCjkZh(locale) ? pickZh(locale, hans, hant) : en
  const lang = localeToLang(locale)
  const dateLabels = useMemo(() => birthDateFieldLabelsForLocale(lang), [lang])
  const scrollRef = useRef<ScrollView | null>(null)
  const entitlements = useEntitlements()
  const isPro =
    hasEntitlement(entitlements, 'faceoracle_pro') || hasEntitlement(entitlements, 'universe_pro')

  const [date, setDate] = useState<BirthDateFieldValue>({
    input: '',
    calendar: 'solar',
    isLeap: false,
    solarDate: null,
  })
  const [timeIndex, setTimeIndex] = useState<number | null>(null)
  const [gender, setGender] = useState<'男' | '女' | null>(null)
  const [city, setCity] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [timezone, setTimezone] = useState<string | null>(null)
  const [clockMinutes, setClockMinutes] = useState<number | null>(null)
  const [calibrate, setCalibrate] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void hydrateReadingDraft().then((d) => {
      if (d.solarDate) {
        setDate({
          input: d.solarDate,
          calendar: 'solar',
          isLeap: false,
          solarDate: d.solarDate,
        })
      }
      if (d.timeIndex != null) setTimeIndex(d.timeIndex)
      if (d.gender) setGender(d.gender)
      if (d.city) setCity(d.city)
    })
  }, [])

  const onCity = (patch: Partial<OnboardingDraft>) => {
    if (patch.selfBirthCity !== undefined) setCity(patch.selfBirthCity)
    if (patch.selfBirthLat !== undefined) setLat(patch.selfBirthLat)
    if (patch.selfBirthLng !== undefined) setLng(patch.selfBirthLng)
    if (patch.selfBirthTimezone !== undefined) setTimezone(patch.selfBirthTimezone)
  }

  const searchCity = (query: string) => searchCityApi(query, lang)

  const startProReadingAndGoHome = () => {
    if (getReadingJobState().status === 'running') {
      router.replace('/(app)' as never)
      return
    }
    void (async () => {
      const draft = getReadingDraft()
      if (
        await alertIfPhotosUnchanged({
          draft,
          locale,
          onUpdatePhotos: () => router.replace('/capture' as never),
        })
      ) {
        return
      }
      startReadingJob({
        locale,
        outputKind: 'period_brief',
        isPro: true,
        draft,
        onQueued: () => {
          void showReadingStartedHandoff({ locale })
        },
      })
      router.replace('/(app)' as never)
    })()
  }

  const onContinue = async () => {
    if (busy) return
    const solarRaw =
      date.solarDate ?? birthInputToSolar(date.input, date.calendar, date.isLeap ?? false) ?? ''
    const solarDate = solarRaw.trim()
    if (!solarDate || timeIndex == null || !gender) {
      setError(s('请完整填写日期、时辰与性别', '請完整填寫日期、時辰與性別', 'Date, hour, and gender are required'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      patchReadingDraft({
        solarDate,
        timeIndex,
        gender,
        city: city.trim() || undefined,
      })
      try {
        await saveAndCacheBirthInfo({
          birthSolarDate: solarDate,
          birthTimeIndex: timeIndex,
          gender,
          birthCity: city.trim() || undefined,
          birthLatitude: lat != null ? String(lat) : undefined,
          birthLongitude: lng != null ? String(lng) : undefined,
          birthTimezoneId: timezone ?? undefined,
        })
      } catch {
        // local draft enough for paywall / reading
      }
      if (!draftReadyForPaywall(getReadingDraft())) {
        if (!draftHasThreePhotos(getReadingDraft())) {
          setError(
            s(
              '请先在首页完成左掌、右掌与面部照片',
              '請先在首頁完成左掌、右掌與面部照片',
              'Add left palm, right palm, and face photos first'
            )
          )
          return
        }
        setError(s('资料不完整', '資料不完整', 'Incomplete draft'))
        return
      }
      // Pro: skip unlock sheet — start reading and return home.
      if (isPro) {
        startProReadingAndGoHome()
        return
      }
      router.push('/(commerce)/paywall')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.xl,
        paddingBottom: insets.bottom + spacing.xl,
        paddingHorizontal: spacing.xl,
        gap: spacing.lg,
      }}
      keyboardShouldPersistTaps='handled'
    >
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      />
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '600' }}>
        {s('录入生辰', '錄入生辰', 'Your birth details')}
      </Text>
      <Text style={{ color: colors.secondary, fontSize: 14, lineHeight: 20 }}>
        {s(
          '完整解读需要三张照片与生辰。生辰用于形气与八字对照。',
          '完整解讀需要三張照片與生辰。生辰用於形氣與八字對照。',
          'A complete reading needs three photos plus birth info for physiognomy × BaZi contrast.'
        )}
      </Text>
      <BirthForm
        locale={locale}
        lang={lang}
        date={date}
        onDate={setDate}
        dateLabels={dateLabels}
        timeIndex={timeIndex}
        onTime={setTimeIndex}
        gender={gender}
        onGender={setGender}
        city={city}
        lat={lat}
        lng={lng}
        timezone={timezone}
        onCity={onCity}
        searchCity={searchCity}
        fieldPrefix='self'
        allowPreciseTime
        clockMinutes={clockMinutes}
        onClock={setClockMinutes}
        calibrate={calibrate}
        onCalibrate={setCalibrate}
        scrollRef={scrollRef}
      />
      {error ? <Text style={{ color: colors.accent }}>{error}</Text> : null}
      <View>
        <Button variant='primary' onPress={() => void onContinue()} disabled={busy}>
          {isPro
            ? s('开始解读', '開始解讀', 'Start reading')
            : s('继续到解锁', '繼續到解鎖', 'Continue to unlock')}
        </Button>
      </View>
    </ScrollView>
  )
}
