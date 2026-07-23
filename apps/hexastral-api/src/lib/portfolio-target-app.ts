/**
 * Optional `x-target-app` header — defaults to flagship (`hexastral`) for shared API routes.
 */

export function resolvePortfolioTargetApp(headerValue: string | undefined): string {
  const raw = headerValue?.trim().toLowerCase()
  if (!raw) return 'hexastral'
  if (!/^[a-z0-9_-]{1,64}$/.test(raw)) return 'hexastral'
  return raw
}

/** Store / Telegram display brand for a portfolio `targetApp` codename. */
export function portfolioTargetBrandLabel(targetApp: string): string {
  switch (targetApp) {
    case 'faceoracle':
      return 'Syel'
    case 'kindred':
      return 'Yuel'
    case 'feng':
      return 'Kanyu'
    case 'auspice':
      return 'Yuun'
    case 'coincast':
      return 'Yaul'
    case 'hexastral':
      return 'HexAstral'
    default:
      return targetApp
  }
}
