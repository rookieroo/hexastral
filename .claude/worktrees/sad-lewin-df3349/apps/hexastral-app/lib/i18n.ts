/**
 * 多语言 Hook
 *
 * MVP 仅暴露完整翻译的 4 种语言：简体中文、繁体中文、英文、日文。
 * 其它语言的翻译文件保留在 locales/ 下供未来启用，但不出现在选择器/检测中。
 * 默认 en（美区上架 App）。可通过 AsyncStorage 手动覆盖。
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { getLocales } from 'expo-localization'
import { useCallback, useEffect, useState } from 'react'
import { en } from '@/locales/en'
import { ja } from '@/locales/ja'
import type { TranslationKeys } from '@/locales/zh'
import { zh } from '@/locales/zh'
import { zhHant } from '@/locales/zh-Hant'

export type { TranslationKeys }

const LOCALE_STORAGE_KEY = 'hexastral_locale'

type SupportedLocale = 'zh' | 'zh-Hant' | 'en' | 'ja'

const SUPPORTED_LOCALES: SupportedLocale[] = ['zh', 'zh-Hant', 'en', 'ja']

const translations: Record<SupportedLocale, Record<TranslationKeys, string>> = {
  zh,
  'zh-Hant': zhHant,
  en,
  ja,
}

/** 检测设备首选语言 */
function detectLocale(): SupportedLocale {
  try {
    const locales = getLocales()
    const first = locales[0]
    if (!first) return 'en'

    const lang = first.languageCode ?? ''
    const tag = first.languageTag ?? ''

    // 繁体中文 (zh-Hant, zh-TW, zh-HK)
    if (
      lang === 'zh' &&
      (tag.includes('Hant') || first.regionCode === 'TW' || first.regionCode === 'HK')
    ) {
      return 'zh-Hant'
    }
    // 简体中文
    if (lang === 'zh') return 'zh'
    // 日语
    if (lang === 'ja') return 'ja'
    // 英语 (含 en-US / en-GB / 等)
    if (lang === 'en') return 'en'

    // 其余语言（韩/德/西/越/泰...）MVP 阶段统一回退英语
    return 'en'
  } catch {
    return 'en'
  }
}

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale)
}

let currentLocale: SupportedLocale | null = null
const localeListeners = new Set<(locale: SupportedLocale) => void>()

export function useI18n() {
  const [locale, setLocale] = useState<SupportedLocale>(currentLocale ?? detectLocale())

  useEffect(() => {
    // 从 AsyncStorage 读取用户手动设置的语言
    if (!currentLocale) {
      AsyncStorage.getItem(LOCALE_STORAGE_KEY).then((stored) => {
        if (stored && isSupportedLocale(stored)) {
          currentLocale = stored
          setLocale(stored)
        } else {
          currentLocale = detectLocale()
          setLocale(currentLocale)
        }
      })
    }

    localeListeners.add(setLocale)
    return () => {
      localeListeners.delete(setLocale)
    }
  }, [])

  const t = useCallback(
    (key: TranslationKeys, params?: Record<string, string | number>): string => {
      let str = translations[locale]?.[key] ?? translations.en[key] ?? key
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          str = str.replaceAll(`{${k}}`, String(v))
        }
      }
      return str
    },
    [locale]
  )

  const changeLocale = useCallback(async (newLocale: SupportedLocale) => {
    currentLocale = newLocale
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, newLocale)
    for (const listener of localeListeners) {
      listener(newLocale)
    }
  }, [])

  return { t, locale, changeLocale, locales: SUPPORTED_LOCALES }
}

/** 语言显示名称 */
export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  zh: '简体中文',
  'zh-Hant': '繁體中文',
  en: 'English',
  ja: '日本語',
}
