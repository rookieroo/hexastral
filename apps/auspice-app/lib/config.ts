/**
 * Static app config — store + legal URLs + flagship deep-link targets used by
 * the upsell card. No secrets here (RevenueCat keys live in app.json `extra`).
 */

import type { Locale } from '@/lib/i18n'

/** App Store listing — filled after App Store Connect app creation (manual). */
export const APP_STORE_URL = 'https://apps.apple.com/app/idREPLACE_WITH_ASC_APP_ID'

// Per-app privacy appendix → hexastral-web `/[locale]/privacy/[appKey]` (registered
// in `satellite-privacy-appendices.ts`); Terms is the shared `/[locale]/terms`. Both
// are locale-segmented (en|zh|tw|ja) so a non-English store listing or in-app link lands
// on a page in the reader's language — the web app's `localePrefix: 'as-needed'` would
// otherwise resolve a bare path to English. Mirrors Yuel's `privacyPolicyUrl` (lib/i18n.ts).
const LEGAL_BASE = 'https://yuun.hexastral.com'

/** App Locale → hexastral-web `[locale]` URL segment. */
function legalSegment(locale: Locale): string {
  return locale === 'zh-Hant' ? 'tw' : locale === 'zh-Hans' ? 'zh' : locale === 'ja' ? 'ja' : 'en'
}

/** Yuun per-app privacy appendix (the `auspice` appendix) on the brand subdomain. */
export function privacyUrl(locale: Locale): string {
  return `${LEGAL_BASE}/${legalSegment(locale)}/privacy/auspice`
}

/** Shared suite Terms document on the brand subdomain. */
export function termsUrl(locale: Locale): string {
  return `${LEGAL_BASE}/${legalSegment(locale)}/terms`
}

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
