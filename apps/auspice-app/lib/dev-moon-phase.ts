/**
 * DEV moon-phase override — shared across Home logo, /display previews, and
 * the native WidgetKit extension (App Group). Production ignores.
 *
 * Critical: ExtensionStorage.set(number) uses setInt and truncates 0.25/0.5 → 0.
 * Always persist phase as a STRING. Dual-write via SharedGroupPreferences JS
 * wrapper + patch envelope days.moonPhase, then reloadWidget.
 */

import { ExtensionStorage } from '@bacons/apple-targets'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  WIDGET_PAYLOAD_KEY,
  YUUN_LEGACY_DAYS_KEY,
} from '@zhop/widget-kit-ios'
import { useCallback, useEffect, useState } from 'react'
import { Platform } from 'react-native'

const STORAGE_KEY = 'auspice.dev.moonPhase'
/** App Group key read by AuspiceWidget Swift (`targets/widget/index.swift`). */
export const DEV_MOON_PHASE_APP_GROUP_KEY = 'yuun_dev_moon_phase'
const APP_GROUP = 'group.com.hexastral.yuun'

type Listener = (phase: number | null) => void
const listeners = new Set<Listener>()

function emit(phase: number | null) {
  for (const l of listeners) l(phase)
}

type SharedGroupApi = {
  setItem: (key: string, value: unknown, appGroup: string) => Promise<void>
  getItem: <T = unknown>(key: string, appGroup: string) => Promise<T>
}

function loadSharedGroup(): SharedGroupApi | null {
  try {
    // biome-ignore lint/style/noCommonJs: optional native peer
    const mod = require('react-native-shared-group-preferences') as {
      default?: SharedGroupApi
    } & SharedGroupApi
    const api = mod?.default ?? mod
    if (api && typeof api.setItem === 'function') return api
    return null
  } catch {
    return null
  }
}

function clampPhase(phase: number): number {
  return Math.min(0.999, Math.max(0, phase))
}

async function patchEnvelopeMoonPhase(phase: number | null): Promise<void> {
  if (Platform.OS !== 'ios') return
  const shared = loadSharedGroup()
  if (!shared) return

  try {
    const raw = await shared.getItem<unknown>(WIDGET_PAYLOAD_KEY, APP_GROUP)
    if (raw == null) return
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw)
    const envelope = JSON.parse(text) as {
      updatedAt?: string
      data?: { days?: Array<{ moonPhase?: number; [k: string]: unknown }> }
      [k: string]: unknown
    }
    const days = envelope.data?.days
    if (!Array.isArray(days) || days.length === 0) return
    if (phase == null) return

    const next = clampPhase(phase)
    envelope.data = {
      ...envelope.data,
      days: days.map((d) => ({ ...d, moonPhase: next })),
    }
    envelope.updatedAt = new Date().toISOString()
    const serialized = JSON.stringify(envelope)
    await shared.setItem(WIDGET_PAYLOAD_KEY, serialized, APP_GROUP)
    await shared.setItem(YUUN_LEGACY_DAYS_KEY, JSON.stringify({ days: envelope.data.days }), APP_GROUP)
  } catch (err) {
    console.warn('[dev-moon-phase] payload patch failed', err)
  }
}

async function writeAppGroupPhase(phase: number | null): Promise<void> {
  if (Platform.OS !== 'ios') return

  // 1) ExtensionStorage — STRING only (set(number) → setInt truncates fractions).
  try {
    const storage = new ExtensionStorage(APP_GROUP)
    if (phase == null) {
      storage.remove(DEV_MOON_PHASE_APP_GROUP_KEY)
    } else {
      storage.set(DEV_MOON_PHASE_APP_GROUP_KEY, String(clampPhase(phase)))
    }
  } catch (err) {
    console.warn('[dev-moon-phase] ExtensionStorage write failed', err)
  }

  // 2) SharedGroupPreferences JS wrapper (Promise API over native callbacks).
  try {
    const shared = loadSharedGroup()
    if (shared) {
      if (phase == null) {
        await shared.setItem(DEV_MOON_PHASE_APP_GROUP_KEY, '', APP_GROUP)
      } else {
        await shared.setItem(DEV_MOON_PHASE_APP_GROUP_KEY, String(clampPhase(phase)), APP_GROUP)
      }
    } else {
      console.warn('[dev-moon-phase] SharedGroupPreferences unavailable')
    }
  } catch (err) {
    console.warn('[dev-moon-phase] SharedGroup write failed', err)
  }

  await patchEnvelopeMoonPhase(phase)

  try {
    ExtensionStorage.reloadWidget()
    ExtensionStorage.reloadWidget('AuspiceWidget')
    ExtensionStorage.reloadWidget('YuunWatch')
  } catch (err) {
    console.warn('[dev-moon-phase] reloadWidget failed', err)
  }

  try {
    // biome-ignore lint/style/noCommonJs: optional native module
    const { requireNativeModule } = require('expo-modules-core') as {
      requireNativeModule: <T>(name: string) => T
    }
    const native = requireNativeModule<{ syncWatchAppGroup?: (suite: string) => void }>(
      'WidgetKitIos'
    )
    native.syncWatchAppGroup?.(APP_GROUP)
  } catch {
    // Watch sync optional in DEV
  }
}

export async function getDevMoonPhase(): Promise<number | null> {
  if (!__DEV__) return null
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY)
    if (v == null || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? clampPhase(n) : null
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
      await AsyncStorage.setItem(STORAGE_KEY, String(clampPhase(phase)))
    }
  } catch {
    // ignore
  }
  await writeAppGroupPhase(phase)
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
        void writeAppGroupPhase(p)
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
