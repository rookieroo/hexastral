import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Crypto from 'expo-crypto'

const KEY_DEVICE_ID = 'auspice.deviceId.v1'

/**
 * Stable anonymous device id (lazily generated + persisted). Scopes the user's
 * make-if forks server-side without requiring sign-in — Auspice is anonymous-first.
 * Survives app restarts; a reinstall/storage-clear gets a fresh id (forks are
 * device-local by design until account sync exists).
 */
export async function getAuspiceDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(KEY_DEVICE_ID)
    if (existing) return existing
    const id = Crypto.randomUUID()
    await AsyncStorage.setItem(KEY_DEVICE_ID, id)
    return id
  } catch {
    // AsyncStorage unavailable — ephemeral id (forks just won't persist this run).
    return Crypto.randomUUID()
  }
}
