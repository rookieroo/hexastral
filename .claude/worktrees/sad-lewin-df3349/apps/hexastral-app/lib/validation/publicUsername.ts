/**
 * Matches hexastral-api rules for `PATCH /api/user/visibility`
 * (username trim, length 2–30, `[a-z0-9_]+`).
 */
const USERNAME_PUBLIC_PATTERN = /^[a-z0-9_]+$/

export function isUsernameEligibleForPublicVisibility(username: string | null | undefined): boolean {
  const u = (username ?? '').trim()
  return u.length >= 2 && u.length <= 30 && USERNAME_PUBLIC_PATTERN.test(u)
}
