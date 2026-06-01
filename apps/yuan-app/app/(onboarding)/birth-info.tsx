/**
 * Onboarding · Birth info (Phase J.2.1)
 *
 * Replaces the three separate self-flow screens (birth-date / birth-time /
 * birth-place) with a single mount of the shared `<BirthInfoForm>` from
 * core-ui. Bonus: also collects self gender — the previous flow skipped
 * this, but synastry compute server-side needs it (see
 * `apps/hexastral-api/src/routes/bonds.ts` and `getUserForHehun`).
 *
 * Submit handler routes to `/(onboarding)/mode` (no server call — yuan-app
 * posts to /api/bonds/* later at reveal.tsx).
 */

import { BirthInfoForm, type BirthInfoValue, type CityRecord } from '@zhop/core-ui'
import { YuanSeal } from '@zhop/scenario-yuan'
import { yuanLight } from '@zhop/hexastral-tokens/yuan'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { searchCity as searchCityApi } from '@/lib/geocode'
import { resolveLocale } from '@/lib/i18n'
import { updateDraft, useDraft } from '@/lib/onboardingDraft'

interface ScreenCopy {
  dateTitle: string
  dateSolarLabel: string
  dateLunarLabel: string
  timeTitle: string
  timeSubtitle: string
  timeSkipLabel: string
  genderTitle: string
  genderSubtitle: string
  genderMale: string
  genderFemale: string
  placeTitle: string
  placeSearchPlaceholder: string
  reviewTitle: string
  reviewSubtitle: string
  reviewSolarLabel: string
  reviewLunarLabel: string
  reviewTimeLabel: string
  reviewGenderLabel: string
  reviewCityLabel: string
  reviewTimeUnknown: string
  reviewContinue: string
  reviewEditCue: string
  next: string
}

const COPY_BY_LOCALE: Record<string, ScreenCopy> = {
  en: {
    dateTitle: 'Your birthday',
    dateSolarLabel: 'Solar',
    dateLunarLabel: 'Lunar',
    timeTitle: 'What time were you born?',
    timeSubtitle: 'Twelve two-hour 时辰 windows. Skip if unknown.',
    timeSkipLabel: "I don't know",
    genderTitle: 'Gender at birth',
    genderSubtitle: 'Needed to align your charts.',
    genderMale: 'Male',
    genderFemale: 'Female',
    placeTitle: 'Where were you born?',
    placeSearchPlaceholder: 'Search for a city…',
    reviewTitle: 'Look right?',
    reviewSubtitle: 'Tap any row to fix it before continuing.',
    reviewSolarLabel: 'Solar date',
    reviewLunarLabel: 'Lunar date',
    reviewTimeLabel: 'Hour',
    reviewGenderLabel: 'Gender',
    reviewCityLabel: 'Place',
    reviewTimeUnknown: 'Unknown',
    reviewContinue: 'Continue →',
    reviewEditCue: 'edit',
    next: 'Next →',
  },
  zh: {
    dateTitle: '你的生日',
    dateSolarLabel: '公历',
    dateLunarLabel: '农历',
    timeTitle: '出生的具体时辰',
    timeSubtitle: '十二时辰，每个对应两小时。不确定可跳过。',
    timeSkipLabel: '不太清楚',
    genderTitle: '出生性别',
    genderSubtitle: '用于推算你与TA的命卦合盘。',
    genderMale: '男',
    genderFemale: '女',
    placeTitle: '在哪里出生',
    placeSearchPlaceholder: '搜索城市…',
    reviewTitle: '确认一下',
    reviewSubtitle: '点击任意一项可返回修改。',
    reviewSolarLabel: '公历日期',
    reviewLunarLabel: '农历日期',
    reviewTimeLabel: '时辰',
    reviewGenderLabel: '性别',
    reviewCityLabel: '出生地',
    reviewTimeUnknown: '未知',
    reviewContinue: '继续 →',
    reviewEditCue: '修改',
    next: '下一步 →',
  },
  'zh-Hant': {
    dateTitle: '你的生日',
    dateSolarLabel: '公曆',
    dateLunarLabel: '農曆',
    timeTitle: '出生的具體時辰',
    timeSubtitle: '十二時辰，每個對應兩小時。不確定可跳過。',
    timeSkipLabel: '不太清楚',
    genderTitle: '出生性別',
    genderSubtitle: '用於推算你與TA的命卦合盤。',
    genderMale: '男',
    genderFemale: '女',
    placeTitle: '在哪裡出生',
    placeSearchPlaceholder: '搜尋城市…',
    reviewTitle: '確認一下',
    reviewSubtitle: '點擊任意一項可返回修改。',
    reviewSolarLabel: '公曆日期',
    reviewLunarLabel: '農曆日期',
    reviewTimeLabel: '時辰',
    reviewGenderLabel: '性別',
    reviewCityLabel: '出生地',
    reviewTimeUnknown: '未知',
    reviewContinue: '繼續 →',
    reviewEditCue: '修改',
    next: '下一步 →',
  },
  ja: {
    dateTitle: '生年月日',
    dateSolarLabel: '西暦',
    dateLunarLabel: '旧暦',
    timeTitle: '出生時刻',
    timeSubtitle: '12 の時辰（2 時間単位）。不明な場合はスキップ可。',
    timeSkipLabel: 'わからない',
    genderTitle: '出生時の性別',
    genderSubtitle: '命卦・合盤の算出に使用します。',
    genderMale: '男',
    genderFemale: '女',
    placeTitle: '出生地',
    placeSearchPlaceholder: '都市を検索…',
    reviewTitle: 'ご確認ください',
    reviewSubtitle: '修正したい項目をタップしてください。',
    reviewSolarLabel: '西暦',
    reviewLunarLabel: '旧暦',
    reviewTimeLabel: '時辰',
    reviewGenderLabel: '性別',
    reviewCityLabel: '出生地',
    reviewTimeUnknown: '不明',
    reviewContinue: '続ける →',
    reviewEditCue: '編集',
    next: '次へ →',
  },
}

