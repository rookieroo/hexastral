export const SATELLITE_PRIVACY_KEYS = [
  'faceoracle',
  'starpalace',
  'soulmatch',
  'fengshui',
  'dreamoracle',
  'eightpillars',
  'coincast',
  'numerology',
  'compass',
  'cycle',
] as const

export type SatellitePrivacyKey = (typeof SATELLITE_PRIVACY_KEYS)[number]

export function isSatellitePrivacyKey(key: string): key is SatellitePrivacyKey {
  return (SATELLITE_PRIVACY_KEYS as readonly string[]).includes(key)
}

export const SATELLITE_PRIVACY_APPENDICES: Record<
  SatellitePrivacyKey,
  { displayName: string; summary: string; bullets: readonly string[] }
> = {
  faceoracle: {
    displayName: 'Face Oracle',
    summary:
      'Satellite app focused on face and palm readings. Photo capture uses device hardware; uploads follow the shared HexAstral media retention rules.',
    bullets: [
      'Camera and photo library access only when you start a capture flow.',
      'Images may be processed by authorized AI vision systems under DPAs; ephemeral handling matches the flagship Face/Palm notice.',
      'Growth funnel telemetry may include anonymous install ID and campaign metadata tied to this app key.',
    ],
  },
  starpalace: {
    displayName: 'Star Palace',
    summary:
      'Zi Wei Dou Shu–oriented experiences; birth datetimes drive palace calculations shared with the flagship chart engine.',
    bullets: [
      'Birth date, time window, gender, and location equivalents used for chart computation.',
      'Subscription or SKU identifiers processed via RevenueCat policies.',
      'Anonymous usage telemetry may record funnel steps under target_app=starpalace.',
    ],
  },
  soulmatch: {
    displayName: 'Soul Match',
    summary:
      'Compatibility-oriented flows may combine two profiles; both subjects must consent before persistence.',
    bullets: [
      'Partner inputs are stored only when explicitly submitted inside the compatibility workflow.',
      'Pair-reading identifiers reference existing HexAstral bond/read models when synced.',
      'Marketing attribution reuses the shared DDL session store with TTL.',
    ],
  },
  fengshui: {
    displayName: 'Feng Shui AI',
    summary:
      'Environmental layouts or bearing measurements may be captured as structured metadata plus optional imagery.',
    bullets: [
      'Floor-plan uploads follow R2 object prefixes scoped by target_app=fengshui.',
      'Derived analyses stored with analyses.target_app for quota reporting.',
      'No automated resale of location snapshots—deleted according to media retention policies.',
    ],
  },
  dreamoracle: {
    displayName: 'Dream Oracle',
    summary:
      'Dream journaling features collect voluntary narrative text for interpretation pipelines.',
    bullets: [
      'Free-text dreams may be logged with timestamps for revisitation.',
      'LLM inference flows inherit flagship AI provider safeguards.',
      'You may delete historical entries via standard account deletion channels.',
    ],
  },
  eightpillars: {
    displayName: 'Eight Pillars',
    summary: 'BaZi-heavy onboarding emphasizes day-master storytelling with TikTok-style funnels.',
    bullets: [
      'Birth information aligns with flagship BaZi calculations.',
      'Waitlist or viral referrals store minimal identity markers until signup completes.',
      'Anonymous funnel analytics differentiate eightpillars vs flagship shells.',
    ],
  },
  coincast: {
    displayName: 'Coin Cast',
    summary: 'I Ching coin/divination flows reuse yijing endpoints with portfolio quotas.',
    bullets: [
      'Questions and entropy choices logged under divinations.target_app=coincast.',
      'Purchases or credits follow RevenueCat entitlements.',
      'Telemetry captures ritual UX interactions without recording biometric data.',
    ],
  },
  numerology: {
    displayName: 'Numerology',
    summary:
      'Life-path and numerology calculations based on birth date; no additional personal data beyond standard birth information.',
    bullets: [
      'Birth date used for life-path number, expression number, and related calculations.',
      'Subscription entitlements managed via RevenueCat.',
      'Reading results stored in portfolio with target_app=numerology for cross-app recall when opted in.',
    ],
  },
  compass: {
    displayName: 'Compass',
    summary: 'Free utility providing a traditional Luopan compass overlay. No account required.',
    bullets: [
      'Magnetometer and device orientation sensor data processed locally; not transmitted to servers.',
      'No birth information or personal data collected.',
      'Optional deep-link to Feng app includes only bearing angle metadata, no location data.',
    ],
  },
  cycle: {
    displayName: 'Cycle',
    summary:
      'Daily Chinese almanac (黄历). Anonymous and account-free; the base almanac is deterministic. An optional birth date stays on your device.',
    bullets: [
      'An optional birth date is stored locally on your device and sent only as a request parameter (never an account) to compute the personalized “对你而言” overlay.',
      'Daily reminders are scheduled as local notifications on the device — no push token is registered and no server-side schedule is stored.',
      'The optional AI “deep reading” sends only the date, the selected 宜/忌 field, and your day-master stem (not your full birth date) to authorized LLM providers under DPAs; cost-guarded, no biometric data.',
      'Anonymous funnel telemetry may record steps under target_app=cycle. No ads, no tracking.',
    ],
  },
}
