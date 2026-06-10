/**
 * DEV-only debugging helpers, surfaced in Settings → "DEV tools" (the whole block
 * is `__DEV__`-gated). NOT shipped behaviour — these exist so a tester can reset
 * device state to specific scenarios without uninstalling.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { DevSettings } from 'react-native'
import { clearDeviceSecret } from './hmac'

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
