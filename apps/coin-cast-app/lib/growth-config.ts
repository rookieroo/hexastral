export const PORTFOLIO_STORAGE_PREFIX = 'pf_coin_cast'
export const PORTFOLIO_TARGET_APP = 'coincast'
export const REVENUECAT_PRODUCT_IDS = {
  castPack1: 'coincast_cast_pack_1',
  castPack5: 'coincast_cast_pack_5',
  castPack10: 'coincast_cast_pack_10',
  monthly: 'coincast_pro_monthly',
  annual: 'coincast_pro_annual',
} as const

/** Domain backing the iOS associatedDomains (app.json) + web landing pages. */
const SHARE_DOMAIN = 'https://www.hexastral.com'

/**
 * Map the app UI locale to the web app's supported locale segment.
 * hexastral-web routing.ts ships `['zh', 'tw', 'en', 'ja']` — no `ko` landing
 * yet, so Korean falls back to the English page.
 */
function webLocaleFor(uiLocale: string): 'zh' | 'tw' | 'ja' | 'en' {
  if (uiLocale === 'zh') return 'zh'
  if (uiLocale === 'zh-Hant') return 'tw'
  if (uiLocale === 'ja') return 'ja'
  return 'en'
}

/**
 * Acquisition landing for the CoinCast share-poster QR (locale-aware).
 * Replaces the prior hardcoded `/en/lp/twelve-palaces` (a Kindred funnel page).
 */
export function coincastLandingUrl(uiLocale = 'en'): string {
  return `${SHARE_DOMAIN}/${webLocaleFor(uiLocale)}/coin-cast`
}

/**
 * Owner-facing universal link that re-opens one stored reading. The path matches
 * the coincast `applinks` entry in the web AASA (`/lp/hexagram/*`), so on a
 * device with the app installed iOS hands it to CoinCast and `+native-intent`
 * routes it to the detail sheet. Readings are scoped to their owner, so this is
 * for self re-entry (notifications, "open my reading"), not public sharing.
 */
export function coincastReadingDeepLink(readingId: string): string {
  return `${SHARE_DOMAIN}/lp/hexagram/${encodeURIComponent(readingId)}`
}
