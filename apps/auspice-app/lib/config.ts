/**
 * Static app config — store + legal URLs + flagship deep-link targets used by
 * the upsell card. No secrets here (RevenueCat keys live in app.json `extra`).
 */

/** App Store listing — filled after App Store Connect app creation (manual). */
export const APP_STORE_URL = 'https://apps.apple.com/app/idREPLACE_WITH_ASC_APP_ID'

// Per-app privacy appendix → hexastral-web `/[locale]/privacy/[appKey]` (registered
// in `satellite-privacy-appendices.ts`); Terms is the shared `/[locale]/terms`.
export const PRIVACY_URL = 'https://yuun.hexastral.com/privacy/auspice'
export const TERMS_URL = 'https://yuun.hexastral.com/terms'

/**
 * Flagship funnel deep links (ADR-0010 §4): wedding date-picking → Kindred;
 * office-opening / move-in → Fēng. App Store fallbacks for unverified installs.
 */
export const FLAGSHIP_LINKS = {
  yuan: { deepLink: 'yuan://launch', appStoreUrl: 'https://apps.apple.com/app/idREPLACE_YUAN' },
  feng: { deepLink: 'feng://launch', appStoreUrl: 'https://apps.apple.com/app/idREPLACE_FENG' },
} as const

/**
 * Is a flagship LIVE (shipped on the store) and thus safe to funnel to? A funnel
 * to an unshipped app lands on a placeholder App Store URL (404) — so we gate the
 * cross-app upsell on this. Flip a flag to `true` the moment that app ships AND its
 * `appStoreUrl` above is filled. Both off for now: Kindred is being repositioned
 * (US), Fēng isn't ready.
 */
export const FLAGSHIP_LIVE: Record<keyof typeof FLAGSHIP_LINKS, boolean> = {
  yuan: false,
  feng: false,
}
