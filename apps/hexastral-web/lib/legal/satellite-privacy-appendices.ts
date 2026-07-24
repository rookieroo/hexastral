/**
 * Per-app privacy appendices under the UseONE, LLC umbrella policy.
 *
 * Scope (2026-07): Yuel, Yuun, Yaul, Kanyu (feng), and Syel. The HexAstral
 * universe is ONE sign-in identity, and these appendices describe the data flows
 * that carry across that shared account. Apps still in development are
 * intentionally NOT listed: we don't pre-announce unreleased surfaces, and an
 * appendix only goes live when its app does.
 *
 * Each appendix is a thin, app-specific supplement; the umbrella policy
 * (privacy.{locale}.json) governs everything common.
 */

export const SATELLITE_PRIVACY_KEYS = [
  'yuel',
  'yuun',
  'yaul',
  'kanyu',
  'syel',
] as const

export type SatellitePrivacyKey = (typeof SATELLITE_PRIVACY_KEYS)[number]

export function isSatellitePrivacyKey(key: string): key is SatellitePrivacyKey {
  return (SATELLITE_PRIVACY_KEYS as readonly string[]).includes(key)
}

export const SATELLITE_PRIVACY_APPENDICES: Record<
  SatellitePrivacyKey,
  { displayName: string; summary: string; bullets: readonly string[] }
