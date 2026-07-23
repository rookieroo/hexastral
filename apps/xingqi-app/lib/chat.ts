/**
 * Xingqi reading chat — HMAC adapter over POST/GET /api/chat.
 * X-Target-App: faceoracle · readingType: physiognomy
 */

import type { ReadingChatHistory, ReadingChatSendResult } from '@zhop/core-ui'
import { getPortfolioUserId, resolvePortfolioApiUrl, signRequest } from '@zhop/satellite-runtime'

import { PORTFOLIO_TARGET_APP } from './growth-config'

const READING_TYPE = 'physiognomy'

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

export async function fetchChatHistory(readingId: string): Promise<ReadingChatHistory> {
  const userId = await getPortfolioUserId()
  if (!userId) throw new Error('signin_required')
  const path = `/api/chat/${READING_TYPE}/${readingId}`
  const res = await fetch(`${resolvePortfolioApiUrl()}${path}`, {
    headers: await authedHeaders(userId, 'GET', path, ''),
  })
  if (!res.ok) throw new Error(`chat_history_failed:${res.status}`)
  return (await res.json()) as ReadingChatHistory
}

export async function reportChatMessage(messageId: string): Promise<void> {
  const userId = await getPortfolioUserId()
  if (!userId) throw new Error('signin_required')
  const path = '/api/chat/report'
  const body = JSON.stringify({ messageId })
  const res = await fetch(`${resolvePortfolioApiUrl()}${path}`, {
    method: 'POST',
    headers: await authedHeaders(userId, 'POST', path, body),
    body,
  })
  if (!res.ok) throw new Error(`chat_report_failed:${res.status}`)
}

export async function rateChatMessage(
  messageId: string,
  feedback: 'up' | 'down' | null
): Promise<void> {
  const userId = await getPortfolioUserId()
  if (!userId) throw new Error('signin_required')
  const path = '/api/chat/feedback'
  const body = JSON.stringify({ messageId, feedback })
  const res = await fetch(`${resolvePortfolioApiUrl()}${path}`, {
    method: 'POST',
    headers: await authedHeaders(userId, 'POST', path, body),
    body,
  })
  if (!res.ok) throw new Error(`chat_feedback_failed:${res.status}`)
}

export async function sendChatMessage(
  readingId: string,
  message: string,
  requestId: string,
  locale?: string
): Promise<ReadingChatSendResult> {
  const userId = await getPortfolioUserId()
  if (!userId) throw new Error('signin_required')
  const path = '/api/chat'
  const body = JSON.stringify({
    readingType: READING_TYPE,
    readingId,
    message,
    requestId,
    ...(locale ? { locale } : {}),
  })
  const res = await fetch(`${resolvePortfolioApiUrl()}${path}`, {
    method: 'POST',
    headers: await authedHeaders(userId, 'POST', path, body),
    body,
  })
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as {
      error?: string | { code?: string; message?: string }
    } | null
    const errField = json?.error
    const msg =
      typeof errField === 'string'
        ? errField
        : (errField?.message ?? errField?.code ?? `send_failed:${res.status}`)
    throw new Error(msg)
  }
  return (await res.json()) as ReadingChatSendResult
}

export function draftFromQuote(quote: string | undefined): string {
  if (!quote?.trim()) return ''
  const clipped = quote.trim().slice(0, 140)
  return `「${clipped}」\n`
}
