/**
 * Kindred reading chat — HMAC-signed adapter over POST/GET /api/chat.
 *
 * Thin API layer for the shared core-ui `<ReadingChatScreen>`. Chat is Pro-only
 * server-side (402 `pro_required`); errors are surfaced by re-throwing the
 * envelope's `error.message` so the screen can route to the paywall.
 *
 * Conversations are scoped server-side by `X-Target-App: kindred`.
 */

import type { ReadingChatHistory, ReadingChatSendResult } from '@zhop/core-ui'
import { config } from './config'
import { signRequest } from './hmac'

// The app key the capability resolver recognises (capabilities.ts). The
// pre-rename 'yuan' is treated as unknown/legacy there, which would mis-gate
// solo-reading chat ('natal'/'report' types) under fate_pro instead of
// kindred_pro — so this MUST be the post-rename key.
const TARGET_APP = 'kindred'

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

/** Client-side ceiling on a chat turn. The server fast-fails its LLM chain well
 *  under this; the abort is the backstop for a stalled connection so the screen
 *  can show an error + a retry instead of "Thinking…" forever. */
const CHAT_TIMEOUT_MS = 45_000

/** Reply-tone steer (chat config). 'balanced'/undefined keeps the default voice. */
export type ChatTone = 'warm' | 'balanced' | 'direct'

export async function sendChatMessage(
  userId: string,
  readingType: string,
  readingId: string,
  message: string,
  requestId: string,
  tone?: ChatTone,
  locale?: string
): Promise<ReadingChatSendResult> {
  const path = '/api/chat'
  const body = JSON.stringify({
    readingType,
    readingId,
    message,
    requestId,
    ...(tone && tone !== 'balanced' ? { tone } : {}),
    ...(locale ? { locale } : {}),
  })
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(`${config.apiUrl}${path}`, {
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
    const json = (await res.json().catch(() => null)) as {
      error?: { code?: string; message?: string }
    } | null
    throw new Error(json?.error?.message ?? json?.error?.code ?? `send_failed:${res.status}`)
  }
  return (await res.json()) as ReadingChatSendResult
}

export async function reportChatMessage(userId: string, messageId: string): Promise<void> {
  const path = '/api/chat/report'
  const body = JSON.stringify({ messageId })
  const res = await fetch(`${config.apiUrl}${path}`, {
    method: 'POST',
    headers: await authedHeaders(userId, 'POST', path, body),
    body,
  })
  if (!res.ok) throw new Error(`chat_report_failed:${res.status}`)
}

export async function rateChatMessage(
  userId: string,
  messageId: string,
  feedback: 'up' | 'down' | null
): Promise<void> {
  const path = '/api/chat/feedback'
  const body = JSON.stringify({ messageId, feedback })
  const res = await fetch(`${config.apiUrl}${path}`, {
    method: 'POST',
    headers: await authedHeaders(userId, 'POST', path, body),
    body,
  })
  if (!res.ok) throw new Error(`chat_feedback_failed:${res.status}`)
}

/**
 * Start a new conversation — clears this reading's chat context server-side
 * (keeps the free-taste counter; see the route). The screen resets its local
 * thread on success.
 */
export async function clearChatHistory(
  userId: string,
  readingType: string,
  readingId: string
): Promise<void> {
  const path = `/api/chat/${readingType}/${readingId}`
  const res = await fetch(`${config.apiUrl}${path}`, {
    method: 'DELETE',
    headers: await authedHeaders(userId, 'DELETE', path, ''),
  })
  if (!res.ok) throw new Error(`chat_clear_failed:${res.status}`)
}

