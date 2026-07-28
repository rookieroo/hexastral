/**
 * useWidgetSync — RN-side hook that writes the widget payload to a shared
 * App Group UserDefaults so the iOS WidgetExtension can read it.
 *
 * Bridge order:
 * 1. react-native-shared-group-preferences (JS wrapper — native is callback-based)
 * 2. AsyncStorage fallback (RN tests only — extension cannot read it)
 *
 * After write: flush App Group + WidgetCenter.reloadAllTimelines() so the
 * home-screen widget does not keep a stale TimelineEntry until the next day.
 */

import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'

import {
  type AppSlug,
  appGroupForSlug,
  WIDGET_PAYLOAD_KEY,
  type WidgetLocale,
  type WidgetSyncPayload,
  YUUN_LEGACY_DAYS_KEY,
  YUUN_WIDGET_LOCALE_KEY,
  YUUN_WIDGET_TIP_LABEL_KEY,
} from './types'

type AsyncStorageLike = {
  setItem: (key: string, value: string) => Promise<void>
}

type SharedGroupApi = {
  setItem: (key: string, value: unknown, appGroup: string) => Promise<void>
  getItem: <T = unknown>(key: string, appGroup: string) => Promise<T>
}

type WidgetKitIosNative = {
  reloadTimelines: () => void
  flushAppGroup: (suiteName: string) => void
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

function loadSharedGroup(): SharedGroupApi | null {
  try {
    // Must use the JS class — NativeModules methods are callback-style, not Promises.
    // biome-ignore lint/style/noCommonJs: optional peer dynamic load
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

function loadWidgetKitNative(): WidgetKitIosNative | null {
  try {
    // biome-ignore lint/style/noCommonJs: optional native module
    const { requireNativeModule } = require('expo-modules-core') as {
      requireNativeModule: <T>(name: string) => T
    }
    return requireNativeModule<WidgetKitIosNative>('WidgetKitIos')
  } catch {
    return null
  }
}

function tipLabelFromPayload(serialized: string, locale: WidgetLocale): string {
  // en: no tip chrome (body only) — clear any stale 日签 in App Group.
  if (locale === 'en') return ''
  try {
    const parsed = JSON.parse(serialized) as WidgetSyncPayload<{
      days?: Array<{ tipLabel?: string | null }>
    }>
    const fromDay = parsed.data?.days?.[0]?.tipLabel
    if (typeof fromDay === 'string' && fromDay.length > 0) return fromDay
  } catch {
    // fall through
  }
  if (locale === 'ja') return '一言'
  if (locale === 'zh-Hant') return '日籤'
  return '日签'
}

function notifyWidgetExtension(group: string): void {
  const native = loadWidgetKitNative()
  if (!native) return
  try {
    native.flushAppGroup(group)
    native.reloadTimelines()
  } catch (err: unknown) {
    console.warn('[widget-kit-ios] timeline reload failed:', err)
  }
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
  locale: WidgetLocale,
  serialized: string,
  options?: WriteWidgetOptions
): Promise<void> {
  const group = options?.appGroupId ?? appGroupForSlug(appSlug)
  const shared = loadSharedGroup()
  if (shared) {
    await shared.setItem(WIDGET_PAYLOAD_KEY, serialized, group)
    if (appSlug === 'yuun') {
      // Plain-string chrome — survives envelope decode issues / stale TimelineEntry.
      await shared.setItem(YUUN_WIDGET_LOCALE_KEY, locale, group)
      await shared.setItem(YUUN_WIDGET_TIP_LABEL_KEY, tipLabelFromPayload(serialized, locale), group)
    }
    if (options?.mirrorLegacyYuunDays && appSlug === 'yuun') {
      try {
        const parsed = JSON.parse(serialized) as WidgetSyncPayload<{ days?: unknown }>
        const days = parsed.data?.days
        if (Array.isArray(days)) {
          await shared.setItem(
            YUUN_LEGACY_DAYS_KEY,
            JSON.stringify({ days, locale: parsed.locale }),
            group
          )
        }
      } catch {
        // ignore mirror failure
      }
    }
    notifyWidgetExtension(group)
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

    void persistPayload(appSlug, locale, serialized, options).catch((err: unknown) => {
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
  await persistPayload(appSlug, locale, JSON.stringify(payload), options)
}
