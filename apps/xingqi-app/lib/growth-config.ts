export const PORTFOLIO_STORAGE_PREFIX = 'pf_xingqi'
/** Opaque API target — server catalog still uses faceoracle (ADR-0028). */
export const PORTFOLIO_TARGET_APP = 'faceoracle'

/** Dual IAP (ADR-0028): Pro Timeline sub + ≥$9.99 one-shot consumable. */
export const REVENUECAT_PRODUCT_IDS = {
  monthly: 'faceoracle_pro_monthly',
  annual: 'faceoracle_pro_annual',
  reading: 'faceoracle_reading',
} as const

/** ASC / RC list price floor for the one-shot SKU (USD). */
export const ONESHOT_PRICE_FLOOR_USD = 9.99

/** Suggested Pro list prices (ASC / Play / RC) — display guidance. */
export const PRO_MONTHLY_LIST_USD = 14.99
export const PRO_ANNUAL_LIST_USD = 99.99
