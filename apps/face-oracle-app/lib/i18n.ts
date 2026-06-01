import AsyncStorage from '@react-native-async-storage/async-storage'
import { getLocales } from 'expo-localization'
import { useEffect, useState } from 'react'

const LOCALE_STORAGE_KEY = 'satellite_locale'

const DICT: Record<string, Record<string, string>> = {
  en: {
    homePrimaryCta: 'Start now',
    restorePurchases: 'Restore purchases',
  },
  zh: {
    homePrimaryCta: '立即开始',
    restorePurchases: '恢复购买',
  },
  ja: {
    homePrimaryCta: '開始する',
    restorePurchases: '購入を復元',
  },
  ko: {
    homePrimaryCta: '시작하기',
    restorePurchases: '구매 복원',
  },
  de: {
    homePrimaryCta: 'Jetzt starten',
    restorePurchases: 'Käufe wiederherstellen',
  },
  es: {
    homePrimaryCta: 'Comenzar',
    restorePurchases: 'Restaurar compras',
  },
  vi: {
    homePrimaryCta: 'Bắt đầu',
    restorePurchases: 'Khôi phục mua hàng',
  },
  th: {
    homePrimaryCta: 'เริ่มเลย',
    restorePurchases: 'กู้คืนการซื้อ',
  },
  'zh-Hant': {
    homePrimaryCta: '立即開始',
    restorePurchases: '恢復購買',
  },
}

function normalizeLocale(input: string): string {
  if (DICT[input]) return input
  const base = input.split('-')[0] ?? 'en'
  return DICT[base] ? base : 'en'
}

export function useSatelliteI18n() {
  const [locale, setLocale] = useState('en')

  useEffect(() => {
    ;(async () => {
      const saved = await AsyncStorage.getItem(LOCALE_STORAGE_KEY)
      const fallback = getLocales()[0]?.languageTag ?? 'en'
      setLocale(normalizeLocale(saved ?? fallback))
    })()
  }, [])

  const fallback = DICT.en ?? {}
  const t = (key: keyof (typeof DICT)['en']): string => DICT[locale]?.[key] ?? fallback[key] ?? key

  return { locale, t }
}