> = {
  yuel: {
    displayName: 'Yuel',
    summary:
      'Relationship synastry (合盘) in the HexAstral universe. Your own birth data drives a solo reading; adding another person creates a "bond" whose compatibility report combines both charts. One shared sign-in carries your bonds across the universe and survives a reinstall. For entertainment and cultural exploration only — not relationship counseling or professional advice.',
    bullets: [
      'Not professional advice. Yuel readings and chat are for entertainment, cultural exploration, and personal reflection. We do not guarantee relationship, marriage, or compatibility outcomes.',
      'Your birth date, 时辰 (hour-pillar index), gender, and optional birthplace power the solo and pair (合盘) charts.',
      "A partner's birth details are stored only when you enter them yourself or they accept an invite and enter their own — both subjects' data backs the bond.",
      'Apple / Google sign-in attaches a recoverable identity (a stable id, and an email when provided) so your bonds restore on a new device; required before any purchase so a subscription is never stranded on a lost device.',
      'People you recorded in Yuun (亲友) can be imported into Yuel as bonds, and a Yuel bond can be sent back to Yuun — the same shared account moves the data; nothing crosses apps until you trigger the carry-over.',
      'Subscription identifiers are processed via RevenueCat. Anonymous funnel telemetry may record steps under target_app=kindred. Paid acquisition measurement may use first-party cookies (UTM / click ids) and server-side conversion postbacks (no IDFA, no third-party ad SDKs in the app).',
      'For our referral program and to prevent abuse, we record whether an invitation you accept is your first connection (i.e. whether it onboarded a new member). This is used only for allowance/referral accounting; the specific free-reading and referral limits may change at any time (see Terms).',
    ],
  },
  yuun: {
    displayName: 'Yuun',
    summary:
      'Daily Chinese almanac (黄历) in the HexAstral universe. Anonymous and account-free by default — the base almanac is deterministic. Signing in is optional and only needed to subscribe or to carry data to other universe apps such as Yuel.',
    bullets: [
      'An optional birth date is stored locally on your device and sent only as a request parameter (never as an account) to compute the personalized "对你而言" overlay.',
      '亲友 (friends & family) you add stay on your device; you may export an eligible 亲友 to Yuel as a bond, and import a Yuel bond back into Yuun — only when you choose to, over your one shared sign-in.',
      'Daily reminders are scheduled as local notifications on the device — no push token is registered and no server-side schedule is stored.',
      'The optional AI "deep reading" sends only the date, the selected 宜/忌 field, and your day-master stem (not your full birth date) to authorized LLM providers under DPAs; cost-guarded, no biometric data.',
      'Timeline, chart deep-read, and AI chat outputs are for entertainment, cultural exploration, and personal reflection — not medical, legal, financial, or life advice.',
      'Anonymous funnel telemetry may record steps under target_app=auspice. No IDFA and no third-party ad SDKs in the app; paid web acquisition may use first-party cookies and server-side conversion postbacks.',
    ],
  },
  yaul: {
    displayName: 'Yaul',
    summary:
      'I Ching Liu Yao (六爻) study journal in the HexAstral universe. Three-coin casting uses on-device physics; free-tier casts return deterministic classical output (hexagram, I Ching corpus, na-jia). Optional AI commentary requires cast-pack credits or Yaul Pro. No birth chart is required. Sign in with Apple (iOS) is optional and is required only to link readings to your account, restore purchases, and continue after guest limits.',
    bullets: [
      'No natal chart input. Yaul does not ask for your birth date, 时辰, gender, or birthplace to cast. Chart-based features remain in Yuel and Yuun.',
      'What we store for a completed cast: your question (2–500 characters), optional six line values (6/7/8/9) you derived on-device, entropy metadata, and the server-generated hexagram plus interpretation fields. Free-tier casts use deterministic corpus + na-jia only — no third-party LLM. AI fields (interpretation, advice, summary) are generated only when you consume a cast-pack credit or have active Yaul Pro for that cast.',
      'Guests (not signed in): up to 3 classical casts per UTC calendar day. Each guest cast is stored on our servers in `portfolio_readings` with no user id, keyed by an `anonymous_id` your app generates — not by Apple ID. After the daily guest limit, you must sign in with Apple to continue on the linked path.',
      'Signed-in users (Apple on iOS): 3 free classical casts per UTC calendar month, then each additional cast consumes one `coincast` cast-pack credit (AI commentary) on your account unless Yaul Pro is active. Yaul Pro (active `coincast_pro` entitlement / `coincast_pro_expires_at`) removes the monthly free cap and includes AI on each cast.',
      'Consumable cast packs (`coincast_cast_pack_1`, `_5`, `_10`) and Yaul Pro subscriptions (`coincast_pro_monthly`, `coincast_pro_annual`) are validated via RevenueCat. We store entitlement state and `coincast_credits_remaining` on your account — never your payment card.',
      'Classical refusal (三不占): rule-based guards may refuse insincere or abusive questions before generating a reading — no LLM is required for this check on free-tier casts. Refused attempts are not saved as completed readings. For signed-in users, consecutive refusals increment `coincast_consecutive_violations`; at 3 refusals you may see a warning, and at 5 refusals Yaul may pause new casts for 24 hours (`coincast_banned_until`).',
      'Outer sign (外应): if on-device physics detects a coin on its rim (cannot settle yin/yang), the app voids the in-progress hexagram locally and restarts from line 1 — no server call for that line.',
      'Local-only preferences: coin skin, haptics, shake-to-cast, first-cast ritual acknowledgment, a 5-minute cooldown between completed readings, and recent-question duplicate checks (24 hours, up to 5 entries) are stored in on-device storage only.',
      'Optional portfolio memory (off by default): when you enable it in Settings, only AI-tier casts may retrieve short summaries of your prior Yaul AI readings to enrich new AI casts. Classical (free-tier) casts are never indexed. Memory is stored on HexAstral servers under your account; you can disable it anytime.',
      'The 3D coin ritual runs on-device. We do not upload camera, microphone, or photo-library data for casting.',
      'Anonymous funnel telemetry may record onboarding steps under `target_app=coincast`. No IDFA and no cross-app advertising trackers in the app; paid web acquisition may use first-party cookies and server-side conversion postbacks.',
      'Universal links on hexastral.com (`/lp/hexagram/*`) re-open your own signed-in readings on a device with Yaul installed. These links are owner-scoped for self re-entry, not a public broadcast of your question.',
      'Classical and AI commentary are for entertainment, cultural study, and personal reflection — not fortune-telling, prediction, or professional advice.',
      'Account deletion (in-app or privacy@hexastral.com) removes your Yaul reading history within 30 days alongside other HexAstral account data. Guest readings keyed only by `anonymous_id` are not linked to your Apple account and are not recovered on sign-in.',
    ],
  },
  kanyu: {
    displayName: 'Kanyu',
    summary:
      'Classical feng-shui (堪舆) site analysis in the HexAstral universe. Pin a home or office, calibrate facing on satellite imagery, optionally upload floor plans for room-level reading, and receive a structured report with deterministic 玄空 / 八宅 compute plus AI synthesis. Optional birth profile improves the 八宅 chapter only. Sign in with Apple or Google is optional but required before any purchase. Kanyu is a cultural/educational digital tool — not on-site professional feng-shui, architecture, or surveying.',
    bullets: [
      'Not professional advice. Kanyu does not replace licensed architects, surveyors, engineers, building inspectors, real-estate professionals, or experienced human 风水师. Reports and chat are for entertainment, cultural exploration, and personal reflection only. We do not guarantee wealth, health, relationship, construction, or property outcomes.',
      'Report vs chat reliability. The report mixes deterministic classical compute (玄空飞星, 八宅, 格局/形理) with AI-inferred remote landform notes from satellite tiles, elevation models, and optional floor-plan vision — the latter may be wrong or incomplete. Report narrative is AI-generated under prompt constraints but is not guaranteed accurate. Chat follow-ups are separate, less constrained LLM replies scoped to your report id: they may hallucinate, drift, or contradict the report and are reference-only — never professional advice.',
      'Site inputs we store: name, formatted address, latitude/longitude (from your pin), facing bearing, build year, move-in year, floor count, and optional per-floor bearings. These power Mapbox satellite tiles, magnetic-declination correction, and deterministic flying-star / 八宅 chapters. You are responsible for the accuracy of facing, build year, and floor-plan inputs.',
      'Optional floor plans: you may upload one or more images from your photo library. Images are sent over TLS to our servers (EXIF/GPS metadata stripped on upload), stored in private object storage keyed to your account, and processed by a vision model to localize rooms into the nine palaces. Deleting a site purges its floor-plan images from storage; the finished report keeps only derived room findings, not the raw image.',
      'Exterior analysis: satellite tiles around your pin are rendered and annotated by a vision model (峦头 context). Annotated tile cache keys and structured vision JSON are saved on the report — not a permanent public map URL. No on-site inspection is performed.',
      'Optional birth profile: if your shared HexAstral user row includes birth date and gender, the 八宅 chapter uses them; without birth info the report still completes with an in-report notice and the 玄空 / exterior chapters remain.',
      'Anonymous boot: first launch registers a device-scoped user via POST /api/user and stores a device secret for HMAC signing. Apple / Google sign-in links that session for cross-device restore across universe apps.',
      'Paywall: each full site analysis job requires one unconsumed one-time purchase matched to your declared residence type — `hexastral_feng_single` for apartment / compound-unit residences (currently from approximately USD $9.99 in supported markets) or `hexastral_feng_premium` for large flat / detached-villa residences (currently approximately USD $39.99 when that SKU is enabled in the store). Until the premium SKU is live end-to-end, all residence types may be billed at the single-tier price. There is no Kanyu subscription and no free monthly feng analysis quota. The single purchase is consumed only after a report completes successfully.',
      'Bundled chat: unlimited AI chat about that same report is included with the purchase (no separate chat SKU), unlocked only after analysis completes. Chat messages, your question text, and report context snippets are stored in our conversation tables under your user id and sent to authorized LLM providers under DPAs. Chat is moderated automatically; abusive prompts may be refused. Fair-use rate limits may apply. See Terms §3 Kanyu limitations.',
      'When portfolio memory is enabled on your account, report synthesis may retrieve short summaries from your prior HexAstral readings to add context; chat may also reference the saved report chapters. It never pulls another user\'s data.',
      'Location & sensors (on-device): when-in-use location for map preview and declination; magnetometer for facing calibration. We do not run background location tracking.',
      'Reports, sites, job status, and chat threads live in `feng_reports`, `feng_sites`, `feng_jobs`, and chat conversation tables under your user id. RevenueCat validates `hexastral_feng_single` and `hexastral_feng_premium` one-time purchases — we never see your payment card.',
      'Anonymous funnel telemetry may record onboarding steps under `target_app=feng`. No IDFA and no cross-app advertising trackers in the app; paid web acquisition may use first-party cookies and server-side conversion postbacks.',
      'Account deletion removes your feng sites, reports, and related chat history within 30 days alongside other HexAstral account data.',
    ],
  },
  syel: {
    displayName: 'Syel',
    summary:
      'Face and palm physiognomy (形气 / 相) readings in the HexAstral universe. You capture left palm, right palm, and a clear face photo, then supply birth details so structured features can be contrasted with a BaZi summary. Sign in with Apple is required before biometric processing and purchases. Readings are for entertainment and cultural exploration only — not medical diagnosis, fate claims, or professional advice. Server product ids remain faceoracle_*; the consumer brand is Syel.',
    bullets: [
      'Not professional advice. Syel outputs are for entertainment, cultural study, and personal reflection. We do not provide medical, dermatological, psychological, legal, or fortune-telling advice, and we do not guarantee life outcomes.',
      'Biometric processing consent: before any face or palm image is sent for feature extraction, you must accept an in-app biometric disclosure (BIPA / GDPR Art.9 style). We record a timestamp and disclosure version on your account. You may withdraw consent anytime in Settings; processing is blocked until you opt in again at the current disclosure version.',
      'Photos you choose (camera or library): left palm, right palm, and face. Images are uploaded over TLS for a single request, used only to extract structured feature vectors via authorized vision models under DPAs, then discarded — source images are not retained in object storage or in reading JSON after the request completes. We do not sell biometric data or use it for advertising.',
      'On-device period workspace: the app may keep the current three photos only in the device app sandbox so you can view or replace a slot before the next reading. Replacing a slot deletes the previous local file. These files are not synced to our servers as a photo archive. Signing out or withdrawing biometric consent clears the local workspace.',
      'What we keep after a reading: structured physiognomy feature records (not raw pixels), the narrative / structured reading JSON (without imageBase64), birth profile fields you entered (solar date, 时辰 index, gender, optional city), and an optional forward event table used for Pro reminders.',
      'Birth details: required for a complete reading so physiognomy can be contrasted with natal context. They are stored with your shared HexAstral account birth profile and may be reused across universe apps you choose to open while signed in.',
      'Identity: portfolio Apple sign-in links a recoverable user id (and email when Apple provides it) so purchases and history restore on a new device. HMAC-signed device secrets protect API calls.',
      'Monetization (opaque ids): consumable `faceoracle_reading` for a one-shot complete reading; subscriptions `faceoracle_pro_monthly` / `faceoracle_pro_annual` grant `faceoracle_pro` (Timeline / photo-slot quota). Payments are validated via RevenueCat — we never see your card number.',
      'Pro reminders: if you enable reminders, we may schedule local and/or push notifications for monthly re-capture nudges and “宜留意” windows derived from your active event table. Push tokens are registered only when you opt in. Copy uses exploratory framing, not deterministic fate (see umbrella policy / portfolio voice rules).',
      'Anonymous funnel telemetry may record onboarding steps under `target_app=faceoracle`. No IDFA and no cross-app advertising trackers in the app; paid web acquisition may use first-party cookies and server-side conversion postbacks.',
      'Universal links on hexastral.com (`/lp/face/*`, `/lp/palm/*`) may open Syel when installed (bundle `com.hexastral.syel`).',
      'Account deletion (in-app request or privacy@hexastral.com) removes your Syel features, readings, and related account data within 30 days alongside other HexAstral universe data. Withdrawing biometric consent stops new processing but does not by itself delete historical structured features or readings — use account deletion for full erasure.',
    ],
  },
}
