/**
 * Apple Sign-In token revocation before account deletion (Guideline 5.1.1(v)).
 * Best-effort — callers must not block deletion on failure.
 */

import * as AppleAuthentication from 'expo-apple-authentication'
import * as SecureStore from 'expo-secure-store'

import { resolvePortfolioApiUrl } from './api-url'
import { signRequest } from './hmac'
import { getPortfolioUserId } from './session'

const APPLE_USER_ID_KEY = 'portfolio.appleUserId'

export async function storeAppleUserId(appleUserId: string): Promise<void> {
  await SecureStore.setItemAsync(APPLE_USER_ID_KEY, appleUserId)
}

export async function getStoredAppleUserId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(APPLE_USER_ID_KEY)
  } catch {
    return null
  }
}

export async function clearStoredAppleUserId(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(APPLE_USER_ID_KEY)
  } catch (err) {
    console.warn('[satellite-runtime] clearStoredAppleUserId failed', err)
  }
}

/**
 * Refresh Apple credential → POST /api/user/revoke-apple.
 * Returns false when no Apple identity is stored or the call fails.
 */
export async function revokeAppleCredential(opts: {
  targetApp: string
  appleUserId?: string | null
}): Promise<boolean> {
  const appleUserId = opts.appleUserId ?? (await getStoredAppleUserId())
  if (!appleUserId) return false

  const userId = await getPortfolioUserId()
  if (!userId) return false

  let authorizationCode: string | null = null
  try {
    const fresh = await AppleAuthentication.refreshAsync({ user: appleUserId })
    authorizationCode = fresh.authorizationCode
  } catch (err) {
    console.warn('[satellite-runtime] Apple refreshAsync failed', err)
    return false
  }
  if (!authorizationCode) return false

  const path = '/api/user/revoke-apple'
  const body = JSON.stringify({
    authorizationCode,
    targetApp: opts.targetApp,
  })
  const signed = await signRequest({ body, userId, method: 'POST', path })
  if (!signed) return false

  try {
    const res = await fetch(`${resolvePortfolioApiUrl()}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userId}`,
        'Content-Type': 'application/json',
        ...signed,
      },
      body,
    })
    if (!res.ok) {
      console.warn('[satellite-runtime] revoke-apple rejected', res.status, await res.text())
      return false
    }
    await clearStoredAppleUserId()
    return true
  } catch (err) {
    console.warn('[satellite-runtime] revoke-apple request failed', err)
    return false
  }
}
