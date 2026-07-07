/**
 * Fēng analysis pricing — discrete per-image price tiers (户型图).
 *
 * Decision (user, 2026-07): price by IMAGE/FLOOR count, not self-declared 面积
 * (面积 can't be verified from an upload; image count is objective AND tracks the
 * real marginal cost — each floor plan = one extra Gemini vision pass + storage).
 *
 * Apple IAP cannot charge an arbitrary computed amount — every purchase maps to a
 * fixed, pre-registered SKU/price tier. So pricing is DISCRETE: image count →
 * one of a few fixed tiers, each with its own RevenueCat product.
 *
 *   standard (1 floor plan)     → hexastral_feng_single      $9.99  (apartment)
 *   villa_s  (2–3 floor plans)  → hexastral_feng_villa_s     $15.99 (small multi-floor)
 *   villa_l  (4–6 floor plans)  → hexastral_feng_villa_l     $24.99 (large villa)
 *
 * Each tier has a matching single-purchase SKU so the analyze gate can require the
 * SKU the user actually paid for (a standard purchase can't unlock a 6-floor villa).
 *
 * ENFORCEMENT of the villa tiers needs the RevenueCat products + App Store Connect
 * SKUs provisioned end-to-end (see `VILLA_SKU_PROVISIONED`). Until that ships, every
 * count resolves to the standard tier so DISPLAYED price always equals CHARGED price.
 */

import { MAX_FLOORPLAN_IMAGES } from '@zhop/astro-core'

export type FengTier = 'standard' | 'villa_s' | 'villa_l'

/** Single-purchase SKU ids (mirror db single_purchases enum + access-check). */
export type FengSingleSku =
  | 'feng_analysis'
  | 'feng_analysis_villa_s'
  | 'feng_analysis_villa_l'

interface FengTierSpec {
  tier: FengTier
  /** Inclusive image-count range this tier covers. Ranges are contiguous over [1, MAX]. */
  minImages: number
  maxImages: number
  priceUsd: number
  /** RevenueCat product for the whole analysis at this tier. */
  productId: string
  /** Access-check / single_purchases SKU id for this tier. */
  singleSku: FengSingleSku
}

/** Yuel 合盘 (`hexastral_compatibility`) — floor; Kanyu must not price below this. */
export const YUEL_COMPATIBILITY_PRICE_USD = 6.99

/** Single-floor apartment report (1 户型图). Above Yuel; reflects vision + 5–6 chapters + bundled chat. */
export const FENG_BASE_PRICE_USD = 9.99

/** Upload/pricing cap — re-exported from the shared SSOT (@zhop/astro-core) so importers of this module are unaffected. */
export { MAX_FLOORPLAN_IMAGES }

/**
 * Discrete tier table. Ranges must stay contiguous and cover [1, MAX_FLOORPLAN_IMAGES].
 * The first entry is the always-available standard tier (its SKU ships today).
 */
const STANDARD_TIER: FengTierSpec = {
  tier: 'standard',
  minImages: 1,
  maxImages: 1,
  priceUsd: FENG_BASE_PRICE_USD,
  productId: 'hexastral_feng_single',
  singleSku: 'feng_analysis',
}

export const FENG_TIERS: readonly FengTierSpec[] = [
  STANDARD_TIER,
  {
    tier: 'villa_s',
    minImages: 2,
    maxImages: 3,
    priceUsd: 15.99,
    productId: 'hexastral_feng_villa_s',
    singleSku: 'feng_analysis_villa_s',
  },
  {
    tier: 'villa_l',
    minImages: 4,
    maxImages: MAX_FLOORPLAN_IMAGES,
    priceUsd: 24.99,
    productId: 'hexastral_feng_villa_l',
    singleSku: 'feng_analysis_villa_l',
  },
] as const

/**
 * The villa tiers are DISPLAY- and CHARGE-safe only when
 * `hexastral_feng_villa_s` / `_villa_l` are live end-to-end: App Store Connect +
 * RevenueCat products, the `FengSingleSku` union, `SKU_IAP_META`, `VALID_SKU_IDS`
 * (purchase.ts), the single_purchases sku_id enum, and the image-count-aware
 * analyze gate. Until ALL of that ships, quoting a villa price the paywall can't
 * collect ($24.99 shown, $9.99 charged — or an unknown-SKU purchase rejection) is
 * worse than not offering it. So while this is false every count resolves to the
 * standard tier: displayed == charged. Flip to true only after the checklist above.
 */
export const VILLA_SKU_PROVISIONED = false

export interface FengPriceQuote {
  imageCount: number
  tier: FengTier
  /** RevenueCat product for the whole analysis at this tier (integration point). */
  productId: string
  /** Access-check / single_purchases SKU id — the gate requires the tier the user paid for. */
  singleSku: FengSingleSku
  priceUsd: number
  /** Fallback display price — client should prefer RevenueCat's localized price. */
  displayPrice: string
}

/** Clamp an arbitrary count into the billable [1, MAX] range. */
export function normalizeImageCount(imageCount: number): number {
  if (!Number.isFinite(imageCount)) return 1
  return Math.max(1, Math.min(MAX_FLOORPLAN_IMAGES, Math.floor(imageCount)))
}

/** Resolve the tier spec for a (normalized) image count, honoring the provision flag. */
function resolveTierSpec(imageCount: number): FengTierSpec {
  if (!VILLA_SKU_PROVISIONED) return STANDARD_TIER
  const n = normalizeImageCount(imageCount)
  return FENG_TIERS.find((t) => n >= t.minImages && n <= t.maxImages) ?? STANDARD_TIER
}

export function quoteFengAnalysis(imageCount: number): FengPriceQuote {
  const n = normalizeImageCount(imageCount)
  const spec = resolveTierSpec(n)
  return {
    imageCount: n,
    tier: spec.tier,
    productId: spec.productId,
    singleSku: spec.singleSku,
    priceUsd: spec.priceUsd,
    displayPrice: `$${spec.priceUsd.toFixed(2)}`,
  }
}

/** The single-purchase SKU the analyze gate must require for a given image count. */
export function fengSkuForImageCount(imageCount: number): FengSingleSku {
  return resolveTierSpec(imageCount).singleSku
}
