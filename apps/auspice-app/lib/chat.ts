/**
 * Yuun (auspice) reading chat — HMAC-signed adapter over POST/GET /api/chat for
 * the shared core-ui `<ReadingChatScreen>` (the 划词 AI follow-up on the personal
 * 八字紫微 report). The Yuun mirror of Yuel's lib/chat.ts.
 *
 * Conversations are scoped server-side by `X-Target-App: auspice`, so the
 * capability resolver gates the personal-report chat ('report' readingType)
 * under `auspice_pro` (resolveCapability: targetApp wins). Chat is Pro-only
 * server-side (402 → `pro_required`); errors re-throw the envelope's
 * `error.message` so the screen can route to the paywall.
 *
 * Identity comes from the portfolio session (getPortfolioUserId) + the
 * satellite-runtime HMAC signer — the same identity the report cache uses.
 */

import type { ReadingChatHistory, ReadingChatSendResult } from '@zhop/core-ui'
import { resolvePortfolioApiUrl, signRequest } from '@zhop/satellite-runtime'
import { PORTFOLIO_TARGET_APP } from './growth-config'

const API_URL = resolvePortfolioApiUrl()

async function authedHeaders(
  userId: string,
  method: string,
  path: string,
  body: string
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${userId}`,
    'X-Target-App': PORTFOLIO_TARGET_APP,
  }
  const sig = await signRequest({ body, userId, method, path })
  if (sig) Object.assign(headers, sig)
  return headers
}

export async function fetchChatHistory(
  userId: string,
  readingType: string,
  readingId: string
): Promise<ReadingChatHistory> {
  const path = `/api/chat/${readingType}/${readingId}`
  const res = await fetch(`${API_URL}${path}`, {
    headers: await authedHeaders(userId, 'GET', path, ''),
  })
  if (!res.ok) throw new Error(`chat_history_failed:${res.status}`)
  return (await res.json()) as ReadingChatHistory
}

/** Client-side ceiling on a chat turn — the abort backstop for a stalled
 *  connection so the screen shows an error + retry instead of "Thinking…" forever. */
const CHAT_TIMEOUT_MS = 45_000

export async function sendChatMessage(
  userId: string,
  readingType: string,
  readingId: string,
  message: string,
  requestId: string
): Promise<ReadingChatSendResult> {
  const path = '/api/chat'
  const body = JSON.stringify({ readingType, readingId, message, requestId })
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: await authedHeaders(userId, 'POST', path, body),
      body,
      signal: controller.signal,
    })
  } catch (err) {
    if (controller.signal.aborted) throw new Error('chat_timeout')
    throw err
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) {
    // Error envelope is `{ ok: false, error: { code, message } }`; `message`
    // carries the business code ('pro_required' / 'no_chat_credits') that
    // ReadingChatScreen maps to the paywall.
    const json = (await res.json().catch(() => null)) as {
      error?: { code?: string; message?: string }
    } | null
    throw new Error(json?.error?.message ?? json?.error?.code ?? `send_failed:${res.status}`)
  }
  return (await res.json()) as ReadingChatSendResult
}
