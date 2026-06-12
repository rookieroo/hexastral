/**
 * DEV-only debugging helpers, surfaced in Settings → "DEV tools" (the whole block
 * is `__DEV__`-gated). NOT shipped behaviour — these exist so a tester can reset
 * device state to specific scenarios without uninstalling.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { DevSettings } from 'react-native'
import { config } from './config'
import { clearDeviceSecret, signRequest } from './hmac'

/**
 * Wipe ALL local state tied to this device's user — provisioned userId, device
 * secret (SecureStore), onboarding/intro flags, report cache, chart-ready flags,
 * push + memory prefs — then force a full reload. On relaunch the root mints a
 * FRESH anonymous user (provisionSession) and the index routes back to the intro
 * (the onboarding/intro flags are gone). The old server-side user row is left
 * intact; this device just adopts a brand-new id.
 */
export async function devWipeUserAndRestart(): Promise<void> {
  try {
    await AsyncStorage.clear()
  } catch {}
  try {
    await clearDeviceSecret()
  } catch {}
  try {
    DevSettings.reload()
  } catch {}
}

/**
 * Drop only the cached report chapters (`kindred_reading_ch_*`) + the "chart
 * ready" flags (`kindred_chart_ready_*`) so the next report open re-POSTs
 * /api/natal and re-fetches the chapters — WITHOUT wiping the user / signing out.
 * Returns the number of keys removed.
 */
export async function devClearReportCache(): Promise<number> {
  try {
    const keys = await AsyncStorage.getAllKeys()
    const drop = keys.filter(
      (k) => k.startsWith('kindred_reading_ch_') || k.startsWith('kindred_chart_ready_')
    )
    if (drop.length > 0) await AsyncStorage.multiRemove(drop)
    return drop.length
  } catch {
    return 0
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPORARY (remove before launch — see index.ts `set-subscription` exemption):
// grant / expire the REAL `universe_pro` entitlement in the DB for THIS user via
// /api/dev/set-subscription. Unlike the client-only `setKindredDevPro` override,
// this makes the SERVER see Pro, so every server-gated surface (timeline,
// what-if, chapter wall, daily synastry…) unlocks at once. Works on prod too
// while there are no real users; delete this + the Settings caller + the server
// exemption together at launch.
// ─────────────────────────────────────────────────────────────────────────────
export async function devSetServerPro(userId: string, pro: boolean): Promise<boolean> {
  const path = '/api/dev/set-subscription'
  const body = JSON.stringify({ status: pro ? 'pro' : 'free' })
  try {
    const sig = await signRequest({ body, userId, method: 'POST', path })
    const headers: Record<string, string> = {
      Authorization: `Bearer ${userId}`,
      'Content-Type': 'application/json',
    }
    if (sig) Object.assign(headers, sig)
    const res = await fetch(`${config.apiUrl}${path}`, { method: 'POST', headers, body })
    return res.ok
  } catch {
    return false
  }
}
