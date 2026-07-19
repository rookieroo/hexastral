/**
 * DEV-only: grant/expire real `universe_pro` via /api/dev/set-subscription
 * so the API accepts Pro-gated faceoracle readings (client-only override is not enough).
 */

import { getPortfolioUserId, resolvePortfolioApiUrl, signRequest } from '@zhop/satellite-runtime'

export async function devSetServerPro(pro: boolean): Promise<boolean> {
  const userId = await getPortfolioUserId()
  if (!userId) return false
  const path = '/api/dev/set-subscription'
  const body = JSON.stringify({ status: pro ? 'pro' : 'free' })
  try {
    const signed = await signRequest({ body, userId, method: 'POST', path })
    if (!signed) return false
    const res = await fetch(`${resolvePortfolioApiUrl()}${path}`, {
      method: 'POST',
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
