/**
 * Local mirror of server biometric consent — skip the disclosure screen once agreed.
 * Cleared on revoke / sign-out. Server remains source of truth when reachable.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'xingqi_biometric_consent_v1'

export async function getCachedBiometricConsent(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1'
  } catch {
    return false
  }
}

export async function setCachedBiometricConsent(consented: boolean): Promise<void> {
  try {
    if (consented) await AsyncStorage.setItem(KEY, '1')
    else await AsyncStorage.removeItem(KEY)
  } catch {
    // non-fatal
  }
}
