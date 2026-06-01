import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Crypto from 'expo-crypto'

export function anonymousInstallStorageKey(storagePrefix: string): string {
  return `${storagePrefix}:install_anon`
}

/** Stable random id per app install — used as growth `anonymous_id`. */
export async function getOrCreateAnonymousInstallId(storagePrefix: string): Promise<string> {
  const key = anonymousInstallStorageKey(storagePrefix)
  const existing = await AsyncStorage.getItem(key)
  if (existing !== null && existing.length > 0) return existing
  const next = Crypto.randomUUID()
  await AsyncStorage.setItem(key, next)
  return next
}
