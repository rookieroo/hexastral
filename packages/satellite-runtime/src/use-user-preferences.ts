import { resolvePortfolioApiUrl } from './api-url'
import { signRequest } from './hmac'
import { getPortfolioUserId } from './session'

export interface UserPreferencesUpdate {
  /** App locale tag — e.g. `zh-Hans`, `zh-Hant`, `ja`, `en`. */
  locale?: string
  /** Reading tone preference — see `tonePreference` server enum. */
  tonePreference?: string
  /** Notification preference JSON; server stringifies and stores as text. */
  notifPrefs?: Record<string, unknown>
}

/**
 * Fire-and-forget PATCH to `/api/user/:userId/preferences`. Authenticated
 * callers only — silently no-ops if the device hasn't signed in yet (the
 * caller's local AsyncStorage write is already the source of truth; server
 * sync is best-effort and will retry on the next preference change).
 *
 * Returns `true` if the request was sent and accepted; `false` otherwise.
 */
export async function saveUserPreferences(input: UserPreferencesUpdate): Promise<boolean> {
  const userId = await getPortfolioUserId()
  if (!userId) return false

  const path = `/api/user/${encodeURIComponent(userId)}/preferences`
  const body = JSON.stringify(input)
  const signed = await signRequest({ body, userId, method: 'PATCH', path })
  if (!signed) return false

  try {
    const res = await fetch(`${resolvePortfolioApiUrl()}${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userId}`,
        ...signed,
      },
      body,
    })
    return res.ok
  } catch {
    return false
  }
}
