/**
 * Per-app privacy appendices under the UseONE, LLC umbrella policy.
 *
 * Scope (2026-06): only the apps we actively ship are disclosed here — Kindred
 * and Auspice. The HexAstral universe is a connected matrix of apps that share
 * ONE sign-in identity, and these appendices describe the data flows that carry
 * across that shared account. Apps still in development are intentionally NOT
 * listed: we don't pre-announce unreleased surfaces, and an appendix only goes
 * live when its app does.
 *
 * Each appendix is a thin, app-specific supplement; the umbrella policy
 * (privacy.{locale}.json) governs everything common.
 */

export const SATELLITE_PRIVACY_KEYS = ['kindred', 'auspice'] as const

export type SatellitePrivacyKey = (typeof SATELLITE_PRIVACY_KEYS)[number]

export function isSatellitePrivacyKey(key: string): key is SatellitePrivacyKey {
  return (SATELLITE_PRIVACY_KEYS as readonly string[]).includes(key)
}

export const SATELLITE_PRIVACY_APPENDICES: Record<
  SatellitePrivacyKey,
  { displayName: string; summary: string; bullets: readonly string[] }
> = {
  kindred: {
    displayName: 'Kindred',
    summary:
      'Relationship synastry (合盘) in the HexAstral universe. Your own birth data drives a solo reading; adding another person creates a "bond" whose compatibility report combines both charts. One shared sign-in carries your bonds across the universe and survives a reinstall.',
    bullets: [
      'Your birth date, 时辰 (hour-pillar index), gender, and optional birthplace power the solo and pair (合盘) charts.',
      "A partner's birth details are stored only when you enter them yourself or they accept an invite and enter their own — both subjects' data backs the bond.",
      'Apple / Google sign-in attaches a recoverable identity (a stable id, and an email when provided) so your bonds restore on a new device; required before any purchase so a subscription is never stranded on a lost device.',
      'People you recorded in Auspice (亲友) can be imported into Kindred as bonds, and a Kindred bond can be sent back to Auspice — the same shared account moves the data; nothing crosses apps until you trigger the carry-over.',
      'Subscription identifiers are processed via RevenueCat. Anonymous funnel telemetry may record steps under target_app=kindred. No ads.',
    ],
  },
  auspice: {
    displayName: 'Auspice',
    summary:
      'Daily Chinese almanac (黄历) in the HexAstral universe. Anonymous and account-free by default — the base almanac is deterministic. Signing in is optional and only needed to subscribe or to carry data to other universe apps such as Kindred.',
    bullets: [
      'An optional birth date is stored locally on your device and sent only as a request parameter (never as an account) to compute the personalized "对你而言" overlay.',
      '亲友 (friends & family) you add stay on your device; you may export an eligible 亲友 to Kindred as a bond, and import a Kindred bond back into Auspice — only when you choose to, over your one shared sign-in.',
      'Daily reminders are scheduled as local notifications on the device — no push token is registered and no server-side schedule is stored.',
      'The optional AI "deep reading" sends only the date, the selected 宜/忌 field, and your day-master stem (not your full birth date) to authorized LLM providers under DPAs; cost-guarded, no biometric data.',
      'Anonymous funnel telemetry may record steps under target_app=auspice. No ads, no tracking.',
    ],
  },
}
