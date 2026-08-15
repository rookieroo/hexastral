/**
 * React context for the app-wide voice mode (「黄历原声」 classical vs contemporary).
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { getVoiceMode, setVoiceMode, subscribeVoiceMode, type VoiceMode } from './voice-mode'

interface VoiceModeContextValue {
  mode: VoiceMode
  /** Convenience flag — the classical (文言/黄历原声) register is on. */
  classical: boolean
  setMode: (mode: VoiceMode) => Promise<void>
}

const VoiceModeContext = createContext<VoiceModeContextValue | null>(null)

export function VoiceModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<VoiceMode>('contemporary')

  useEffect(() => {
    void getVoiceMode().then(setModeState)
    return subscribeVoiceMode(setModeState)
  }, [])

  const setMode = useCallback(async (next: VoiceMode) => {
    await setVoiceMode(next)
  }, [])

  const value = useMemo(() => ({ mode, classical: mode === 'classical', setMode }), [mode, setMode])

  return <VoiceModeContext.Provider value={value}>{children}</VoiceModeContext.Provider>
}

export function useVoiceMode(): VoiceModeContextValue {
  const ctx = useContext(VoiceModeContext)
  if (ctx) return ctx
  // Safe fallback outside the provider (tests / edge screens).
  return { mode: 'contemporary', classical: false, setMode: async () => {} }
}
