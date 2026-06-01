/**
 * Locale context — resolves the device locale on first launch, lets the Me screen
 * override it, and persists the choice. `useStrings()` is the single read API.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { getStrings, type Locale, resolveLocale, type Strings } from './i18n'

const STORAGE_KEY = 'cycle.locale'

interface LocaleCtx {
  locale: Locale
  t: Strings
  setLocale: (l: Locale) => void
}

const LocaleContext = createContext<LocaleCtx | null>(null)

function isLocale(v: string | null): v is Locale {
  return v === 'zh-Hans' || v === 'zh-Hant' || v === 'ja' || v === 'en'
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => resolveLocale())

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (isLocale(v)) setLocaleState(v)
      })
      .catch(() => {})
  }, [])

  const value = useMemo<LocaleCtx>(
    () => ({
      locale,
      t: getStrings(locale),
      setLocale: (l: Locale) => {
        setLocaleState(l)
        AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {})
      },
    }),
    [locale]
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useStrings(): LocaleCtx {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useStrings must be used within <LocaleProvider>')
  return ctx
}
