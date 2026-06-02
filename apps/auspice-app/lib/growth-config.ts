/**
 * Cycle is a Tier-3 satellite (ADR-0010): anonymous-first, **no IAP / no paywall**.
 * So there are no RevenueCat product IDs — only the growth identity used by
 * `usePortfolioSatelliteBootstrap` (stable anon install id + cross-app discovery).
 */
export const PORTFOLIO_STORAGE_PREFIX = 'pf_cycle'
export const PORTFOLIO_TARGET_APP = 'cycle'
