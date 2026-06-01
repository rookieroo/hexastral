export const SATELLITE_PRIVACY_KEYS = [
  'faceoracle',
  'starpalace',
  'soulmatch',
  'fengshui',
  'dreamoracle',
  'eightpillars',
  'coincast',
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
}
