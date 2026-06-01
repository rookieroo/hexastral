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
  homeTagline: 'Eastern number divination — cast a hexagram in a single tap.',
  homeStartCta: 'Cast',
  homeSettingsCta: 'Settings',

  computeTitle: 'Cast a hexagram',
  computeIntro:
    'A 1000-year-old Chinese divination method (梅花易数). Hold a question in mind, optionally write down a number that came to you, then cast.',
  computeQuestionLabel: 'Your question (optional)',
  computeQuestionPlaceholder: "e.g. Should I take the new role I'm being offered?",
  computeQuestionHelper:
    'The cast still works without one — but a clear question sharpens the reading.',
  computeNumberLabel: 'A number on your mind (optional)',
  computeNumberPlaceholder: '0-9999',
  computeNumberHelper:
    'Use the first number that pops up. If blank, the cast uses the current moment alone.',
  computeSubmit: 'Cast',
  computeBusy: 'Casting…',
  computeError: 'Something went wrong. Please try again.',

  resultTitle: 'Your cast',
  resultSaved: 'saved',
  resultUpperTrigram: 'Upper',
  resultLowerTrigram: 'Lower',
  resultChangingLine: 'Changing line',
  resultBodyUseLabel: 'Subject vs object',
  resultBody: 'Subject (体)',
  resultUse: 'Object (用)',
  resultNuclearLabel: 'Nuclear hexagram (互卦)',
  resultNuclearHelper:
    'Derived from lines 2-4 (lower) and 3-5 (upper) — reveals the hidden tendency inside the situation.',
  resultRecompute: 'Cast another',
  resultShare: 'Share',
  resultShareTitle: 'Meihua cast',

  // Five-phase relation between 体 and 用 trigrams
  relationGreat: '用生体 · auspicious — the matter feeds you',
  relationGood: '体克用 · favorable — you master the matter',
  relationNeutral: '比和 · neutral — balanced energies',
  relationCaution: '体生用 · cautionary — you give energy to it',
  relationBad: '用克体 · unfavorable — the matter weighs on you',

  settingsTitle: 'Settings',
  settingsLanguage: 'Language',
  settingsAbout: 'About',

  // ── Tier-1 satellite shell (onboarding / me / history / paywall) ──
  onboardKicker: 'HEXASTRAL SATELLITE',
  onboardSubtitle:
    'Eastern numerology — 梅花易数, the Chinese plum-blossom method by Shao Yong (1011 – 1077). Cast a hexagram from a question and a number, read the body/use trigrams and their five-phase relation, and see the hidden tendency in the nuclear hexagram.',
  onboardGetStarted: 'Get Started',
  onboardContinue: 'Continue',
  onboardBack: 'Back',

  stackMe: 'Me',
  stackHistory: 'History',
  stackPaywall: 'Numerology Pro',
  stackSettings: 'Settings',

  meHistoryTitle: 'Cast history',
  meEmpty: 'No casts yet.',
  meViewAllHistory: 'View all history',
  meSettings: 'Settings',
  meUpgrade: 'Upgrade to Pro',
  restorePurchases: 'Restore purchases',
  mePrivacy: 'Privacy policy',
  meSignOut: 'Sign out',
  meSignInSectionTitle: 'Sign in',
  meSignInHint: 'Use Apple to sync cast history across your devices.',
  meAppleContinue: 'Continue with Apple',
  meApplePreparing: 'Preparing sign-in…',
  meAppleUnavailable:
    'Apple sign-in needs a development or App Store build (not available in Expo Go).',
  meSignInIosOnly: 'Apple sign-in is available on iOS to sync history.',
  mePromoBody: 'Cross-reference your casts with your full natal chart in the flagship app.',
  mePromoCta: 'Open HexAstral',

  paywallUnlock: 'Unlock Pro',
  paywallRestore: 'Restore purchases',
  paywallRestoreRow: 'restore',
  paywallPlanMonthly: 'Monthly Pro',
  paywallPlanAnnual: 'Annual Pro',
} as const

type Strings = typeof EN
type Key = keyof Strings

const TABLES: Record<string, Strings> = { en: EN }

let currentLocale = 'en' as const
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
