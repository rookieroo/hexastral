/**
 * Static app config — store + legal URLs + flagship deep-link targets used by
 * the upsell card. No secrets here (RevenueCat keys live in app.json `extra`).
 */

/** App Store listing — filled after App Store Connect app creation (manual). */
export const APP_STORE_URL = 'https://apps.apple.com/app/idREPLACE_WITH_ASC_APP_ID'

// Per-app privacy appendix → hexastral-web `/[locale]/privacy/[appKey]` (registered
// in `satellite-privacy-appendices.ts`); Terms is the shared `/[locale]/terms`.
export const PRIVACY_URL = 'https://www.hexastral.com/privacy/cycle'
export const TERMS_URL = 'https://www.hexastral.com/terms'

/**
 * Flagship funnel deep links (ADR-0010 §4): wedding date-picking → Yuán;
 * office-opening / move-in → Fēng. App Store fallbacks for unverified installs.
 */
export const FLAGSHIP_LINKS = {
  yuan: { deepLink: 'yuan://launch', appStoreUrl: 'https://apps.apple.com/app/idREPLACE_YUAN' },
  feng: { deepLink: 'feng://launch', appStoreUrl: 'https://apps.apple.com/app/idREPLACE_FENG' },
} as const
