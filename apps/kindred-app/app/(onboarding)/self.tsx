/**
 * Onboarding · Self birth info — now on the SHARED single-page <BirthForm>.
 *
 * One birth form behind every entry point: first-run (pair-input self tab),
 * 合盘 other (pair-input other / other-meta), and THIS screen (add / edit self).
 * Previously this screen mounted the core-ui BirthInfoForm wizard, which meant
 * the precise-time disclosure (and any future field change) had to be kept in
 * two places. Consolidating onto BirthForm fixes that — change it once, every
 * scenario gets it.
 *
 * Two modes:
 *  - add (default, reached from the home empty-state / reveal): persist self
 *    birth, then solo-first land on /(reading) (or → mode picker if onboarding
 *    is already complete = the add-thread flow).
 *  - edit (`?mode=edit`, reached from Settings): seed the form from the saved
 *    birth, show the "editing regenerates your report · 1 free change" warning,
 *    and on save go back. A free user's 2nd chart-altering edit 403s server-side
 *    (BIRTH_EDIT_QUOTA_EXHAUSTED) → we route to the paywall.
 */

import {
  type BirthDateFieldValue,
  birthDateFieldLabelsForLocale,
  birthInputToSolar,
} from '@zhop/core-ui'
import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BirthForm } from '@/components/BirthForm'
import { PrimaryButton } from '@/components/PrimaryButton'
import { YuelMark } from '@/components/YuelMark'
import { useAuth } from '@/lib/auth'
import { searchCity as searchCityApi } from '@/lib/geocode'
import { type Locale, resolveLocale, t } from '@/lib/i18n'
import { updateDraft, useDraft } from '@/lib/onboardingDraft'
import { loadSelfBirth, saveSelfBirth, syncSelfBirthToServer } from '@/lib/selfBirth'
import { suppressNextSplash } from '@/lib/splash-control'
import { isOnboardingComplete, markOnboardingComplete } from '../index'

function localeToLang(loc: string): string {
  if (loc === 'en') return 'en-US'
  if (loc === 'ja') return 'ja-JP'
  if (loc === 'zh-Hant') return 'zh-TW'
  return 'zh-CN'
}

/** Seed a BirthDateFieldValue from a draft's (solar) date string. */
function dateValueFromDraft(solar: string): BirthDateFieldValue {
  return {
    input: solar,
    calendar: 'solar',
    isLeap: false,
    solarDate: birthInputToSolar(solar, 'solar'),
  }
}

// Edit-mode strings live here (self-contained) rather than the shared i18n
// table — they're specific to this one screen and the spam/quota policy.
const EDIT_COPY: Record<Locale, { title: string; body: string; save: string }> = {
  en: {
    title: 'Editing regenerates your reading',
    body: 'Free accounts get one change. The next edit will need an unlock.',
    save: 'Save',
  },
  zh: {
    title: '修改会重新生成你的个人报告',
    body: '免费用户仅 1 次修改机会，之后再修改需解锁。',
    save: '保存',
  },
  'zh-Hant': {
    title: '修改會重新生成你的個人報告',
    body: '免費用戶僅 1 次修改機會，之後再修改需解鎖。',
    save: '儲存',
  },
  ja: {
    title: '編集すると個人レポートが再生成されます',
    body: '無料は変更1回まで。次回の変更には解除が必要です。',
    save: '保存',
  },
}

