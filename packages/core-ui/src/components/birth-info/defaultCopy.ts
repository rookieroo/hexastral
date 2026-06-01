/**
 * Default copy for `<BirthInfoForm>` in `en` and `zh`. Apps that want
 * different voice (e.g. yuan's literary tone) pass their own `copy` prop
 * and ignore these.
 */

import type { BirthInfoCopy } from './types'

const EN: BirthInfoCopy = {
  dateTitle: 'When were you born?',
  dateSubtitle: 'Pick your birth date — accurate to the day.',
  dateSolarLabel: 'Solar',
  dateLunarLabel: 'Lunar',

  timeTitle: 'What hour were you born?',
  timeSubtitle: 'Twelve two-hour 时辰 windows. Skip if unknown.',
  timeSkipLabel: "I don't know",

  genderTitle: 'Gender at birth?',
  genderSubtitle: 'Used for 命卦 derivation. Cannot be skipped.',
  genderMale: 'Male',
  genderFemale: 'Female',

  placeTitle: 'Where were you born?',
  placeSubtitle: 'City of birth — needed for true-solar time correction.',
  placeSearchPlaceholder: 'Search for a city…',

  reviewTitle: 'Confirm your birth info',
  reviewSubtitle: 'Tap any row to edit before submitting.',
  reviewLabels: {
    solarDate: 'Solar date',
    lunarDate: 'Lunar date',
    timeIndex: 'Hour',
    gender: 'Gender',
    city: 'Place',
  },
  reviewTimeUnknown: 'Unknown',
  reviewSubmit: 'Submit',
  reviewSubmitLoading: 'Saving…',
  reviewEditCue: 'edit',

  next: 'Next',
}

const ZH: BirthInfoCopy = {
  dateTitle: '你的出生日期',
  dateSubtitle: '请选择出生日期，精确到天。',
  dateSolarLabel: '公历',
  dateLunarLabel: '农历',

  timeTitle: '你出生的时辰',
  timeSubtitle: '十二时辰，每个对应两小时。不确定可跳过。',
  timeSkipLabel: '我不知道',

  genderTitle: '出生性别',
  genderSubtitle: '用于推算命卦，不可跳过。',
  genderMale: '男',
  genderFemale: '女',

  placeTitle: '你的出生地',
  placeSubtitle: '出生城市，用于真太阳时修正。',
  placeSearchPlaceholder: '搜索城市…',

  reviewTitle: '确认你的生辰',
  reviewSubtitle: '点击任意一项可返回修改。',
  reviewLabels: {
    solarDate: '公历日期',
    lunarDate: '农历日期',
    timeIndex: '时辰',
    gender: '性别',
    city: '出生地',
  },
  reviewTimeUnknown: '未知',
  reviewSubmit: '确认提交',
  reviewSubmitLoading: '提交中…',
  reviewEditCue: '编辑',

  next: '下一步',
}

const BY: Record<string, BirthInfoCopy> = {
  en: EN,
  zh: ZH,
  'zh-Hant': {
    ...ZH,
    dateTitle: '你的出生日期',
    timeTitle: '你出生的時辰',
    timeSubtitle: '十二時辰，每個對應兩小時。不確定可跳過。',
    timeSkipLabel: '我不知道',
    genderSubtitle: '用於推算命卦，不可跳過。',
    placeSubtitle: '出生城市，用於真太陽時修正。',
    placeSearchPlaceholder: '搜尋城市…',
    reviewTitle: '確認你的生辰',
    reviewSubtitle: '點擊任意一項可返回修改。',
    reviewLabels: {
      solarDate: '公曆日期',
      lunarDate: '農曆日期',
      timeIndex: '時辰',
      gender: '性別',
      city: '出生地',
    },
    reviewSubmit: '確認提交',
    reviewSubmitLoading: '提交中…',
    reviewEditCue: '編輯',
    next: '下一步',
  },
  ja: {
    ...EN,
    dateTitle: '生年月日',
    dateSubtitle: '生まれた日付を選択してください。',
    timeTitle: '出生の時辰',
    timeSubtitle: '12 の時辰（2 時間単位）。不明な場合はスキップ可。',
    timeSkipLabel: 'わからない',
    genderTitle: '出生時の性別',
    genderSubtitle: '命卦の算出に使用します。スキップできません。',
    placeTitle: '出生地',
    placeSubtitle: '真太陽時補正のため必要です。',
    placeSearchPlaceholder: '都市を検索…',
    reviewTitle: '生年月日を確認',
    reviewSubtitle: '修正したい項目をタップしてください。',
    reviewLabels: {
      solarDate: '西暦',
      lunarDate: '旧暦',
      timeIndex: '時辰',
      gender: '性別',
      city: '出生地',
    },
    reviewTimeUnknown: '不明',
    reviewSubmit: '送信',
    reviewSubmitLoading: '送信中…',
    reviewEditCue: '編集',
    next: '次へ',
  },
}

export function birthInfoCopyForLocale(locale: string): BirthInfoCopy {
  const exact = BY[locale]
  if (exact) return exact
  const base = locale.split('-')[0] ?? 'en'
  return BY[base] ?? EN
}
