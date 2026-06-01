/**
 * Signed-fetch helpers for the email OTP flow. Mirrors hexastral-app's
 * `/api/user/:id/email/{request,confirm}` shape so backend stays identical.
 *
 * Step 1: `requestEmailOtp(email)` — server stores OTP in KV and mails it.
 * Step 2: `confirmEmailOtp(code)` — server writes `users.email`, claims any
 * pending chapter-unlock invites + reading gifts targeting this address, and
 * returns counts so the UI can surface "你帮 N 位朋友解锁了一章" toast.
 */

import { resolvePortfolioApiUrl } from './api-url'
import { signRequest } from './hmac'
import { getPortfolioUserId } from './session'

interface EmailRequestPayload {
  email: string
}

interface EmailConfirmPayload {
  code: string
}

export interface EmailConfirmResult {
  email: string
  claimedGifts: number
  claimedChapterInvites: number
}

async function signedJson<T>(
  method: 'POST',
  path: string,
  body: unknown
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const userId = await getPortfolioUserId()
  if (!userId) return { ok: false, status: 401, data: null }
  const requestBody = JSON.stringify(body)
  const signed = await signRequest({ body: requestBody, userId, method, path })
  if (!signed) return { ok: false, status: 401, data: null }
  try {
    const res = await fetch(`${resolvePortfolioApiUrl()}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userId}`,
        ...signed,
      },
      body: requestBody,
    })
    let data: T | null = null
    try {
      data = (await res.json()) as T
    } catch {
      data = null
    }
    return { ok: res.ok, status: res.status, data }
  } catch {
    return { ok: false, status: 0, data: null }
  }
}

/**
 * Step 1: trigger an OTP email send. Returns `true` on success; `false`
 * surfaces "couldn't send" so the UI can show a retry.
 */
export async function requestEmailOtp(email: string): Promise<boolean> {
  const userId = await getPortfolioUserId()
  if (!userId) return false
  const path = `/api/user/${encodeURIComponent(userId)}/email/request`
  const { ok } = await signedJson<{ ok: true }>('POST', path, {
    email,
  } as EmailRequestPayload)
  return ok
}

/**
 * Step 2: verify the OTP code. Returns the bound email + viral redemption
 * counts on success; `null` when the code is wrong, expired, or rate-limited
 * — the UI should re-show the input with the server message.
 */
export async function confirmEmailOtp(code: string): Promise<EmailConfirmResult | null> {
  const userId = await getPortfolioUserId()
  if (!userId) return null
  const path = `/api/user/${encodeURIComponent(userId)}/email/confirm`
  const { ok, data } = await signedJson<EmailConfirmResult>('POST', path, {
    code,
  } as EmailConfirmPayload)
  if (!ok || !data) return null
  return data
}

/**
 * Remove the bound email without deleting the account (GDPR Art. 7
 * withdraw-consent). Server sets `users.email = NULL`; the user can re-bind
 * later via the OTP flow. Returns `true` on success.
 */
export async function unbindUserEmail(): Promise<boolean> {
  const userId = await getPortfolioUserId()
  if (!userId) return false
  const path = `/api/user/${encodeURIComponent(userId)}/email`
  const signed = await signRequest({ body: '', userId, method: 'DELETE', path })
  if (!signed) return false
  try {
    const res = await fetch(`${resolvePortfolioApiUrl()}${path}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${userId}`,
        ...signed,
      },
    })
    return res.ok
  } catch {
    return false
  }
}
