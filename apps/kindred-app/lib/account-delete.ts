/**
 * Permanent Yuel account wipe — server hard-delete + local mirrors.
 *
 * Uses Kindred's `yuan_user_id` + HMAC (not portfolio session). Order:
 *   1. DELETE /api/user/:id (purge bonds / invitations / kindred_push_queue / tokens)
 *   2. Clear local AsyncStorage + in-memory birth/draft caches + device secret
 *   3. RevenueCat logOut (best-effort)
 *
 * After this, "Open your reading" must disappear — self birth + reading chapter
 * caches + onboarding-complete flag are all wiped (and React subscribers notified).
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { clearBondReportCache } from '@zhop/scenario-kindred'
import { clearBondBirthCache } from './bondBirthCache'
import { config } from './config'
import { clearDeviceSecret, signRequest } from './hmac'
import { clearDraft } from './onboardingDraft'
import { clearSelfBirth } from './selfBirth'

const USER_ID_KEY = 'yuan_user_id'

/** Explicit keys that must leave the device with the account. */
const LOCAL_KEYS = [
  USER_ID_KEY,
  'yuan_onboarding_complete_v1',
  'yuan_onboarding_draft_v1',
  'kindred_daily_push_v1',
  'kindred_self_birth_v1',
  'kindred_self_birth_synced_v1',
  'kindred_carryover_hint_v1',
  'kindred.primer.seen',
  'kindred_reading_primer_v1',
  'kindred_signin_nudge_invite_v1',
  'kindred.bond_birth_cache_v1',
  'kindred_ddl_claimed',
  'kindred_ddl_token',
]

async function clearLocalKeys(): Promise<void> {
  clearBondReportCache()
  await clearSelfBirth().catch((err) => {
    console.warn('[yuel.account] clearSelfBirth failed', err)
  })
  await clearDraft().catch((err) => {
    console.warn('[yuel.account] clearDraft failed', err)
  })
  await clearBondBirthCache().catch((err) => {
    console.warn('[yuel.account] clearBondBirthCache failed', err)
  })

  try {
    await AsyncStorage.multiRemove(LOCAL_KEYS)
  } catch (err) {
    console.warn('[yuel.account] clear async keys failed', err)
  }

  // Sweep every kindred/yuan/bond prefixed key (reading chapters, monthly depth,
  // highlights, chart-ready flags, etc.) so solo "Open your reading" cannot revive.
  try {
    const all = await AsyncStorage.getAllKeys()
    const extra = all.filter(
      (k) =>
        k.startsWith('kindred.') ||
        k.startsWith('kindred_') ||
        k.startsWith('yuan_') ||
        k.startsWith('bond.') ||
        k.startsWith('auspice.')
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
