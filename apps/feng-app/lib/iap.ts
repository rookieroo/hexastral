/**
 * Fēng IAP — RevenueCat wrapper for the one-shot site report SKU.
 *
 * Product id matches the server catalog (`hexastral_feng_single` → sku
 * `feng_analysis`). After `purchaseProduct` resolves, poll
 * `GET /api/purchase/available/feng_analysis` until the webhook lands.
 *
 * `react-native-purchases` is unavailable in Expo Go; entry points no-op
 * silently and the paywall surfaces an unavailable state.
 */

import { Platform } from 'react-native'
import { FENG_SINGLE_PRODUCT_ID } from './growth-config'
import { config } from './config'
import { getDevPro } from './dev-flags'

type PurchasesModule = typeof import('react-native-purchases')
let Purchases: PurchasesModule['default'] | null = null

function loadPurchases(): PurchasesModule['default'] | null {
  if (Purchases) return Purchases
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases') as PurchasesModule
    Purchases = mod.default
    return Purchases
  } catch {
    return null
  }
}

let initialized = false

export function initializeFengIap(): void {
  if (initialized) return
  const p = loadPurchases()
  if (!p) return
  const apiKey =
    Platform.OS === 'ios' ? config.revenueCatIosKey : config.revenueCatAndroidKey
  const looksLikePlaceholder =
    !apiKey || apiKey.includes('REPLACE_WITH_') || apiKey.includes('xxxx')
  if (looksLikePlaceholder) return
  try {
    p.configure({ apiKey })
    initialized = true
  } catch {
    // paywall degrades to preview / unavailable
  }
}

export async function loginFengIap(userId: string): Promise<void> {
  const p = loadPurchases()
  if (!p || !initialized) return
  try {
    await p.logIn(userId)
  } catch {
    // ignore
  }
}

export async function logoutFengIap(): Promise<void> {
  const p = loadPurchases()
  if (!p || !initialized) return
  try {
    await p.logOut()
  } catch {
    // ignore
  }
}

export type FengPurchaseResult = 'success' | 'cancelled' | 'failed' | 'unavailable'

export async function getFengSinglePrice(): Promise<string | null> {
  const p = loadPurchases()
  if (!p || !initialized) return null
  try {
    const products = await p.getProducts([FENG_SINGLE_PRODUCT_ID])
    return products[0]?.priceString ?? null
  } catch {
    return null
  }
}

export async function purchaseFengSingle(): Promise<FengPurchaseResult> {
  const p = loadPurchases()
  if (!p || !initialized) return 'unavailable'
  try {
    await p.purchaseProduct(FENG_SINGLE_PRODUCT_ID)
    return 'success'
  } catch (err) {
    const code = (err as { code?: string; userCancelled?: boolean }).code
    if (code === 'PURCHASE_CANCELLED' || (err as { userCancelled?: boolean }).userCancelled) {
      return 'cancelled'
    }
    return 'failed'
  }
}

export async function restoreFengPurchases(): Promise<boolean> {
  const p = loadPurchases()
  if (!p || !initialized) return false
  try {
    await p.restorePurchases()
    return true
  } catch {
    return false
  }
}

/** Client-side preflight before enqueueing analyze (server is source of truth). */
export async function canProceedToFengAnalyze(
  checkServerAccess: () => Promise<boolean>
): Promise<boolean> {
  if (await getDevPro()) return true
  return checkServerAccess()
}
