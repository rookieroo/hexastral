/**
 * Per-app privacy appendices under the UseONE, LLC umbrella policy.
 *
 * Scope (2026-06): only the apps we actively ship are disclosed here — Yuel,
 * Yuun, and Yaul. The HexAstral universe is a connected matrix of apps that share
 * ONE sign-in identity, and these appendices describe the data flows that carry
 * across that shared account. Apps still in development are intentionally NOT
 * listed: we don't pre-announce unreleased surfaces, and an appendix only goes
 * live when its app does.
 *
 * Each appendix is a thin, app-specific supplement; the umbrella policy
 * (privacy.{locale}.json) governs everything common.
 */

export const SATELLITE_PRIVACY_KEYS = ['kindred', 'auspice', 'coincast'] as const

export type SatellitePrivacyKey = (typeof SATELLITE_PRIVACY_KEYS)[number]

export function isSatellitePrivacyKey(key: string): key is SatellitePrivacyKey {
  return (SATELLITE_PRIVACY_KEYS as readonly string[]).includes(key)
}

export const SATELLITE_PRIVACY_APPENDICES: Record<
  SatellitePrivacyKey,
  { displayName: string; summary: string; bullets: readonly string[] }
> = {
  kindred: {
    displayName: 'Yuel',
    summary:
      'Relationship synastry (合盘) in the HexAstral universe. Your own birth data drives a solo reading; adding another person creates a "bond" whose compatibility report combines both charts. One shared sign-in carries your bonds across the universe and survives a reinstall.',
    bullets: [
      'Your birth date, 时辰 (hour-pillar index), gender, and optional birthplace power the solo and pair (合盘) charts.',
      "A partner's birth details are stored only when you enter them yourself or they accept an invite and enter their own — both subjects' data backs the bond.",
      'Apple / Google sign-in attaches a recoverable identity (a stable id, and an email when provided) so your bonds restore on a new device; required before any purchase so a subscription is never stranded on a lost device.',
      'People you recorded in Yuun (亲友) can be imported into Yuel as bonds, and a Yuel bond can be sent back to Yuun — the same shared account moves the data; nothing crosses apps until you trigger the carry-over.',
      'Subscription identifiers are processed via RevenueCat. Anonymous funnel telemetry may record steps under target_app=kindred. No ads.',
      'For our referral program and to prevent abuse, we record whether an invitation you accept is your first connection (i.e. whether it onboarded a new member). This is used only for allowance/referral accounting; the specific free-reading and referral limits may change at any time (see Terms).',
    ],
  },
  auspice: {
    displayName: 'Yuun',
    summary:
      'Daily Chinese almanac (黄历) in the HexAstral universe. Anonymous and account-free by default — the base almanac is deterministic. Signing in is optional and only needed to subscribe or to carry data to other universe apps such as Yuel.',
    bullets: [
      'An optional birth date is stored locally on your device and sent only as a request parameter (never as an account) to compute the personalized "对你而言" overlay.',
      '亲友 (friends & family) you add stay on your device; you may export an eligible 亲友 to Yuel as a bond, and import a Yuel bond back into Yuun — only when you choose to, over your one shared sign-in.',
      'Daily reminders are scheduled as local notifications on the device — no push token is registered and no server-side schedule is stored.',
      'The optional AI "deep reading" sends only the date, the selected 宜/忌 field, and your day-master stem (not your full birth date) to authorized LLM providers under DPAs; cost-guarded, no biometric data.',
      'Anonymous funnel telemetry may record steps under target_app=auspice. No ads, no tracking.',
    ],
  },
  coincast: {
    displayName: 'Yaul',
    summary:
      'I Ching Liu Yao (六爻) study journal in the HexAstral universe. Three-coin casting uses on-device physics; classical line values and AI commentary are generated on our servers. No birth chart is required. Sign in with Apple (iOS) is optional and is required only to link readings to your account, restore purchases, and continue after guest limits.',
    bullets: [
      'No natal chart input. Yaul does not ask for your birth date, 时辰, gender, or birthplace to cast. Chart-based features remain in Yuel and Yuun.',
      'What we store for a completed cast: your question (2–500 characters), optional six line values (6/7/8/9) you derived on-device, entropy metadata, and the server-generated hexagram plus AI interpretation fields (interpretation, advice, summary). Signed-in readings are stored in `portfolio_readings` under your user id.',
      'Guests (not signed in): up to 3 full casts per UTC calendar day. Each guest cast is stored on our servers in `portfolio_readings` with no user id, keyed by an `anonymous_id` your app generates — not by Apple ID. After the daily guest limit, you must sign in with Apple to continue on the linked path.',
      'Signed-in users (Apple on iOS): 3 free full casts per UTC calendar month, then each additional cast consumes one `coincast` cast-pack credit on your account unless Yaul Pro is active. Yaul Pro (active `coincast_pro` entitlement / `coincast_pro_expires_at`) removes the monthly free cap.',
      'Consumable cast packs (`coincast_cast_pack_1`, `_5`, `_10`) and Yaul Pro subscriptions (`coincast_pro_monthly`, `coincast_pro_annual`) are validated via RevenueCat. We store entitlement state and `coincast_credits_remaining` on your account — never your payment card.',
      'Classical refusal (三不占): the yiching service may refuse insincere or abusive questions before generating a reading. Refused attempts are not saved as completed readings. For signed-in users, consecutive refusals increment `coincast_consecutive_violations`; at 3 refusals you may see a warning, and at 5 refusals Yaul may pause new casts for 24 hours (`coincast_banned_until`).',
      'Outer sign (外应): if on-device physics detects a coin on its rim (cannot settle yin/yang), the app voids the in-progress hexagram locally and restarts from line 1 — no server call for that line.',
      'Local-only preferences: coin skin, haptics, shake-to-cast, first-cast ritual acknowledgment, a 5-minute cooldown between completed readings, and recent-question duplicate checks (24 hours, up to 5 entries) are stored in on-device storage only.',
      'The 3D coin ritual runs on-device. We do not upload camera, microphone, or photo-library data for casting.',
      'Anonymous funnel telemetry may record onboarding steps under `target_app=coincast`. No ads, no IDFA, no cross-app advertising trackers.',
      'Universal links on hexastral.com (`/lp/hexagram/*`) re-open your own signed-in readings on a device with Yaul installed. These links are owner-scoped for self re-entry, not a public broadcast of your question.',
      'Account deletion (in-app or privacy@hexastral.com) removes your Yaul reading history within 30 days alongside other HexAstral account data. Guest readings keyed only by `anonymous_id` are not linked to your Apple account and are not recovered on sign-in.',
    ],
  },
}