function localeToLang(loc: string): string {
  if (loc === 'en') return 'en-US'
  if (loc === 'ja') return 'ja-JP'
  if (loc === 'zh-Hant') return 'zh-TW'
  return 'zh-CN'
}

export default function BirthInfoScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const lang = useMemo(() => localeToLang(locale), [locale])
  const draft = useDraft()

  const copy = COPY_BY_LOCALE[locale] ?? COPY_BY_LOCALE.en!

  const value: Partial<BirthInfoValue> = {
    solarDate: draft.selfSolarDate || undefined,
    timeIndex:
      typeof draft.selfTimeIndex === 'number' &&
      draft.selfTimeIndex >= 0 &&
      draft.selfTimeIndex <= 11
        ? (draft.selfTimeIndex as BirthInfoValue['timeIndex'])
        : null,
    gender: draft.selfGender ?? undefined,
    city: draft.selfBirthCity || undefined,
    lat: draft.selfBirthLat ?? undefined,
    lng: draft.selfBirthLng ?? undefined,
    timezone: draft.selfBirthTimezone ?? undefined,
  }

  const handleChange = (next: Partial<BirthInfoValue>) => {
    const patch: Partial<typeof draft> = {}
    if (next.solarDate !== undefined) patch.selfSolarDate = next.solarDate
    if (next.timeIndex !== undefined) patch.selfTimeIndex = next.timeIndex
    if (next.gender !== undefined) patch.selfGender = next.gender
    if (next.city !== undefined) patch.selfBirthCity = next.city
    if (next.lat !== undefined) patch.selfBirthLat = next.lat
    if (next.lng !== undefined) patch.selfBirthLng = next.lng
    if (next.timezone !== undefined) patch.selfBirthTimezone = next.timezone
    updateDraft(patch)
  }

  const handleSearchCity = async (query: string): Promise<CityRecord[]> => {
    return searchCityApi(query, lang, 7)
  }

  const handleSubmit = async () => {
    // No server call here — yuan-app commits via /api/bonds/* later in
    // reveal.tsx (solo path) or invite-email.tsx (resonance path). Just
    // advance to the mode picker.
    router.push('/(onboarding)/mode')
  }

  return (
    <BirthInfoForm
      value={value}
      onChange={handleChange}
      onSubmit={handleSubmit}
      accent={yuanLight.accent}
      crown={<YuanSeal mode='breathing' size={96} />}
      copy={{
        dateTitle: copy.dateTitle,
        dateSolarLabel: copy.dateSolarLabel,
        dateLunarLabel: copy.dateLunarLabel,
        timeTitle: copy.timeTitle,
        timeSubtitle: copy.timeSubtitle,
        timeSkipLabel: copy.timeSkipLabel,
        genderTitle: copy.genderTitle,
        genderSubtitle: copy.genderSubtitle,
        genderMale: copy.genderMale,
        genderFemale: copy.genderFemale,
        placeTitle: copy.placeTitle,
        placeSearchPlaceholder: copy.placeSearchPlaceholder,
        reviewTitle: copy.reviewTitle,
        reviewSubtitle: copy.reviewSubtitle,
        reviewLabels: {
          solarDate: copy.reviewSolarLabel,
          lunarDate: copy.reviewLunarLabel,
          timeIndex: copy.reviewTimeLabel,
          gender: copy.reviewGenderLabel,
          city: copy.reviewCityLabel,
        },
        reviewTimeUnknown: copy.reviewTimeUnknown,
        reviewSubmit: copy.reviewContinue,
        reviewSubmitLoading: copy.reviewContinue,
        reviewEditCue: copy.reviewEditCue,
        next: copy.next,
      }}
      searchCity={handleSearchCity}
      locale={locale}
    />
  )
}
