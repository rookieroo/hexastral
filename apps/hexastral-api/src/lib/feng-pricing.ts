/**
 * Fēng analysis pricing — discrete tiers keyed by USER-DECLARED residence type.
 *
 * Decision (user, 2026-07): price by residence TYPE, not floor-plan image count.
 * The type is a single legible tap on onboarding and drives BOTH the price and the
 * report depth (street-level 形煞). Image count stays a technical cap only (≤ MAX).
 *
 * Apple IAP cannot charge an arbitrary computed amount — every purchase maps to a
 * fixed, pre-registered SKU/price. So pricing is DISCRETE, two billing tiers:
 *
 *   apartment (公寓/小区单元)      → single  → hexastral_feng_single   $9.99   no street view
 *   flat      (大平层)             → premium → hexastral_feng_premium  $39.99  + street 形煞
 *   villa     (独栋/别墅/农村自建) → premium → hexastral_feng_premium  $39.99  + street 形煞
 *
 * Rationale for street view only on premium: a compound apartment's street 形煞 is a
 * low-value, shared-coordinate, floor-height-biased signal (often no Mapillary
 * coverage in CN). Detached/large-flat buyers are high-ARPU and warrant the deeper,
 * multi-image, street-augmented report. Product laddering ≈ engineering reality.
 *
 * ENFORCEMENT of premium needs `hexastral_feng_premium` live end-to-end (see
 * `PREMIUM_SKU_PROVISIONED`). Until then every type resolves to `single` so the
 * DISPLAYED price always equals the CHARGED price.
 */

import { MAX_FLOORPLAN_IMAGES } from '@zhop/astro-core'

/** User-declared residence type — the pricing + report-depth axis. */
export type FengResidenceType = 'apartment' | 'flat' | 'villa'

/** Billing tier (Apple IAP SKU granularity). flat + villa collapse to `premium`. */
export type FengBillingTier = 'single' | 'premium'

/** Single-purchase SKU ids (mirror db single_purchases enum + access-check). */
export type FengSingleSku = 'feng_analysis' | 'feng_analysis_premium'

interface FengTierSpec {
  billingTier: FengBillingTier
  priceUsd: number
  /** RevenueCat product for the whole analysis at this tier. */
  productId: string
  /** Access-check / single_purchases SKU id for this tier. */
  singleSku: FengSingleSku
  /** Whether the street-level 形煞 (Mapillary) pass runs for this residence class. */
  streetView: boolean
}

/** Yuel 合盘 (`hexastral_compatibility`) — floor; Kanyu must not price below this. */
export const YUEL_COMPATIBILITY_PRICE_USD = 6.99

/** Apartment/compound-unit report (base). Above Yuel; vision + 5–6 chapters + chat. */
export const FENG_BASE_PRICE_USD = 9.99

/** Premium (大平层 / 独栋别墅) — ~4× base; multi-image + street 形煞 + floor weighting.
 *  Bold-but-credible for a pure-AI report; kept below consultant-tier to limit
 *  refund/App-Review risk (raise only if a tangible deliverable — PDF / human
 *  spot-review — is bundled). Inert until PREMIUM_SKU_PROVISIONED. */
export const FENG_PREMIUM_PRICE_USD = 39.99

/** Upload cap — re-exported from the shared SSOT (@zhop/astro-core) so importers here are unaffected. */
export { MAX_FLOORPLAN_IMAGES }

const SINGLE_TIER: FengTierSpec = {
  billingTier: 'single',
  priceUsd: FENG_BASE_PRICE_USD,
  productId: 'hexastral_feng_single',
  singleSku: 'feng_analysis',
  streetView: false,
}

const PREMIUM_TIER: FengTierSpec = {
  billingTier: 'premium',
  priceUsd: FENG_PREMIUM_PRICE_USD,
  productId: 'hexastral_feng_premium',
  singleSku: 'feng_analysis_premium',
  streetView: true,
}

/** All billable tiers — access-check derives SKU_IAP_META from this (SSOT). */
export const FENG_TIERS: readonly FengTierSpec[] = [SINGLE_TIER, PREMIUM_TIER] as const

/** apartment = single; flat/villa = premium. */
const TIER_BY_RESIDENCE: Record<FengResidenceType, FengTierSpec> = {
  apartment: SINGLE_TIER,
  flat: PREMIUM_TIER,
  villa: PREMIUM_TIER,
}

export const DEFAULT_RESIDENCE_TYPE: FengResidenceType = 'apartment'

/**
 * Premium is DISPLAY/CHARGE-safe only when `hexastral_feng_premium` is live E2E:
 * App Store Connect + RevenueCat product, the `FengSingleSku` union, `SKU_IAP_META`,
 * `VALID_SKU_IDS` (purchase.ts), the single_purchases sku_id enum, and the
 * residence-aware analyze gate. Until ALL of that ships, quoting premium the paywall
 * can't collect ($19.99 shown, $9.99 charged, or an unknown-SKU rejection) is worse
 * than not offering it — so every type resolves to `single`: displayed == charged.
 * Flip to true only after the checklist above (mirror MAPILLARY_TOKEN provisioning).
 */
export const PREMIUM_SKU_PROVISIONED = false

/** Coerce arbitrary input into a valid residence type (defaults to apartment). */
export function normalizeResidenceType(value: unknown): FengResidenceType {
  return value === 'flat' || value === 'villa' || value === 'apartment'
    ? value
    : DEFAULT_RESIDENCE_TYPE
}

/** Resolve the billable tier for a residence type, honoring the provision flag. */
function resolveTierSpec(residenceType: FengResidenceType): FengTierSpec {
  if (!PREMIUM_SKU_PROVISIONED) return SINGLE_TIER
  return TIER_BY_RESIDENCE[residenceType] ?? SINGLE_TIER
}

export interface FengPriceQuote {
  residenceType: FengResidenceType
  billingTier: FengBillingTier
  /** RevenueCat product for the whole analysis at this tier (integration point). */
  productId: string
  /** Access-check / single_purchases SKU id — the gate requires the tier the user paid for. */
  singleSku: FengSingleSku
  priceUsd: number
  /** Fallback display price — client should prefer RevenueCat's localized price. */
  displayPrice: string
  /** Whether this tier's report includes the street-level 形煞 pass. */
  streetView: boolean
}

export function quoteFengAnalysis(residenceType: FengResidenceType): FengPriceQuote {
  const spec = resolveTierSpec(residenceType)
  return {
    residenceType,
    billingTier: spec.billingTier,
    productId: spec.productId,
    singleSku: spec.singleSku,
    priceUsd: spec.priceUsd,
    displayPrice: `$${spec.priceUsd.toFixed(2)}`,
    streetView: spec.streetView,
  }
}

/** The single-purchase SKU the analyze gate must require for a residence type. */
export function fengSkuForResidence(residenceType: FengResidenceType): FengSingleSku {
  return resolveTierSpec(residenceType).singleSku
}

/**
 * Whether the street-level 形煞 (Mapillary) pass should run for a residence type.
 * This is a REPORT-QUALITY decision (flat/villa only), independent of billing
 * provisioning — actual execution is further gated by MAPILLARY_TOKEN presence in
 * svc-feng. Premium SKU + MAPILLARY_TOKEN are expected to go live together.
 */
export function fengStreetViewEnabled(residenceType: FengResidenceType): boolean {
  return TIER_BY_RESIDENCE[residenceType]?.streetView ?? false
}
