import { config } from './config'
import { signRequest } from './hmac'
import { getStoredFengUserId } from './user-session'

/**
 * Permanently delete the current account (Apple 5.1.1(v)).
 *
 * The server erases all PII + unlinks Apple/Google so the account is
 * irrecoverable. The caller MUST then sign out and clear the local session —
 * the stale userId can no longer be signed for.
 */
export async function deleteAccount(): Promise<void> {
  const userId = await getStoredFengUserId()
  if (!userId) throw new Error('delete_account_requires_auth')

  const path = `/api/user/${userId}`
  const signed = await signRequest({ body: '', userId, method: 'DELETE', path })
  if (!signed) throw new Error('delete_account_requires_device_secret')

  const res = await fetch(`${config.apiUrl}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userId}`, ...signed },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`delete_account_failed:${res.status}:${text}`)
  }
}
