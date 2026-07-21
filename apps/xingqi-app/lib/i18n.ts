/**
 * Xingqi i18n — slim 4-locale registry (funnel + BirthForm only).
 * No kindred bonds/合盘 copy.
 */

import { getLocales } from 'expo-localization'
import { useMemo } from 'react'

export type Locale = 'en' | 'zh' | 'zh-Hant' | 'ja'

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'zh', 'zh-Hant', 'ja']

let devLocaleOverride: Locale | null = null
export function getXingqiDevLocale(): Locale | null {
  return __DEV__ ? devLocaleOverride : null
}
export function setXingqiDevLocale(next: Locale | null): void {
  if (__DEV__) devLocaleOverride = next
}

export function resolveLocale(): Locale {
  const override = getXingqiDevLocale()
  if (override) return override
  const locales = getLocales()
  const first = locales[0]
  if (!first) return 'en'
  const tag = first.languageTag.toLowerCase()
  if (tag.startsWith('zh-tw') || tag.startsWith('zh-hk') || tag.startsWith('zh-hant')) {
    return 'zh-Hant'
  }
  if (tag.startsWith('zh')) return 'zh'
  if (tag.startsWith('ja')) return 'ja'
  return 'en'
}

type Translations = Record<Locale, Record<string, string>>

export const translations: Translations = {
  en: {
    'date.title': 'Your birthday',
    'time.title': 'What time were you born?',
    'fill.gender': 'Gender',
    'fill.gender.male': 'Male',
    'fill.gender.female': 'Female',
    'pairInput.timeHint':
      'Required — your hour pillar depends on it. Each two-hour window is named for a zodiac animal.',
  },
  zh: {
    'date.title': '你的生日',
    'time.title': '你出生在什么时辰？',
    'fill.gender': '性别',
    'fill.gender.male': '男',
    'fill.gender.female': '女',
    'pairInput.timeHint': '必填——直接决定时柱。十二时辰，每个对应两小时。',
  },
  'zh-Hant': {
    'date.title': '你的生日',
    'time.title': '你出生在什麼時辰？',
    'fill.gender': '性別',
    'fill.gender.male': '男',
    'fill.gender.female': '女',
    'pairInput.timeHint': '必填——直接決定時柱。十二時辰，每個對應兩小時。',
  },
  ja: {
    'date.title': '生年月日',
    'time.title': '生まれた時刻は？',
    'fill.gender': '性別',
    'fill.gender.male': '男',
    'fill.gender.female': '女',
    'pairInput.timeHint':
      '必須 — 時柱の決定に必要です。12の時辰（各2時間）から選びます。',
  },
}

export type TranslationKey = keyof (typeof translations)['en']

export function t(locale: Locale, key: TranslationKey): string {
  return translations[locale][key] ?? translations.en[key] ?? key
}

export function privacyPolicyUrl(locale: Locale): string {
  const segment =
    locale === 'zh-Hant' ? 'tw' : locale === 'zh' ? 'zh' : locale === 'ja' ? 'ja' : 'en'
  if (segment === 'en') return 'https://www.hexastral.com/en/privacy/syel'
  return `https://www.hexastral.com/${segment}/privacy/syel`
}

export function useI18n() {
  const locale = useMemo(() => resolveLocale(), [])
  return {
    locale,
    t: (key: TranslationKey) => t(locale, key),
  }
}
