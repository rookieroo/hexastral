/**
 * Yuán reading chat — HMAC-signed adapter over POST/GET /api/chat.
 *
 * Thin API layer for the shared core-ui `<ReadingChatScreen>`. Chat is Pro-only
 * server-side (402 `pro_required`); errors are surfaced by re-throwing the
 * envelope's `error.message` so the screen can route to the paywall.
 *
 * Conversations are scoped server-side by `X-Target-App: yuan`.
 */

import type { ReadingChatHistory, ReadingChatSendResult } from '@zhop/core-ui'
import { config } from './config'
import { signRequest } from './hmac'

const TARGET_APP = 'yuan'

async function authedHeaders(
  userId: string,
  method: string,
  path: string,
  body: string
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${userId}`,
    'X-Target-App': TARGET_APP,
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
  const res = await fetch(`${config.apiUrl}${path}`, {
    headers: await authedHeaders(userId, 'GET', path, ''),
  })
  if (!res.ok) throw new Error(`chat_history_failed:${res.status}`)
  return (await res.json()) as ReadingChatHistory
}

export async function sendChatMessage(
  userId: string,
  readingType: string,
  readingId: string,
  message: string,
  requestId: string
): Promise<ReadingChatSendResult> {
  const path = '/api/chat'
  const body = JSON.stringify({ readingType, readingId, message, requestId })
  const res = await fetch(`${config.apiUrl}${path}`, {
    method: 'POST',
    headers: await authedHeaders(userId, 'POST', path, body),
    body,
  })
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
