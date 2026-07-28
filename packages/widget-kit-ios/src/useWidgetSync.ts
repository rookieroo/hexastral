/**
 * useWidgetSync — RN-side hook that writes the widget payload to a shared
 * App Group UserDefaults so the iOS WidgetExtension can read it.
 *
 * Bridge order:
 * 1. react-native-shared-group-preferences (RNSharedGroupPreferences)
 * 2. AsyncStorage fallback (RN tests only — extension cannot read it)
 */

import { useEffect, useRef } from 'react'
import { NativeModules, Platform } from 'react-native'

import {
  type AppSlug,
  appGroupForSlug,
  WIDGET_PAYLOAD_KEY,
  type WidgetLocale,
  type WidgetSyncPayload,
  YUUN_LEGACY_DAYS_KEY,
} from './types'

type AsyncStorageLike = {
  setItem: (key: string, value: string) => Promise<void>
}

interface SharedGroupNativeModule {
  setItem: (key: string, value: string, appGroup: string) => Promise<void>
}

function loadAsyncStorage(): AsyncStorageLike | null {
  try {
    // Optional peer — avoid static import so non-widget apps stay light.
    // biome-ignore lint/style/noCommonJs: optional peer dynamic load
    const mod = require('@react-native-async-storage/async-storage') as {
      default?: AsyncStorageLike
    } & AsyncStorageLike
    if (mod?.default && typeof mod.default.setItem === 'function') return mod.default
    if (typeof mod?.setItem === 'function') return mod
    return null
  } catch {
    return null
  }
}

function loadSharedGroup(): SharedGroupNativeModule | null {
  const native = (NativeModules as { RNSharedGroupPreferences?: SharedGroupNativeModule })
    .RNSharedGroupPreferences
  return native ?? null
}

export type WriteWidgetOptions = {
  /** Override App Group (Yuun uses group.com.hexastral.yuun). */
  appGroupId?: string
  /**
   * Also mirror Yuun `days` array under legacy key `almanac_days` so older
   * Swift scaffolds keep working during migration.
   */
  mirrorLegacyYuunDays?: boolean
}

async function persistPayload(
  appSlug: AppSlug,
  serialized: string,
  options?: WriteWidgetOptions
): Promise<void> {
  const group = options?.appGroupId ?? appGroupForSlug(appSlug)
  const shared = loadSharedGroup()
  if (shared) {
    await shared.setItem(WIDGET_PAYLOAD_KEY, serialized, group)
    if (options?.mirrorLegacyYuunDays && appSlug === 'yuun') {
      try {
        const parsed = JSON.parse(serialized) as WidgetSyncPayload<{ days?: unknown }>
        const days = parsed.data?.days
        if (Array.isArray(days)) {
          await shared.setItem(YUUN_LEGACY_DAYS_KEY, JSON.stringify({ days }), group)
        }
      } catch {
        // ignore mirror failure
      }
    }
    return
  }

  const storage = loadAsyncStorage()
  if (storage) {
    await storage.setItem(`@hexastral/widget-payload/${appSlug}`, serialized)
  }
}

/**
 * Hook: writes the given widget payload whenever `data` changes.
 */
export function useWidgetSync<TData>(
  appSlug: AppSlug,
  locale: WidgetLocale,
  data: TData | null,
  freshUntil?: string,
  options?: WriteWidgetOptions
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
    if (lastWriteRef.current === serialized) return
    lastWriteRef.current = serialized

    void persistPayload(appSlug, serialized, options).catch((err: unknown) => {
      console.warn('[widget-kit-ios] App Group write failed:', err)
    })
  }, [appSlug, locale, data, freshUntil, options])
}

/**
 * Imperative write — call outside a React tree (e.g. after day fetch).
 */
export async function writeWidgetPayload<TData>(
  appSlug: AppSlug,
  locale: WidgetLocale,
  data: TData,
  freshUntil?: string,
  options?: WriteWidgetOptions
): Promise<void> {
  if (Platform.OS !== 'ios') return

  const payload: WidgetSyncPayload<TData> = {
    updatedAt: new Date().toISOString(),
    appSlug,
    locale,
    data,
    freshUntil,
  }
  await persistPayload(appSlug, JSON.stringify(payload), options)
}
