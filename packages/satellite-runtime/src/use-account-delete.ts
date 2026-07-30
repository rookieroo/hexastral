/**
 * Permanent account deletion — `DELETE /api/user/:id` cascades through every
 * downstream table (chats, bonds, charts, readings, contact hashes) and
 * finally removes the `users` row. Required surface for Apple Guideline
 * 5.1.1(v) and GDPR Art. 17 "right to erasure".
 *
 * After server-side delete succeeds, clears local credentials too so the
 * device immediately reverts to an anonymous tier — the user can re-onboard
 * fresh without app reinstall.
 */

import { resolvePortfolioApiUrl } from './api-url'
import { clearDeviceSecret, signRequest } from './hmac'
import { clearPortfolioUserId, getPortfolioUserId } from './session'

export async function deletePortfolioAccount(): Promise<boolean> {
  const userId = await getPortfolioUserId()
  if (!userId) {
    console.warn('[account.delete] no portfolio user id on device')
    return false
  }
  const path = `/api/user/${encodeURIComponent(userId)}`
  const signed = await signRequest({ body: '', userId, method: 'DELETE', path })
  if (!signed) {
    console.warn('[account.delete] request signing failed')
    return false
  }
  try {
    const res = await fetch(`${resolvePortfolioApiUrl()}${path}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${userId}`,
        ...signed,
      },
    })
    // 404 means the account is already gone — fall through and clear the stale
    // local credential, otherwise the device can never leave the failed state.
    if (!res.ok && res.status !== 404) {
      console.error('[account.delete] server rejected delete', res.status, await res.text())
      return false
    }
  } catch (err) {
    console.error('[account.delete] request failed', err)
    return false
  }
  // Clear local credentials so the device reverts to anonymous tier.
  await clearDeviceSecret().catch(() => {})
  await clearPortfolioUserId().catch(() => {})
  return true
}
