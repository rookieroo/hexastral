/**
 * Fēng analysis pricing — fair per-image tiering (户型图).
 *
 * Decision (user, 2026-07): price by IMAGE/FLOOR count, not self-declared 面积
 * (面积 can't be verified from an upload; image count is objective AND tracks the
 * real marginal cost — each floor plan = one extra Gemini vision pass + storage).
 *
 *   standard (0–1 floor plan)  → base price (apartment, ≤ single floor)
 *   villa    (2+ floor plans)  → base + per-additional-image increment, capped
 *
 * This is the pure calculator. ENFORCEMENT (charging the villa tier) needs the
 * RevenueCat products `hexastral_feng_single` (exists) + `hexastral_feng_villa`
 * (to provision) and the purchase-webhook SKU mapping — a human/launch task. Until
 * then the calculator drives the DISPLAYED estimate; the paywall gates on the
 * existing single SKU.
 */

export type FengTier = 'standard' | 'villa'

export interface FengPriceQuote {
  imageCount: number
  tier: FengTier
  /** base always covers 1 plan; each extra plan adds one increment. */
  baseUnits: 1
  extraUnits: number
  totalUnits: number
  /** RevenueCat product for the whole analysis at this tier (integration point). */
  productId: string
  /** Fallback display price — client should prefer RC's localized price. */
  displayPrice: string
}

const BASE_PRICE_USD = 4.99 // matches SKU_IAP_META.feng_analysis (apartment / 1 plan)
const EXTRA_IMAGE_USD = 2.0 // fair marginal: +1 Gemini vision pass + storage per plan
const VILLA_THRESHOLD = 2 // ≥ 2 plans ⇒ villa / multi-floor tier
export const MAX_FLOORPLAN_IMAGES = 6

/** Clamp an arbitrary count into the billable [1, MAX] range. */
export function normalizeImageCount(imageCount: number): number {
  if (!Number.isFinite(imageCount)) return 1
  return Math.max(1, Math.min(MAX_FLOORPLAN_IMAGES, Math.floor(imageCount)))
}

export function quoteFengAnalysis(imageCount: number): FengPriceQuote {
  const n = normalizeImageCount(imageCount)
  const extraUnits = n - 1
  const tier: FengTier = n >= VILLA_THRESHOLD ? 'villa' : 'standard'
  const totalUsd = BASE_PRICE_USD + extraUnits * EXTRA_IMAGE_USD
  return {
    imageCount: n,
    tier,
    baseUnits: 1,
    extraUnits,
    totalUnits: n,
    productId: tier === 'villa' ? 'hexastral_feng_villa' : 'hexastral_feng_single',
    displayPrice: `$${totalUsd.toFixed(2)}`,
  }
}
