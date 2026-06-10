/**
 * 合盘 one-time unlock — Auspice's first non-subscription SKU (synastry-in-auspice S3).
 *
 * `hexastral_compatibility` ($6.99 consumable) buys out ONE relationship's full
 * reading + 前瞻 timeline VIEW. It does NOT grant push — relationship-node
 * reminders stay subscription-only (auspice_pro / universe_pro). Content vs
 * delivery are decoupled (monetization model, plan §5).
 *
 * RevenueCat is already configured for the subscription paywall; we call it
 * directly here. In Expo Go / unconfigured envs every call degrades to a safe
 * 'unavailable' so the UI falls back to the subscribe path.
 */

import Purchases from 'react-native-purchases'

export const SYNASTRY_PRODUCT_ID = 'hexastral_compatibility'

export type SynastryPurchaseResult = 'success' | 'cancelled' | 'failed' | 'unavailable'

/** Localized store price (e.g. "US$6.99"), or null when the SDK can't resolve it. */
export async function getSynastryUnlockPrice(): Promise<string | null> {
  try {
    const products = await Purchases.getProducts([SYNASTRY_PRODUCT_ID])
    return products[0]?.priceString ?? null
  } catch {
    return null
  }
}

/**
 * Buy the one-time unlock. Caller marks the specific relationship unlocked on
 * 'success' (the consumable can be re-bought for another relationship). Never
 * throws — maps the store's cancel/error into the result union.
 */
export async function purchaseSynastryUnlock(): Promise<SynastryPurchaseResult> {
  let product: Awaited<ReturnType<typeof Purchases.getProducts>>[number] | undefined
  try {
    product = (await Purchases.getProducts([SYNASTRY_PRODUCT_ID]))[0]
  } catch {
    return 'unavailable'
  }
  if (!product) return 'unavailable'
  try {
    await Purchases.purchaseStoreProduct(product)
    return 'success'
  } catch (err) {
    const e = err as { userCancelled?: boolean; code?: string }
    if (e.userCancelled || e.code === 'PURCHASE_CANCELLED') return 'cancelled'
    return 'failed'
  }
}
