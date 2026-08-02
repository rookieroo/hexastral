/**
 * Provision Watch companion credentials + preferences into the App Group so
 * WatchConnectivity can deliver them to the paired Watch (Keychain on Watch).
 *
 * Prefer minting `w1.<id>.<secret>` via HMAC when a portfolio identity exists.
 * Anonymous installs still get locale/birth prefs for public `/day` refresh.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { getPortfolioUserId, signedApiFetch } from '@zhop/satellite-runtime'
import {
  type WidgetLocale,
  YUUN_WATCH_CREDENTIAL_KEY,
  YUUN_WATCH_PREFS_KEY,
  type YuunWatchPreferences,
} from '@zhop/widget-kit-ios'
import { Platform } from 'react-native'

import { getAuspiceBirthDate } from '@/lib/birth'
import type { Locale } from '@/lib/i18n'
import { resolveYijiDisplayMode } from '@/lib/yiji-display-mode'

const APP_GROUP = 'group.com.hexastral.yuun'
const CREDENTIAL_CACHE_KEY = 'auspice.watch.credential.v1'

type CachedCredential = {
  id: string
  token: string
  expiresAt: string
}

type SharedGroupApi = {
  setItem: (key: string, value: unknown, appGroup: string) => Promise<void>
}

type WidgetKitIosNative = {
  flushAppGroup?: (suiteName: string) => void
  syncWatchAppGroup?: (suiteName: string) => void
}

function loadSharedGroup(): SharedGroupApi | null {
  try {
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

function pushWatchAppGroup(): void {
  try {
    const native = loadWidgetKitNative()
    // Flush App Group before WCSession snapshot (RN setItem is async to disk).
    native?.flushAppGroup?.(APP_GROUP)
    native?.syncWatchAppGroup?.(APP_GROUP)
  } catch (err) {
    console.warn('[watch-provision] syncWatchAppGroup failed', err)
  }
}

function isFresh(expiresAt: string): boolean {
  const t = Date.parse(expiresAt)
  if (!Number.isFinite(t)) return false
  // Renew 14 days before expiry.
  return t - Date.now() > 14 * 24 * 60 * 60 * 1000
}

async function readCachedCredential(): Promise<CachedCredential | null> {
  try {
    const raw = await AsyncStorage.getItem(CREDENTIAL_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedCredential
    if (
      typeof parsed.id === 'string' &&
      typeof parsed.token === 'string' &&
      typeof parsed.expiresAt === 'string' &&
      parsed.token.startsWith('w1.')
    ) {
      return parsed
    }
    return null
  } catch (err) {
    console.warn('[watch-provision] read cache failed', err)
    return null
  }
}

async function writeCachedCredential(c: CachedCredential | null): Promise<void> {
  try {
    if (!c) await AsyncStorage.removeItem(CREDENTIAL_CACHE_KEY)
    else await AsyncStorage.setItem(CREDENTIAL_CACHE_KEY, JSON.stringify(c))
  } catch (err) {
    console.warn('[watch-provision] write cache failed', err)
  }
}

async function mintCredential(): Promise<CachedCredential | null> {
  const userId = await getPortfolioUserId()
  if (!userId) return null

  const res = await signedApiFetch({
    method: 'POST',
    path: '/api/watch/credentials',
    body: {},
    maxAttempts: 2,
  })
  if (!res || !res.ok) {
    console.warn('[watch-provision] mint failed', res?.status)
    return null
  }
  try {
    const json = (await res.json()) as { id?: string; token?: string; expiresAt?: string }
    if (
      typeof json.id === 'string' &&
      typeof json.token === 'string' &&
      typeof json.expiresAt === 'string'
    ) {
      const cached = { id: json.id, token: json.token, expiresAt: json.expiresAt }
      await writeCachedCredential(cached)
      return cached
    }
  } catch (err) {
    console.warn('[watch-provision] mint parse failed', err)
  }
  return null
}

async function revokeCredential(id: string): Promise<void> {
  const res = await signedApiFetch({
    method: 'DELETE',
    path: `/api/watch/credentials/${encodeURIComponent(id)}`,
    maxAttempts: 1,
  })
  if (res && !res.ok) {
    console.warn('[watch-provision] revoke failed', res.status)
  }
}

/**
 * Write prefs + credential (when available) and push via WatchConnectivity.
 */
export async function provisionYuunWatch(locale: Locale): Promise<void> {
  if (Platform.OS !== 'ios') return

  const shared = loadSharedGroup()
  if (!shared) return

  const birthDate = (await getAuspiceBirthDate().catch(() => null)) ?? null
  const yijiMode = await resolveYijiDisplayMode(locale)
  const prefs: YuunWatchPreferences = {
    locale: locale as WidgetLocale,
    birthDate,
    yijiMode,
  }
  await shared.setItem(YUUN_WATCH_PREFS_KEY, JSON.stringify(prefs), APP_GROUP)

  const cached = await readCachedCredential()
  if (cached && isFresh(cached.expiresAt)) {
    await shared.setItem(YUUN_WATCH_CREDENTIAL_KEY, cached.token, APP_GROUP)
    pushWatchAppGroup()
    return
  }

  const userId = await getPortfolioUserId()
  if (!userId) {
    // Guest: prefs only — do not tombstone a prior credential on transient missing session.
    pushWatchAppGroup()
    return
  }

  if (cached) {
    await revokeCredential(cached.id)
    await writeCachedCredential(null)
  }

  const minted = await mintCredential()
  if (minted) {
    await shared.setItem(YUUN_WATCH_CREDENTIAL_KEY, minted.token, APP_GROUP)
  } else if (cached) {
    // Expired token was revoked; clear Watch Keychain.
    await shared.setItem(YUUN_WATCH_CREDENTIAL_KEY, '', APP_GROUP)
  }
  // Mint failure with no prior cache: leave App Group credential untouched.

  pushWatchAppGroup()
}

/** Clear local + Watch credential (account delete / sign-out). */
export async function clearYuunWatchCredential(): Promise<void> {
  if (Platform.OS !== 'ios') return
  const cached = await readCachedCredential()
  if (cached) {
    await revokeCredential(cached.id)
    await writeCachedCredential(null)
  }
  const shared = loadSharedGroup()
  if (shared) {
    await shared.setItem(YUUN_WATCH_CREDENTIAL_KEY, '', APP_GROUP)
  }
  pushWatchAppGroup()
}
