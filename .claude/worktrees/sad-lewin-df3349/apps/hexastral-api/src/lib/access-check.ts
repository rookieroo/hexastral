/**
 * Unified reading access check
 *
 * Replaces the scattered inline `if (!isPro) throw HTTPException(403)` checks
 * in reading route handlers. Supports three access paths:
 *
 *   1. Pro subscriber with remaining quota  → granted via 'pro_quota'
 *   2. First fate_reading ever (zero prior readings) → granted via 'first_time'
 *   3. Single-purchase (consumable IAP)     → granted via 'single_purchase'
 *
 * The caller is responsible for:
 *   - Consuming quota (consumeProDivinationQuota / consumeProPairQuota) when via='pro_quota'
 *   - Consuming the single purchase (POST /purchase/consume) after reading is saved when via='single_purchase'
 *
 * When access is denied, the response includes the RevenueCat product ID and
 * a display price string so the iOS client can launch the purchase flow immediately.
 */

import { and, eq } from 'drizzle-orm'
import { singlePurchases, users } from '../db/schema'
import type { AppDb } from '../infra-types'
import {
  checkAndConsumeFreeMonthlyDivination,
  consumeBondInviteCredit,
  consumeDivinationCredit,
  consumeProDivinationQuota,
  consumeProPairQuota,
  type SubscriptionPlan,
} from '../services/quota'

export type SingleSkuId = 'divination' | 'fate_reading' | 'compatibility'

export type AccessGranted =
  | { granted: true; via: 'pro_quota' }
  | { granted: true; via: 'first_time' }
  | { granted: true; via: 'free_monthly' }
  | { granted: true; via: 'divination_credits' }
  | { granted: true; via: 'bond_invite_credit'; creditId?: string }
  | { granted: true; via: 'single_purchase'; purchaseId: string }

export type AccessDenied = {
  granted: false
  reason: 'pro_required' | 'quota_exceeded' | 'purchase_required'
  iapProductId: string
  /** Fallback display price — iOS client should prefer RevenueCat's localized price */
  price: string
}

export type AccessResult = AccessGranted | AccessDenied

export function isProUser(
  user: { subscriptionStatus: string | null } | null | undefined
): boolean {
  const status = user?.subscriptionStatus
  return status === 'pro' || status === 'premium' || status === 'active'
}

/** Map SKU → RevenueCat product ID and fallback USD price */
const SKU_IAP_META: Record<SingleSkuId, { productId: string; price: string }> = {
  divination: { productId: 'hexastral_divination_single', price: '$1.99' },
  fate_reading: { productId: 'hexastral_fate_reading', price: '$9.99' },
  compatibility: { productId: 'hexastral_compatibility', price: '$12.99' },
}

/** Map SKU → quota type (divination type uses daily+monthly; pair type uses pair quota) */
const SKU_QUOTA_TYPE: Record<SingleSkuId, 'divination' | 'pair'> = {
  divination: 'divination',
  fate_reading: 'pair',
  compatibility: 'pair',
}

/**
 * Check whether a user can access a reading SKU, and optionally consume the Pro quota.
 *
 * `consumeQuota = true` (default): atomically consume the Pro quota in the same call.
 *   Use this for Pro users — avoids a separate quota check + consume round-trip.
 *
 * For `via: 'single_purchase'`, the caller must call POST /purchase/consume after the
 * reading is successfully saved.
 */
export async function checkReadingAccess(
  db: AppDb,
  userId: string,
  skuId: SingleSkuId,
  opts: { consumeQuota?: boolean; allowBondInviteCredit?: boolean; readingId?: string } = {}
): Promise<AccessResult> {
  const { consumeQuota = true, allowBondInviteCredit = false, readingId } = opts
  const { productId, price } = SKU_IAP_META[skuId]

  const user = await db
    .select({
      subscriptionStatus: users.subscriptionStatus,
      subscriptionPlan: users.subscriptionPlan,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get()

  const isPro = isProUser(user)

  if (isPro) {
    if (!consumeQuota) return { granted: true, via: 'pro_quota' }

    const plan = (user?.subscriptionPlan as SubscriptionPlan | null) ?? 'monthly'
    const quotaType = SKU_QUOTA_TYPE[skuId]

    let decided: 'free' | 'overflow'
    let reason: string | undefined

    if (quotaType === 'divination') {
      const result = await consumeProDivinationQuota(db, userId, plan)
      decided = result.decided
      reason = result.reason
    } else {
      const result = await consumeProPairQuota(db, userId, plan)
      decided = result.decided
    }

    if (decided === 'free') return { granted: true, via: 'pro_quota' }

    // Quota exhausted — fall through to trial / single-purchase check
    // (Pro users may add-on via IAP)
  }

  // (Removed in deep refactor: first-fate-reading-free path — fateReadings table dropped.
  // The fate_reading SKU is retained in the enum/IAP map for backwards-compat with iOS
  // builds still in the wild, but always falls through to single-purchase check.)

  // Free monthly divination quota: 3 per calendar month for all non-Pro users (divination only)
  if (skuId === 'divination') {
    const { granted: freeGranted } = await checkAndConsumeFreeMonthlyDivination(db, userId)
    if (freeGranted) return { granted: true, via: 'free_monthly' }

    // Pre-paid divination credits (hexastral_divination_3 IAP pack)
    const { success: creditSuccess } = await consumeDivinationCredit(db, userId)
    if (creditSuccess) return { granted: true, via: 'divination_credits' }
  }

  if (skuId === 'compatibility' && allowBondInviteCredit) {
    const credit = await consumeBondInviteCredit(db, userId, readingId)
    if (credit.success) return { granted: true, via: 'bond_invite_credit', creditId: credit.creditId }
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

  // No access
  return {
    granted: false,
    reason: isPro ? 'quota_exceeded' : 'purchase_required',
    iapProductId: productId,
    price,
  }
}
