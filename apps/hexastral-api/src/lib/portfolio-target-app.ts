/**
 * Optional `x-target-app` header — defaults to flagship (`hexastral`) for shared API routes.
 */

export function resolvePortfolioTargetApp(headerValue: string | undefined): string {
  const raw = headerValue?.trim().toLowerCase()
  if (!raw) return 'hexastral'
  if (!/^[a-z0-9_-]{1,64}$/.test(raw)) return 'hexastral'
  return raw
}
