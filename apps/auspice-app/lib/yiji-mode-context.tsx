/**
 * React context for 宜忌 display mode (modern / traditional).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { defaultYijiModeForLocale, type YijiVocabularyMode } from '@zhop/astro-core'
import { useStrings } from './i18n-context'
import {
  getYijiModeOverride,
  hydrateYijiModeOverride,
  setYijiModeOverride,
  subscribeYijiModeOverride,
} from './yiji-display-mode'

interface YijiModeContextValue {
  /** Effective mode for formatting. */
  mode: YijiVocabularyMode
  /** Explicit user override; null = locale default. */
  override: YijiVocabularyMode | null
  setMode: (mode: YijiVocabularyMode) => Promise<void>
  /** True when using locale default (no AsyncStorage override). */
  isDefault: boolean
}

const YijiModeContext = createContext<YijiModeContextValue | null>(null)

export function YijiModeProvider({ children }: { children: ReactNode }) {
  const { locale } = useStrings()
  const [override, setOverride] = useState<YijiVocabularyMode | null>(null)

  useEffect(() => {
    void hydrateYijiModeOverride().then(setOverride)
    return subscribeYijiModeOverride(setOverride)
  }, [])

  const setMode = useCallback(async (mode: YijiVocabularyMode) => {
    await setYijiModeOverride(mode)
  }, [])

  const mode = override ?? defaultYijiModeForLocale(locale)

  const value = useMemo(
    () => ({
      mode,
      override,
      setMode,
      isDefault: override === null,
    }),
    [mode, override, setMode]
  )

  return <YijiModeContext.Provider value={value}>{children}</YijiModeContext.Provider>
}

export function useYijiDisplayMode(): YijiModeContextValue {
  const ctx = useContext(YijiModeContext)
  const { locale } = useStrings()
  if (ctx) return ctx
  // Safe fallback when used outside provider (tests / edge screens).
  return {
    mode: defaultYijiModeForLocale(locale),
    override: null,
    setMode: async () => {},
    isDefault: true,
  }
}
