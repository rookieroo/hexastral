/**
 * Unified reading access check
 *
 * Supports three access paths:
 *
 *   1. Active subscriber (any entitlement)   → granted via 'pro_quota'
 *   2. Free monthly / credit packs           → granted via 'free_monthly' / 'divination_credits'
 *   3. Single-purchase (consumable IAP)      → granted via 'single_purchase'
 *
 * The caller is responsible for:
 *   - Consuming the single purchase (POST /purchase/consume) after reading is saved when via='single_purchase'
 *
 * When access is denied, the response includes the RevenueCat product ID and
 * a display price string so the iOS client can launch the purchase flow immediately.
 */

import { and, eq } from 'drizzle-orm'
import { singlePurchases } from '../db/schema'
import type { AppDb } from '../infra-types'
import {
  checkAndConsumeFreeMonthlyDivination,
  consumeBondInviteCredit,
  consumeDivinationCredit,
} from '../services/quota'
import { userHasAnySubscription } from './access/entitlement-access'
import { FENG_BASE_PRICE_USD } from './feng-pricing'

export type SingleSkuId = 'cast' | 'fate_reading' | 'compatibility' | 'feng_analysis'

export type AccessGranted =
  | { granted: true; via: 'pro_quota' }
  | { granted: true; via: 'first_time' }
  | { granted: true; via: 'free_monthly' }
  | { granted: true; via: 'divination_credits' }
  | { granted: true; via: 'bond_invite_credit'; creditId?: string }
  | { granted: true; via: 'single_purchase'; purchaseId: string }

export type AccessDenied = {
  granted: false
  reason: 'purchase_required'
  iapProductId: string
  /** Fallback display price — iOS client should prefer RevenueCat's localized price */
  price: string
}

export type AccessResult = AccessGranted | AccessDenied

/** Map SKU → RevenueCat product ID and fallback USD price */
const SKU_IAP_META: Record<SingleSkuId, { productId: string; price: string }> = {
  cast: { productId: 'hexastral_cast_single', price: '$1.99' },
  fate_reading: { productId: 'hexastral_fate_reading', price: '$9.99' },
  compatibility: { productId: 'hexastral_compatibility', price: '$6.99' },
  feng_analysis: {
    productId: 'hexastral_feng_single',
    price: `$${FENG_BASE_PRICE_USD.toFixed(2)}`,
  },
}

/**
 * Check whether a user can access a reading SKU.
 *
 * Subscribers with any active entitlement get unlimited access (no metering).
 * Non-subscribers fall through to free monthly quota → credit packs → single purchase.
 */
export async function checkReadingAccess(
  db: AppDb,
  userId: string,
  skuId: SingleSkuId,
  opts: { allowBondInviteCredit?: boolean; readingId?: string } = {}
): Promise<AccessResult> {
  const { allowBondInviteCredit = false, readingId } = opts
  const { productId, price } = SKU_IAP_META[skuId]

  if (await userHasAnySubscription(db, userId)) {
    return { granted: true, via: 'pro_quota' }
  }

  // Free monthly divination quota: 3 per calendar month (divination only)
  if (skuId === 'cast') {
    const { granted: freeGranted } = await checkAndConsumeFreeMonthlyDivination(db, userId)
    if (freeGranted) return { granted: true, via: 'free_monthly' }

    const { success: creditSuccess } = await consumeDivinationCredit(db, userId)
    if (creditSuccess) return { granted: true, via: 'divination_credits' }
  }

  if (skuId === 'compatibility' && allowBondInviteCredit) {
    const credit = await consumeBondInviteCredit(db, userId, readingId)
    if (credit.success)
      return { granted: true, via: 'bond_invite_credit', creditId: credit.creditId }
  }

  // Check for an available (unconsumed) single purchase
  const purchase = await db
    .select({ id: singlePurchases.id })
    .from(singlePurchases)
    .where(
      and(
        eq(singlePurchases.userId, userId),
        eq(singlePurchases.skuId, skuId),
        eq(singlePurchases.status, 'purchased')
      )
    )
    .get()

  if (purchase) {
    return { granted: true, via: 'single_purchase', purchaseId: purchase.id }
  }

  return {
    granted: false,
    reason: 'purchase_required',
    iapProductId: productId,
    price,
  }
}
