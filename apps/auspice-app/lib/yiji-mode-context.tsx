/**
 * React context for 宜忌 display mode (modern / traditional).
 *
 * 2026-06 convergence: the register now derives from the 「黄历原声」 voice
 * switch for zh (classical → traditional 文言, contemporary → modern 白话).
 * Non-zh has no switch and always uses the locale's vernacular gloss. The
 * legacy AsyncStorage override is kept only as a migration seed; the Settings
 * row for it has been removed.
 */

import { defaultYijiModeForLocale, type YijiVocabularyMode } from '@zhop/astro-core'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useStrings } from './i18n-context'
import { useVoiceMode } from './voice-mode-context'
import {
  hydrateYijiModeOverride,
  resolveRegisterSync,
  setYijiModeOverride,
  subscribeYijiModeOverride,
} from './yiji-display-mode'

interface YijiModeContextValue {
  /** Effective mode for formatting — voice-derived for zh, locale gloss for non-zh. */
  mode: YijiVocabularyMode
  /** Explicit user override; null = locale default (legacy seed only). */
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
  const { classical } = useVoiceMode()
  if (ctx) {
    return {
      ...ctx,
      mode: resolveRegisterSync(locale, classical),
    }
  }
  // Safe fallback when used outside providers (tests / edge screens).
  return {
    mode: resolveRegisterSync(locale, classical),
    override: null,
    setMode: async () => {},
    isDefault: true,
  }
}
