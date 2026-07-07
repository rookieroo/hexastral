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

/** Yuel 合盘 (`hexastral_compatibility`) — floor; Kanyu must not price below this. */
export const YUEL_COMPATIBILITY_PRICE_USD = 6.99

/** Single-floor apartment report (1 户型图). Above Yuel; reflects vision + 5–6 chapters + bundled chat. */
export const FENG_BASE_PRICE_USD = 9.99

/** Marginal cost per additional floor-plan image (villa / multi-floor). */
export const FENG_EXTRA_IMAGE_USD = 3.0

const BASE_PRICE_USD = FENG_BASE_PRICE_USD
const EXTRA_IMAGE_USD = FENG_EXTRA_IMAGE_USD
const VILLA_THRESHOLD = 2 // ≥ 2 plans ⇒ villa / multi-floor tier
export const MAX_FLOORPLAN_IMAGES = 6

/**
 * The villa tier is DISPLAY-SAFE only when `hexastral_feng_villa` is live
 * end-to-end: App Store Connect + RevenueCat product, the `SingleSkuId` union
 * (access-check.ts), `SKU_IAP_META`, `VALID_SKU_IDS` (purchase.ts), the
 * single_purchases schema enum, and an image-count-aware analyze gate. Until
 * ALL of that ships, quoting a villa price the paywall can't collect ($24.99
 * shown, $9.99 charged — or an unknown-SKU purchase rejection) is worse than not
 * offering it. So while this is false we quote the single tier for every count:
 * displayed == charged. Flip to true only after the checklist above is done.
 */
export const VILLA_SKU_PROVISIONED = false

/** Clamp an arbitrary count into the billable [1, MAX] range. */
export function normalizeImageCount(imageCount: number): number {
  if (!Number.isFinite(imageCount)) return 1
  return Math.max(1, Math.min(MAX_FLOORPLAN_IMAGES, Math.floor(imageCount)))
}

export function quoteFengAnalysis(imageCount: number): FengPriceQuote {
  const n = normalizeImageCount(imageCount)
  const isVilla = VILLA_SKU_PROVISIONED && n >= VILLA_THRESHOLD
  const extraUnits = isVilla ? n - 1 : 0
  const tier: FengTier = isVilla ? 'villa' : 'standard'
  const totalUsd = BASE_PRICE_USD + extraUnits * EXTRA_IMAGE_USD
  return {
    imageCount: n,
    tier,
    baseUnits: 1,
    extraUnits,
    totalUnits: 1 + extraUnits,
    // Only ever return a SKU the paywall can actually charge.
    productId: isVilla ? 'hexastral_feng_villa' : 'hexastral_feng_single',
    displayPrice: `$${totalUsd.toFixed(2)}`,
  }
}
