import * as SecureStore from 'expo-secure-store'

import { clearDeviceSecret, getDeviceSecret } from './hmac'

const PORTFOLIO_USER_ID_KEY = 'portfolio_user_id'

async function safeDeleteSecure(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key)
  } catch (err) {
    console.warn(`[satellite-runtime] SecureStore.delete ${key}`, err)
  }
}

export async function setPortfolioUserId(userId: string): Promise<void> {
  await SecureStore.setItemAsync(PORTFOLIO_USER_ID_KEY, userId)
}

export async function getPortfolioUserId(): Promise<string | null> {
  return SecureStore.getItemAsync(PORTFOLIO_USER_ID_KEY)
}

export async function clearPortfolioUserId(): Promise<void> {
  await safeDeleteSecure(PORTFOLIO_USER_ID_KEY)
}

/**
 * Clears orphaned credentials (e.g. userId left after deviceSecret loss), so UI/API agree on auth state.
 */
export async function repairPortfolioCredentialMismatch(): Promise<void> {
  const userId = await getPortfolioUserId()
  const secret = await getDeviceSecret()
  if (userId && !secret) {
    await safeDeleteSecure(PORTFOLIO_USER_ID_KEY)
  }
  if (!userId && secret) {
    await clearDeviceSecret()
  }
}

/** Full sign-out: drop linked portfolio identity and HMAC secret. */
export async function invalidatePortfolioSession(): Promise<void> {
  await clearPortfolioUserId()
  await clearDeviceSecret()
}
