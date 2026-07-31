/**
 * Permanent Yuel account wipe — server hard-delete + local mirrors.
 *
 * Uses Kindred's `yuan_user_id` + HMAC (not portfolio session). Order:
 *   1. DELETE /api/user/:id (purge bonds / invitations / kindred_push_queue / tokens)
 *   2. Clear local AsyncStorage + device secret
 *   3. RevenueCat logOut (best-effort)
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { config } from './config'
import { clearDeviceSecret, signRequest } from './hmac'

const USER_ID_KEY = 'yuan_user_id'

/** Local keys that must leave the device with the account. */
const LOCAL_KEYS = [
  USER_ID_KEY,
  'yuan_onboarding_complete_v1',
  'yuan_onboarding_draft_v1',
  'kindred_daily_push_v1',
  'kindred.selfBirth',
  'kindred.selfBirth.synced',
  'kindred_carryover_hint_v1',
  'kindred.primer.seen',
]

async function clearLocalKeys(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(LOCAL_KEYS)
  } catch (err) {
    console.warn('[yuel.account] clear async keys failed', err)
  }
  // Report / highlight caches are keyed with prefixes — wipe by scanning.
  try {
    const all = await AsyncStorage.getAllKeys()
    const extra = all.filter(
      (k) => k.startsWith('kindred.') || k.startsWith('yuan_') || k.startsWith('bond.')
    )
    if (extra.length > 0) await AsyncStorage.multiRemove(extra)
  } catch (err) {
    console.warn('[yuel.account] clear prefixed keys failed', err)
  }
}

/**
 * Permanently delete the signed-in Yuel account. Returns false if the server
 * rejects the purge (local state is left intact so the user can retry).
 */
export async function deleteYuelAccount(): Promise<boolean> {
  const userId = await AsyncStorage.getItem(USER_ID_KEY)
  if (!userId) {
    console.warn('[yuel.account] no user id on device')
    await clearDeviceSecret().catch(() => undefined)
    await clearLocalKeys()
    return true
  }

  const path = `/api/user/${encodeURIComponent(userId)}`
  const signed = await signRequest({ body: '', userId, method: 'DELETE', path })
  if (!signed) {
    console.warn('[yuel.account] request signing failed')
    return false
  }

  try {
    const res = await fetch(`${config.apiUrl}${path}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${userId}`,
        ...signed,
      },
    })
    // 404 = already gone — clear local and succeed.
    if (!res.ok && res.status !== 404) {
      console.error('[yuel.account] server rejected delete', res.status, await res.text())
      return false
    }
  } catch (err) {
    console.error('[yuel.account] request failed', err)
    return false
  }

  await clearDeviceSecret().catch(() => undefined)
  await clearLocalKeys()

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Purchases = require('react-native-purchases').default as {
      logOut: () => Promise<unknown>
    }
    await Purchases.logOut()
  } catch (err) {
    console.warn('[yuel.account] RevenueCat logOut failed', err)
  }

  return true
}
