/**
 * DEV-only: grant/expire `universe_pro` + `faceoracle_pro` via /api/dev/set-subscription
 * so the API accepts Pro-gated Syel readings (client-only override is not enough).
 */

import {
  getDeviceSecret,
  getPortfolioUserId,
  repairPortfolioCredentialMismatch,
  resolvePortfolioApiUrl,
  signRequest,
} from '@zhop/satellite-runtime'

export type DevServerProResult =
  | { ok: true }
  | { ok: false; reason: 'no_session' | 'hmac' | 'blocked' | 'http' }

export async function devSetServerPro(pro: boolean): Promise<DevServerProResult> {
  await repairPortfolioCredentialMismatch()
  const userId = await getPortfolioUserId()
  const secret = await getDeviceSecret()
  if (!userId || !secret) return { ok: false, reason: 'no_session' }
  const path = '/api/dev/set-subscription'
  const body = JSON.stringify({ status: pro ? 'pro' : 'free' })
  try {
    const signed = await signRequest({ body, userId, method: 'POST', path })
    if (!signed) return { ok: false, reason: 'hmac' }
    const res = await fetch(`${resolvePortfolioApiUrl()}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userId}`,
        ...signed,
      },
      body,
    })
    if (res.ok) return { ok: true }
    if (res.status === 404) return { ok: false, reason: 'blocked' }
    return { ok: false, reason: 'http' }
  } catch {
    return { ok: false, reason: 'http' }
  }
}