export default function SelfBirthScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ mode?: string }>()
  const isEdit = params.mode === 'edit'
  const locale = useMemo<Locale>(() => resolveLocale(), [])
  const lang = useMemo(() => localeToLang(locale), [locale])
  const { userId } = useAuth()
  const draft = useDraft()
  const scrollRef = useRef<ScrollView>(null)
  const [submitting, setSubmitting] = useState(false)
  const [selfDate, setSelfDate] = useState<BirthDateFieldValue>(() =>
    dateValueFromDraft(draft.selfSolarDate)
  )

  // Edit mode seeds the form from the persisted self birth — the onboarding
  // draft is cleared after onboarding, so without this the edit opens blank.
  useEffect(() => {
    if (!isEdit) return
    let cancelled = false
    void loadSelfBirth().then((b) => {
      if (cancelled || !b) return
      updateDraft({
        selfSolarDate: b.solarDate,
        selfTimeIndex: b.timeIndex,
        selfGender: b.gender,
        selfBirthCity: b.city ?? '',
        selfBirthLat: b.lat ?? null,
        selfBirthLng: b.lng ?? null,
        selfBirthTimezone: b.timezone ?? null,
        selfClockMinutes: b.clockMinutes ?? null,
        selfCalibrate: b.calibrate ?? null,
      })
      setSelfDate(dateValueFromDraft(b.solarDate))
    })
    return () => {
      cancelled = true
    }
  }, [isEdit])

  const dateLabels = useMemo(
    () => ({
      ...birthDateFieldLabelsForLocale(lang),
      solar: t(locale, 'pairInput.calendar.solar'),
      lunar: t(locale, 'pairInput.calendar.lunar'),
      lunarHint: t(locale, 'pairInput.calendar.lunarHint'),
    }),
    [lang, locale]
  )

  const searchCity = (query: string) => searchCityApi(query, lang, 7)

  const commitDate = (next: BirthDateFieldValue) => {
    setSelfDate(next)
    updateDraft({ selfSolarDate: next.solarDate ?? '' })
  }

  const filled =
    !!selfDate.solarDate && draft.selfGender !== null && typeof draft.selfTimeIndex === 'number'

  const handleSubmit = async () => {
    if (submitting) return
    const solar = selfDate.solarDate
    if (!solar || draft.selfGender === null || typeof draft.selfTimeIndex !== 'number') return
    setSubmitting(true)

    const birth = {
      solarDate: solar,
      timeIndex: draft.selfTimeIndex,
      gender: draft.selfGender,
      city: draft.selfBirthCity || undefined,
      lat: draft.selfBirthLat ?? undefined,
      lng: draft.selfBirthLng ?? undefined,
      timezone: draft.selfBirthTimezone ?? undefined,
      clockMinutes: draft.selfClockMinutes ?? undefined,
      calibrate: draft.selfCalibrate ?? undefined,
    }
    await saveSelfBirth(birth)
    if (userId) {
      const result = await syncSelfBirthToServer(userId, birth)
      if (result === 'quota_exhausted') {
        setSubmitting(false)
        router.push({ pathname: '/(commerce)/paywall', params: { reason: 'birth_edit' } })
        return
      }
    }
    setSubmitting(false)

    // Edit → back to wherever the user opened it from (Settings).
    if (isEdit) {
      router.back()
      return
    }
    // Add → solo-first (first run), else the add-thread partner flow.
    if (!(await isOnboardingComplete())) {
      await markOnboardingComplete()
      suppressNextSplash()
      router.replace('/(reading)')
      return
    }
    router.push('/(onboarding)/mode')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingHorizontal: kindredSpacing.screenH,
          paddingTop: kindredSpacing.xl,
          paddingBottom: kindredSpacing.xxl,
          gap: kindredSpacing.lg,
        }}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', marginBottom: kindredSpacing.sm }}>
          <YuelMark vertical size={64} color={kindredDark.seal} />
        </View>

        {isEdit ? (
          <View
            style={{
              backgroundColor: kindredDark.card,
              borderRadius: 12,
              padding: kindredSpacing.md,
              gap: kindredSpacing.xs,
            }}
          >
            <Text style={[kindredType.caption, { color: kindredDark.accent }]}>
              {EDIT_COPY[locale].title}
            </Text>
            <Text style={[kindredType.caption, { color: kindredDark.textMuted, lineHeight: 18 }]}>
              {EDIT_COPY[locale].body}
            </Text>
          </View>
        ) : null}

        <BirthForm
          locale={locale}
          lang={lang}
          date={selfDate}
          onDate={commitDate}
          dateLabels={dateLabels}
          timeIndex={draft.selfTimeIndex}
          onTime={(idx) => updateDraft({ selfTimeIndex: idx })}
          gender={draft.selfGender}
          onGender={(g) => updateDraft({ selfGender: g })}
          city={draft.selfBirthCity}
          lat={draft.selfBirthLat}
          lng={draft.selfBirthLng}
          timezone={draft.selfBirthTimezone}
          onCity={(patch) => updateDraft(patch)}
          searchCity={searchCity}
          fieldPrefix='self'
          allowPreciseTime
          clockMinutes={draft.selfClockMinutes}
          onClock={(min) => updateDraft({ selfClockMinutes: min })}
          calibrate={draft.selfCalibrate}
          onCalibrate={(on) => updateDraft({ selfCalibrate: on })}
          scrollRef={scrollRef}
        />

        <PrimaryButton
          label={isEdit ? EDIT_COPY[locale].save : t(locale, 'common.next')}
          onPress={handleSubmit}
          disabled={!filled}
        />
      </ScrollView>
    </SafeAreaView>
  )
}
