export const PORTFOLIO_STORAGE_PREFIX = 'pf_face_oracle'
export const PORTFOLIO_TARGET_APP = 'faceoracle'
// ⚠️ STALE — Face is per-use now (no faceoracle_pro subscription; plan §8 / ADR-0013 §2).
// These IDs are removed/non-existent in the server catalog (apps/hexastral-api/src/config/
// products.ts): the only real face product is the consumable `faceoracle_reading`.
// P4 client flip: SatellitePaywall must support a consumable (single-reading) purchase
// instead of monthly/annual subs, then this maps to `faceoracle_reading`.
export const REVENUECAT_PRODUCT_IDS = {
  monthly: 'faceoracle_pro_monthly',
  annual: 'faceoracle_pro_annual',
  creditsPack: 'faceoracle_credits_pack_10',
} as const
