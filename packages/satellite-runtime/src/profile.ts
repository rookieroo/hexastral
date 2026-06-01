/**
 * Portfolio user profile — read/write the signed-in user's public profile
 * fields (`username`, `displayName`, `chartPublic`) against hexastral-api's
 * `/api/user/*` routes. Used by satellites to surface a user-controlled public
 * page (`hexastral.com/u/:username`) without owning a web account UI.
 *
 * All three helpers HMAC-sign requests via the satellite portfolio session
 * (same signer as `use-portfolio-birth-info`); they require the user to be
 * signed in. `check-username` and `GET /:userId` are HMAC-guarded server-side;
 * `GET /by-username/:username` (public read) is exposed separately for web
 * consumption and isn't called from here.
 */

import { resolvePortfolioApiUrl } from './api-url'
import { signRequest } from './hmac'
import { getPortfolioUserId } from './session'

export interface PortfolioProfile {
  id: string
  username: string | null
  displayName: string | null
  chartPublic: boolean
  /** Bound email or `null` if the user hasn't completed OTP yet. */
  email: string | null
}

interface ProfileResponse {
  data: {
    id: string
    username?: string | null
    displayName?: string | null
    email?: string | null
    /** SQLite stores booleans as 0/1; tolerate both wire shapes. */
    chartPublic?: boolean | number | null
    [k: string]: unknown
  }
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

function toProfile(raw: ProfileResponse['data']): PortfolioProfile {
  return {
    id: raw.id,
    username: asString(raw.username),
    displayName: asString(raw.displayName),
    chartPublic: raw.chartPublic === true || raw.chartPublic === 1,
    email: asString(raw.email),
  }
}

/** Signed (HMAC v2) request against `/api/user/*`. */
async function signedUserRequest(
  method: 'GET' | 'PATCH',
  path: string,
  query: string,
  body?: unknown
): Promise<Response> {
  const userId = await getPortfolioUserId()
  if (!userId) throw new Error('Profile access requires authenticated user.')
  const requestBody = body !== undefined ? JSON.stringify(body) : ''
  const signed = await signRequest({ body: requestBody, userId, method, path })
  if (!signed) throw new Error('Profile request requires deviceSecret.')

  return fetch(`${resolvePortfolioApiUrl()}${path}${query}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${userId}`,
      ...signed,
    },
    ...(body !== undefined ? { body: requestBody } : {}),
  })
}

/** Read the current user's profile. Returns null when signed out or on failure. */
export async function getPortfolioProfile(): Promise<PortfolioProfile | null> {
  const userId = await getPortfolioUserId()
  if (!userId) return null
  try {
    const res = await signedUserRequest('GET', `/api/user/${userId}`, '')
    if (!res.ok) return null
    const json = (await res.json()) as ProfileResponse
    return toProfile(json.data)
  } catch {
    return null
  }
}

/** Username validation pattern (mirrors server: lowercase a–z, 0–9, _, 2–30 chars). */
const USERNAME_PATTERN = /^[a-z0-9_]+$/

export type UsernameCheckResult =
  | { available: true; reason?: undefined }
  | { available: false; reason: 'invalid' | 'taken' | 'network' }

/**
 * Check whether a username can be claimed by the signed-in user. The server
 * excludes the current user from the collision check, so re-confirming your
 * own existing username always returns `available: true`.
 */
export async function checkPortfolioUsernameAvailable(
  username: string
): Promise<UsernameCheckResult> {
  const trimmed = username.trim().toLowerCase()
  if (trimmed.length < 2 || trimmed.length > 30 || !USERNAME_PATTERN.test(trimmed)) {
    return { available: false, reason: 'invalid' }
  }
  try {
    const res = await signedUserRequest(
      'GET',
      '/api/user/check-username',
      `?username=${encodeURIComponent(trimmed)}`
    )
    if (!res.ok) return { available: false, reason: 'network' }
    const json = (await res.json()) as { available?: boolean; reason?: string }
    if (json.available === true) return { available: true }
    return { available: false, reason: json.reason === 'invalid' ? 'invalid' : 'taken' }
  } catch {
    return { available: false, reason: 'network' }
  }
}

/**
 * Patch one or more profile fields. Server returns the updated user row; we
 * normalize it back into a `PortfolioProfile`. Throws on failure with the
 * server's error message so the caller can surface it.
 */
export async function updatePortfolioProfile(input: {
  username?: string
  displayName?: string
  chartPublic?: boolean
}): Promise<PortfolioProfile> {
  const userId = await getPortfolioUserId()
  if (!userId) throw new Error('Profile update requires authenticated user.')
  const res = await signedUserRequest('PATCH', `/api/user/${userId}/profile`, '', input)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Profile update failed: ${res.status}`)
  }
  const json = (await res.json()) as ProfileResponse
  return toProfile(json.data)
}
