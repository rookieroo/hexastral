/**
 * Numerology-app i18n (Phase D.1).
 *
 * Single-language English at v0.1 per the satellite playbook (ROADMAP §6.5):
 * we only translate when a second locale is asked for. The shape mirrors
 * coin-cast-app/lib/i18n.ts so a future translator can add zh / ja / zh-Hant
 * by adding objects with the same keys.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { getLocales } from 'expo-localization'
import { useEffect, useState } from 'react'

const LOCALE_STORAGE_KEY = 'numerology_locale'

const EN = {
  homeTitle: 'Numerology',
  homeTagline: 'See the numbers behind your name and birth date.',
  homeStartCta: 'Calculate',
  homeSettingsCta: 'Settings',

  computeTitle: 'Tell us a little about you',
  computeNameLabel: 'Full name (as written on your ID)',
  computeNamePlaceholder: 'e.g. Albert Einstein',
  computeNameHelper: 'Used for Expression / Soul-Urge / Personality numbers.',
  computeBirthLabel: 'Date of birth',
  computeSubmit: 'Reveal numbers',
  computeBusy: 'Computing…',
  computeError: 'Something went wrong. Please try again.',

  resultTitle: 'Your numbers',
  resultLifePath: 'Life-Path',
  resultLifePathSub: 'The shape of your journey',
  resultBirthday: 'Birthday',
  resultBirthdaySub: 'A gift you bring with you',
  resultExpression: 'Expression',
  resultExpressionSub: 'How you naturally show up',
  resultSoulUrge: 'Soul-Urge',
  resultSoulUrgeSub: 'What you secretly want',
  resultPersonality: 'Personality',
  resultPersonalitySub: 'How others first see you',
  resultPersonalYear: 'Personal Year',
  resultPersonalYearSub: 'The flavor of this calendar year',
  resultMaster: 'Master',
  resultRecompute: 'Compute another',

  settingsTitle: 'Settings',
  settingsLanguage: 'Language',
  settingsAbout: 'About',
} as const

type Strings = typeof EN
type Key = keyof Strings

const TABLES: Record<string, Strings> = { en: EN }

let currentLocale: 'en' = 'en'
const listeners = new Set<(loc: 'en') => void>()

function detectLocale(): 'en' {
  // v0.1 ships English-only — but we still call expo-localization so a future
  // translator only has to add a TABLES entry, not change the call site.
  try {
    const first = getLocales()[0]
    void first
    return 'en'
  } catch {
    return 'en'
  }
}

export function useI18n() {
  const [locale, setLocale] = useState<'en'>(currentLocale)

  useEffect(() => {
    AsyncStorage.getItem(LOCALE_STORAGE_KEY)
      .then((stored) => {
        if (stored && stored in TABLES) {
          currentLocale = stored as 'en'
          setLocale(stored as 'en')
        } else {
          currentLocale = detectLocale()
          setLocale(currentLocale)
        }
      })
      .catch(() => {})
    listeners.add(setLocale)
    return () => {
      listeners.delete(setLocale)
    }
  }, [])

  const t = (key: Key, params?: Record<string, string | number>): string => {
    const table = TABLES[locale] ?? TABLES.en
    let str = (table?.[key] ?? EN[key] ?? key) as string
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replaceAll(`{${k}}`, String(v))
      }
    }
    return str
  }

  return { t, locale }
}
