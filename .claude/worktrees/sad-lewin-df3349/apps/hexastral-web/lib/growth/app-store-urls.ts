/** Which App Store URL to use for growth CTAs. Fallback: flagship HexAstral. */
export type GrowthAppStoreTarget =
  | 'hexastral'
  | 'faceoracle'
  | 'starpalace'
  | 'soulmatch'
  | 'fengshui'
  | 'dreamoracle'
  | 'eightpillars'
  | 'coincast'

const HEX =
  process.env.NEXT_PUBLIC_APP_STORE_URL ?? 'https://apps.apple.com/app/hexastral/id6739739495'

const byTarget: Record<GrowthAppStoreTarget, string | undefined> = {
  hexastral: process.env.NEXT_PUBLIC_APP_STORE_URL,
  faceoracle: process.env.NEXT_PUBLIC_APP_STORE_URL_FACEORACLE,
  starpalace: process.env.NEXT_PUBLIC_APP_STORE_URL_STARPALACE,
  soulmatch: process.env.NEXT_PUBLIC_APP_STORE_URL_SOULMATCH,
  fengshui: process.env.NEXT_PUBLIC_APP_STORE_URL_FENGSHUI,
  dreamoracle: process.env.NEXT_PUBLIC_APP_STORE_URL_DREAMORACLE,
  eightpillars: process.env.NEXT_PUBLIC_APP_STORE_URL_EIGHTPILLARS,
  coincast: process.env.NEXT_PUBLIC_APP_STORE_URL_COINCAST,
}

export function resolveAppStoreUrl(target: GrowthAppStoreTarget): string {
  return byTarget[target]?.trim() || HEX
}
