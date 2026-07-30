/**
 * Client self-heal for dropped/late RevenueCat webhooks (ADR-0013 §5b).
 * Safe to call whenever signed in — server no-ops without REVENUECAT_API_KEY.
 */

import { resolvePortfolioApiUrl } from './api-url'
import { signRequest } from './hmac'
import { getPortfolioUserId } from './session'

export async function reconcilePortfolioEntitlements(): Promise<boolean> {
  const userId = await getPortfolioUserId()
  if (!userId) return false

  const path = `/api/user/${encodeURIComponent(userId)}/entitlements/reconcile`
  const signed = await signRequest({ body: '', userId, method: 'POST', path })
  if (!signed) return false

  try {
    const res = await fetch(`${resolvePortfolioApiUrl()}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userId}`,
        ...signed,
      },
    })
    if (!res.ok) {
      console.warn('[satellite-runtime] entitlements reconcile failed', res.status)
      return false
    }
    return true
  } catch (err) {
    console.warn('[satellite-runtime] entitlements reconcile request failed', err)
    return false
  }
}
