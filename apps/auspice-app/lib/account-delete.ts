/**
 * Permanent Yuun account wipe — server hard-delete + local mirrors.
 *
 * Order (must not reverse):
 *   1. clearYuunWatchCredential (needs HMAC)
 *   2. deletePortfolioAccount
 *   3. local AsyncStorage / SecureStore / RC logOut
 *   4. widget sync without personalization
 */

import { deletePortfolioAccount } from '@zhop/satellite-runtime'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Purchases from 'react-native-purchases'
import { clearAuspiceBirthDate } from './birth'
import { clearAuspiceGetCache } from './api'
import { requestYuunWidgetSync } from '@/hooks/useYuunWidgetSync'
import { clearYuunWatchCredential } from './watch-provision'
import type { Locale } from './i18n'

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
]

export async function deleteYuunAccount(locale: Locale): Promise<boolean> {
  // 1. Watch credential while HMAC still works.
  try {
    await clearYuunWatchCredential()
  } catch (err) {
    console.warn('[yuun.account] clear watch credential failed', err)
  }

  // 2. Server physical purge.
  const ok = await deletePortfolioAccount()
  if (!ok) return false

  // 3. Local wipe.
  try {
    await clearAuspiceBirthDate()
  } catch (err) {
    console.warn('[yuun.account] clear birth failed', err)
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
    await Purchases.logOut()
  } catch (err) {
    console.warn('[yuun.account] RevenueCat logOut failed', err)
  }

  // 4. Rewrite Widget / Watch without For-you.
  try {
    requestYuunWidgetSync(locale, true)
  } catch (err) {
    console.warn('[yuun.account] widget sync after delete failed', err)
  }

  return true
}
