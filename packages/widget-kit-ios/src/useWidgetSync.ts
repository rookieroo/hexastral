/**
 * useWidgetSync — RN-side hook that writes the widget payload to a shared
 * App Group UserDefaults so the iOS WidgetExtension can read it.
 *
 * On Android / Web: no-op (widget is iOS-only for V1; Android widgets
 * are a V1.5+ consideration).
 *
 * The actual bridge to App Group UserDefaults requires a native module
 * (since RN AsyncStorage uses sandboxed app-only storage, not App Group).
 * In V1 Sprint 1, we ship the hook stub + write to AsyncStorage as a
 * fallback so RN-side tests pass; Sprint 5 wires the real native bridge.
 */

import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'

import {
  type AppSlug,
  type WidgetLocale,
  type WidgetSyncPayload,
  WIDGET_PAYLOAD_KEY,
  appGroupForSlug,
} from './types'

type AsyncStorageLike = {
  setItem: (key: string, value: string) => Promise<void>
  getItem: (key: string) => Promise<string | null>
  removeItem: (key: string) => Promise<void>
}

/**
 * Lazy-load AsyncStorage so this package works in environments where it
 * isn't installed (e.g. apps that never call useWidgetSync).
 */
function loadAsyncStorage(): AsyncStorageLike | null {
  try {
    // biome-ignore lint/security/noGlobalEval: dynamic require is intentional
    const req = (typeof require !== 'undefined' ? require : null) as
      | ((mod: string) => unknown)
      | null
    if (!req) return null
    const mod = req('@react-native-async-storage/async-storage')
    const candidate = (mod as { default?: AsyncStorageLike } | AsyncStorageLike) ?? null
    if (!candidate) return null
    if ('setItem' in candidate && typeof candidate.setItem === 'function') {
      return candidate
    }
    if ('default' in candidate && candidate.default) {
      return candidate.default
    }
    return null
  } catch {
    return null
  }
}

/**
 * Lazy-load the native App Group bridge module (Sprint 5 native impl).
 * Returns null if the native module isn't installed yet (Sprint 1 fallback).
 */
function loadAppGroupBridge(): {
  writeToAppGroup: (group: string, key: string, value: string) => Promise<void>
} | null {
  try {
    const req = (typeof require !== 'undefined' ? require : null) as
      | ((mod: string) => unknown)
      | null
    if (!req) return null
    // The native module name. Will exist after Sprint 1 prebuild generates the
    // WidgetExtension target + App Group bridge.
    const mod = req('react-native-app-group-bridge') as
      | { writeToAppGroup: (group: string, key: string, value: string) => Promise<void> }
      | null
    return mod ?? null
  } catch {
    return null
  }
}

/**
 * Hook: writes the given widget payload to the App Group (Sprint 5+) or to
 * AsyncStorage (Sprint 1 fallback) whenever `payload` changes.
 *
 * Call this from any component that has the data needed for the widget.
 * Typically called once at the top of the Today tab (cycle) or main route.
 */
export function useWidgetSync<TData>(
  appSlug: AppSlug,
  locale: WidgetLocale,
  data: TData | null,
  freshUntil?: string
): void {
  const lastWriteRef = useRef<string | null>(null)

  useEffect(() => {
    if (Platform.OS !== 'ios') return
    if (!data) return

    const payload: WidgetSyncPayload<TData> = {
      updatedAt: new Date().toISOString(),
      appSlug,
      locale,
      data,
      freshUntil,
    }

    const serialized = JSON.stringify(payload)

    // Idempotency: skip if identical to last write
    if (lastWriteRef.current === serialized) return
    lastWriteRef.current = serialized

    const group = appGroupForSlug(appSlug)
    const bridge = loadAppGroupBridge()
    if (bridge) {
      void bridge.writeToAppGroup(group, WIDGET_PAYLOAD_KEY, serialized).catch((err: unknown) => {
        console.warn('[widget-kit-ios] App Group write failed:', err)
      })
      return
    }

    // Sprint 1 fallback: write to AsyncStorage. WidgetExtension cannot
    // actually read this (different sandbox), but RN-side tests and any
    // future swap to a real bridge will keep API stable.
    const storage = loadAsyncStorage()
    if (storage) {
      void storage.setItem(`@hexastral/widget-payload/${appSlug}`, serialized).catch(() => {
        // ignore
      })
    }
  }, [appSlug, locale, data, freshUntil])
}

/**
 * Imperative version of useWidgetSync — call when you need to update outside
 * a React tree (e.g. from a push notification handler).
 */
export async function writeWidgetPayload<TData>(
  appSlug: AppSlug,
  locale: WidgetLocale,
  data: TData,
  freshUntil?: string
): Promise<void> {
  if (Platform.OS !== 'ios') return

  const payload: WidgetSyncPayload<TData> = {
    updatedAt: new Date().toISOString(),
    appSlug,
    locale,
    data,
    freshUntil,
  }
  const serialized = JSON.stringify(payload)
  const group = appGroupForSlug(appSlug)
  const bridge = loadAppGroupBridge()
  if (bridge) {
    await bridge.writeToAppGroup(group, WIDGET_PAYLOAD_KEY, serialized)
    return
  }

  const storage = loadAsyncStorage()
  if (storage) {
    await storage.setItem(`@hexastral/widget-payload/${appSlug}`, serialized)
  }
}
