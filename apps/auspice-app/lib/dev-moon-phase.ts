/**
 * DEV moon-phase override — shared across Home logo, /display previews, and
 * the native WidgetKit extension (App Group). Production ignores.
 */

import { ExtensionStorage } from '@bacons/apple-targets'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'auspice.dev.moonPhase'
/** App Group key read by AuspiceWidget Swift (`targets/widget/index.swift`). */
export const DEV_MOON_PHASE_APP_GROUP_KEY = 'yuun_dev_moon_phase'
const APP_GROUP = 'group.com.hexastral.yuun'

type Listener = (phase: number | null) => void
const listeners = new Set<Listener>()

function emit(phase: number | null) {
  for (const l of listeners) l(phase)
}

function writeAppGroupPhase(phase: number | null): void {
  try {
    const storage = new ExtensionStorage(APP_GROUP)
    if (phase == null) {
      storage.remove(DEV_MOON_PHASE_APP_GROUP_KEY)
    } else {
      storage.set(DEV_MOON_PHASE_APP_GROUP_KEY, phase)
    }
    ExtensionStorage.reloadWidget()
  } catch {
    // Best-effort before native module is linked
  }
}

export async function getDevMoonPhase(): Promise<number | null> {
  if (!__DEV__) return null
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY)
    if (v == null || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? Math.min(0.999, Math.max(0, n)) : null
  } catch {
    return null
  }
}

export async function setDevMoonPhase(phase: number | null): Promise<void> {
  if (!__DEV__) return
  try {
    if (phase == null) {
      await AsyncStorage.removeItem(STORAGE_KEY)
    } else {
      const clamped = Math.min(0.999, Math.max(0, phase))
      await AsyncStorage.setItem(STORAGE_KEY, String(clamped))
    }
  } catch {
    // ignore
  }
  writeAppGroupPhase(phase)
  emit(phase)
}

/** Subscribe + local state for Home / WatchSettings. */
export function useDevMoonPhase(): {
  phase: number | null
  setPhase: (phase: number | null) => void
} {
  const [phase, setPhaseState] = useState<number | null>(null)

  useEffect(() => {
    if (!__DEV__) return
    let cancelled = false
    getDevMoonPhase().then((p) => {
      if (!cancelled) {
        setPhaseState(p)
        // Re-push to App Group so widget matches after cold start
        writeAppGroupPhase(p)
      }
    })
    const onChange: Listener = (p) => setPhaseState(p)
    listeners.add(onChange)
    return () => {
      cancelled = true
      listeners.delete(onChange)
    }
  }, [])

  const setPhase = useCallback((p: number | null) => {
    setPhaseState(p)
    void setDevMoonPhase(p)
  }, [])

  return { phase: __DEV__ ? phase : null, setPhase }
}
