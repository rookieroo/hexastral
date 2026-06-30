/**
 * DEV-only local flags (simulator / TestFlight debugging).
 *
 * `devPro` short-circuits the report paywall on-device so analysis can be tested
 * without going through IAP. It is a CLIENT bypass only — the server still gates
 * via its DEV_PRO_USER_IDS allowlist, so production users can't self-grant by
 * flipping a stored flag. Gated behind __DEV__ at every read.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const DEV_PRO_KEY = 'feng_dev_pro_v1'

export async function getDevPro(): Promise<boolean> {
  if (!__DEV__) return false
  try {
    return (await AsyncStorage.getItem(DEV_PRO_KEY)) === '1'
  } catch {
    return false
  }
}

export async function setDevPro(on: boolean): Promise<void> {
  if (!__DEV__) return
  try {
    await AsyncStorage.setItem(DEV_PRO_KEY, on ? '1' : '0')
  } catch {
    // best-effort
  }
}
