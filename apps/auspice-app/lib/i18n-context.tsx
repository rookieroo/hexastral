/**
 * Locale context — resolves the device locale on first launch, lets the Me screen
 * override it, and persists the choice. `useStrings()` is the single read API.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { getStrings, type Locale, resolveLocale, type Strings } from './i18n'

const STORAGE_KEY = 'auspice.locale'

interface LocaleCtx {
  locale: Locale
  t: Strings
  setLocale: (l: Locale) => void
  /** Clear the manual override and fall back to the device locale. */
  followSystem: () => void
  /** True when a manual locale override is active (vs. following the device). */
  isOverridden: boolean
}

const LocaleContext = createContext<LocaleCtx | null>(null)

function isLocale(v: string | null): v is Locale {
  return v === 'zh-Hans' || v === 'zh-Hant' || v === 'ja' || v === 'en'
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => resolveLocale())
  // Whether a manual override (from the DEV picker) is in effect. When false the
  // app follows the device locale, so a device-locale change is picked up on the
  // next cold launch (and re-registered for push by the app-open effect).
  const [overridden, setOverridden] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (isLocale(v)) {
          setLocaleState(v)
          setOverridden(true)
        }
      })
      .catch(() => {})
  }, [])

  const value = useMemo<LocaleCtx>(
    () => ({
      locale,
      isOverridden: overridden,
      t: getStrings(locale),
      setLocale: (l: Locale) => {
        setLocaleState(l)
        setOverridden(true)
        AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {})
      },
      followSystem: () => {
        setLocaleState(resolveLocale())
        setOverridden(false)
        AsyncStorage.removeItem(STORAGE_KEY).catch(() => {})
      },
    }),
    [locale, overridden]
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useStrings(): LocaleCtx {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useStrings must be used within <LocaleProvider>')
  return ctx
}
