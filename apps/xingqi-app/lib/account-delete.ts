/**
 * Permanent Syel account wipe — server hard-delete + local mirrors.
 * Order: push unregister → Apple revoke → portfolio DELETE → local wipe → RC logOut.
 */

import {
  clearStoredAppleUserId,
  deletePortfolioAccount,
  getOrCreateAnonymousInstallId,
  revokeAppleCredential,
} from '@zhop/satellite-runtime'

import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { cancelXingqiPush } from '@/lib/push-schedule'
import { unregisterXingqiServerPush } from '@/lib/server-push'
import { wipeLocalSyelData } from '@/lib/wipe-local-data'

type PurchasesModule = typeof import('react-native-purchases')

function loadPurchases(): PurchasesModule['default'] | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases') as PurchasesModule
    return mod.default
  } catch {
    return null
  }
}

export async function deleteSyelAccount(): Promise<boolean> {
  try {
    await unregisterXingqiServerPush()
  } catch (err) {
    console.warn('[syel.account] unregister push failed', err)
  }
  try {
    await cancelXingqiPush()
  } catch (err) {
    console.warn('[syel.account] cancel local push failed', err)
  }

  try {
    await revokeAppleCredential({ targetApp: PORTFOLIO_TARGET_APP })
  } catch (err) {
    console.warn('[syel.account] Apple revoke failed', err)
  }

  const deviceId = await getOrCreateAnonymousInstallId(PORTFOLIO_STORAGE_PREFIX).catch(
    () => undefined
  )
  const ok = await deletePortfolioAccount(deviceId ? { deviceId } : undefined)
  if (!ok) return false

  try {
    await clearStoredAppleUserId()
  } catch (err) {
    console.warn('[syel.account] clear Apple user id failed', err)
  }

  await wipeLocalSyelData()

  const Purchases = loadPurchases()
  if (Purchases) {
    try {
      await Purchases.logOut()
    } catch (err) {
      console.warn('[syel.account] RevenueCat logOut failed', err)
    }
  }

  return true
}
