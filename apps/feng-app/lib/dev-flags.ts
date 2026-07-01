/**
 * DEV-only local flags (simulator / TestFlight debugging).
 *
 * `devPro` short-circuits the report paywall on-device so analysis can be tested
 * without IAP. The client attaches an `x-feng-dev-pro` header to signed requests
 * when it's on (see lib/client); the server honors that header ONLY when its
 * `ALLOW_DEV_PRO` env flag is set — so production users can't self-grant by
 * flipping a stored flag. Gated behind __DEV__ at every read.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const DEV_PRO_KEY = 'feng_dev_pro_v1'

// In-memory mirror so the HMAC client can read the flag synchronously per request.
let devProCache = false

/** Synchronous read for the request signer. Always false outside __DEV__. */
export function isDevProSync(): boolean {
  return __DEV__ && devProCache
}

export async function getDevPro(): Promise<boolean> {
  if (!__DEV__) return false
  try {
    const v = (await AsyncStorage.getItem(DEV_PRO_KEY)) === '1'
    devProCache = v
    return v
  } catch {
    return false
  }
}

export async function setDevPro(on: boolean): Promise<void> {
  if (!__DEV__) return
  devProCache = on
  try {
    await AsyncStorage.setItem(DEV_PRO_KEY, on ? '1' : '0')
  } catch {
    // best-effort
  }
}
