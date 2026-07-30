/**
 * Permanently delete the portfolio account. Optional `deviceId` covers
 * Auspice device-scoped rows (birthdays / make-if / timeline) that are not
 * discoverable via push subscriptions alone.
 */

import { resolvePortfolioApiUrl } from './api-url'
import { clearDeviceSecret, signRequest } from './hmac'
import { clearPortfolioUserId, getPortfolioUserId } from './session'

export async function deletePortfolioAccount(opts?: { deviceId?: string }): Promise<boolean> {
  const userId = await getPortfolioUserId()
  if (!userId) {
    console.warn('[account.delete] no portfolio user id on device')
    return false
  }
  const path = `/api/user/${encodeURIComponent(userId)}`
  const body =
    opts?.deviceId && opts.deviceId.length > 0 ? JSON.stringify({ deviceId: opts.deviceId }) : ''
  const signed = await signRequest({ body, userId, method: 'DELETE', path })
  if (!signed) {
    console.warn('[account.delete] request signing failed')
    return false
  }
  try {
    const res = await fetch(`${resolvePortfolioApiUrl()}${path}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${userId}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...signed,
      },
      ...(body ? { body } : {}),
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
