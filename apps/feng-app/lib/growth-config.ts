export const PORTFOLIO_TARGET_APP = 'feng'

/** RevenueCat consumable — apartment / compound-unit report. */
export const FENG_SINGLE_PRODUCT_ID = 'hexastral_feng_single' as const

/** RevenueCat consumable — 大平层 / 独栋别墅 (multi-image + street 形煞). */
export const FENG_PREMIUM_PRODUCT_ID = 'hexastral_feng_premium' as const

export type FengRevenueCatPlan = 'single' | 'premium'

export const REVENUECAT_PRODUCT_IDS: Record<FengRevenueCatPlan, string> = {
  single: FENG_SINGLE_PRODUCT_ID,
  premium: FENG_PREMIUM_PRODUCT_ID,
} as const
