import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Crypto from 'expo-crypto'

import { PORTFOLIO_STORAGE_PREFIX } from './growth-config'

/** Stable random id per app install — mirrors @zhop/satellite-runtime install-id. */
export async function getOrCreateAnonymousInstallId(): Promise<string> {
  const key = `${PORTFOLIO_STORAGE_PREFIX}:install_anon`
  const existing = await AsyncStorage.getItem(key)
  if (existing !== null && existing.length > 0) return existing
  const next = Crypto.randomUUID()
  await AsyncStorage.setItem(key, next)
  return next
}
