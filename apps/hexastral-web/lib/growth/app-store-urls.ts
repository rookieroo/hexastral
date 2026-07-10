/** Which App Store URL to use for growth CTAs. Default fallback: Yuel (soulmatch). */
export type GrowthAppStoreTarget =
  | 'hexastral'
  | 'faceoracle'
  | 'starpalace'
  | 'soulmatch'
  | 'fengshui'
  | 'dreamoracle'
  | 'eightpillars'
  | 'coincast'
  | 'auspice'

/** Yuel / kindred — primary flagship when per-target env is unset. */
const YUEL_FALLBACK =
  process.env.NEXT_PUBLIC_APP_STORE_URL_SOULMATCH?.trim() ||
  'https://apps.apple.com/app/kindred/id6745054798'

const byTarget: Record<GrowthAppStoreTarget, string | undefined> = {
  hexastral: process.env.NEXT_PUBLIC_APP_STORE_URL,
  faceoracle: process.env.NEXT_PUBLIC_APP_STORE_URL_FACEORACLE,
  starpalace: process.env.NEXT_PUBLIC_APP_STORE_URL_STARPALACE,
  soulmatch: process.env.NEXT_PUBLIC_APP_STORE_URL_SOULMATCH,
  fengshui: process.env.NEXT_PUBLIC_APP_STORE_URL_FENGSHUI,
  dreamoracle: process.env.NEXT_PUBLIC_APP_STORE_URL_DREAMORACLE,
  eightpillars: process.env.NEXT_PUBLIC_APP_STORE_URL_EIGHTPILLARS,
  coincast: process.env.NEXT_PUBLIC_APP_STORE_URL_COINCAST,
  auspice: process.env.NEXT_PUBLIC_APP_STORE_URL_AUSPICE,
}

export function resolveAppStoreUrl(target: GrowthAppStoreTarget): string {
  const url = byTarget[target]?.trim()
  if (url) return url
  if (target === 'hexastral') return YUEL_FALLBACK
  return YUEL_FALLBACK
}
