/**
 * Client-side residence-type → billing tier mapping.
 * Mirrors server `feng-pricing.ts` product/SKU resolution for paywall + access checks.
 * Display prices should prefer `fengPriceEstimate()` (server quote); these are fallbacks.
 */

import type { FengResidenceType } from '@zhop/scenario-feng'
import {
  FENG_PREMIUM_PRODUCT_ID,
  FENG_SINGLE_PRODUCT_ID,
  type FengRevenueCatPlan,
} from './growth-config'

export type FengSingleSku = 'feng_analysis' | 'feng_analysis_premium'

/** Server-side provision flag mirror — flip with `PREMIUM_SKU_PROVISIONED` in hexastral-api. */
export const PREMIUM_SKU_PROVISIONED = false

export function normalizeResidenceType(value: unknown): FengResidenceType {
  return value === 'flat' || value === 'villa' || value === 'apartment' ? value : 'apartment'
}

export function billingPlanForResidence(residenceType: FengResidenceType): FengRevenueCatPlan {
  if (!PREMIUM_SKU_PROVISIONED) return 'single'
  return residenceType === 'apartment' ? 'single' : 'premium'
}

export function productIdForResidence(residenceType: FengResidenceType): string {
  const plan = billingPlanForResidence(residenceType)
  return plan === 'premium' ? FENG_PREMIUM_PRODUCT_ID : FENG_SINGLE_PRODUCT_ID
}

export function singleSkuForResidence(residenceType: FengResidenceType): FengSingleSku {
  const plan = billingPlanForResidence(residenceType)
  return plan === 'premium' ? 'feng_analysis_premium' : 'feng_analysis'
}

export function streetViewEnabledForResidence(residenceType: FengResidenceType): boolean {
  return residenceType === 'flat' || residenceType === 'villa'
}
