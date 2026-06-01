/**
 * Portfolio growth identity for fate-app.
 * `targetApp` must match the server-side discovery `source` enum and growth keys.
 * No RevenueCat product ids — fate-app is Tier-3 (no IAP) per phase-k-plan §0.1.2.
 */
export const PORTFOLIO_STORAGE_PREFIX = 'pf_fate'
export const PORTFOLIO_TARGET_APP = 'fate'

/**
 * Marketing site root, attached to the native share sheet. fate-app has no
 * product-specific landing page yet, so this points at the HexAstral home.
 */
export const HEXASTRAL_WEB_URL = 'https://www.hexastral.com'

/**
 * Base URL for the public profile page (`hexastral.com/u/:username`). Bare apex
 * (no `www.`) — this is the canonical URL the share sheet posts.
 */
export const HEXASTRAL_PROFILE_URL = 'https://hexastral.com'
