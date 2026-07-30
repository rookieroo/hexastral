/**
 * Permanent Yuun account wipe — server hard-delete + local mirrors.
 *
 * Order (must not reverse):
 *   1. clearYuunWatchCredential (needs HMAC)
 *   2. revokeAppleCredential (needs HMAC + Apple refresh)
 *   3. deletePortfolioAccount (with deviceId for device-scoped PII)
 *   4. local AsyncStorage / SecureStore / RC logOut
 *   5. widget sync without personalization
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  clearStoredAppleUserId,
  deletePortfolioAccount,
  revokeAppleCredential,
} from '@zhop/satellite-runtime'
import Purchases from 'react-native-purchases'
import { requestYuunWidgetSync } from '@/hooks/useYuunWidgetSync'
import { clearAuspiceGetCache } from './api'
import { clearAuspiceBirthDate } from './birth'
import { getAuspiceDeviceId } from './device'
import { PORTFOLIO_TARGET_APP } from './growth-config'
import type { Locale } from './i18n'
import { clearPeople } from './people'
import { clearYuunWatchCredential } from './watch-provision'

const LOCAL_KEYS = [
  'auspice.bonds.transferred',
  'auspice.serverPush.active',
  'auspice.bday.serverMigrated.v1',
  'auspice.push.enabled',
  'auspice.push.eveningEnabled',
  'auspice.holiday.enabled',
  'auspice.timeline.enabled',
  'auspice.watch.credential.v1',
  'auspice.yiji.displayMode',
  'auspice.people',
  'auspice.birthDate',
  'auspice.birthInfo',
]

export async function deleteYuunAccount(locale: Locale): Promise<boolean> {
  // 1. Watch credential while HMAC still works.
  try {
    await clearYuunWatchCredential()
  } catch (err) {
    console.warn('[yuun.account] clear watch credential failed', err)
  }

  // 2. Apple token revocation (best-effort; do not block purge).
  try {
    await revokeAppleCredential({ targetApp: PORTFOLIO_TARGET_APP })
  } catch (err) {
    console.warn('[yuun.account] Apple revoke failed', err)
  }

  // 3. Server physical purge — pass deviceId so device-scoped rows leave even
  // when push was never registered.
  const deviceId = await getAuspiceDeviceId().catch(() => undefined)
  const ok = await deletePortfolioAccount(deviceId ? { deviceId } : undefined)
  if (!ok) return false

  // 4. Local wipe.
  try {
    await clearAuspiceBirthDate()
  } catch (err) {
    console.warn('[yuun.account] clear birth failed', err)
  }
  try {
    await clearPeople()
  } catch (err) {
    console.warn('[yuun.account] clear people failed', err)
  }
  try {
    clearAuspiceGetCache()
  } catch (err) {
    console.warn('[yuun.account] clear api cache failed', err)
  }
  try {
    await AsyncStorage.multiRemove(LOCAL_KEYS)
  } catch (err) {
    console.warn('[yuun.account] clear async keys failed', err)
  }
  try {
    await clearStoredAppleUserId()
  } catch (err) {
    console.warn('[yuun.account] clear Apple user id failed', err)
  }
  try {
    await Purchases.logOut()
  } catch (err) {
    console.warn('[yuun.account] RevenueCat logOut failed', err)
  }

  // 5. Rewrite Widget / Watch without For-you.
  try {
    requestYuunWidgetSync(locale, true)
  } catch (err) {
    console.warn('[yuun.account] widget sync after delete failed', err)
  }

  return true
}
