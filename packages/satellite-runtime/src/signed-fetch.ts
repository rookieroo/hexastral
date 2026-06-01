/**
 * `signedFetch` · centralized HMAC-signed request helper with retry.
 *
 * Why this exists (P1-17): use-chapter-unlock had its own local copy of
 * signedFetch with a single-shot fetch + null on error. Every new caller
 * was duplicating that logic and losing retry + offline awareness.
 * This module is the canonical version — `use-chapter-unlock` and any
 * future signed-API caller imports from here.
 *
 * Retry policy:
 *   - Up to 3 attempts on network failures and 5xx
 *   - Exponential backoff with jitter: 500ms, ~1.5s, ~3.5s
 *   - Skip retry when NetInfo says we're definitely offline (saves battery)
 *   - 4xx responses bubble immediately (validation failures shouldn't
 *     replay)
 *
 * Idempotency-Key:
 *   - When `idempotencyKey` is provided, sent as `Idempotency-Key` header.
 *     Pairs with the server-side middleware (P0-10) to make POST retries
 *     replay-safe — the server caches the first response and replays it
 *     instead of running the handler twice
 *   - When omitted, requests run without idempotency (current behavior)
 *
 * Returns `null` on terminal failure (auth missing, all retries exhausted,
 * or non-2xx final response). Callers decide how to render — most surface
 * a "try again" UI on null and emit a growth event to track failure rate.
 */

import { resolvePortfolioApiUrl } from './api-url'
import { signRequest } from './hmac'
import { getCurrentNetInfo } from './use-net-info'
import { getPortfolioUserId } from './session'

interface SignedFetchOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  body?: unknown
  /** Optional Idempotency-Key (pairs with the server-side P0-10 middleware). */
  idempotencyKey?: string
  /** Hard cap on attempts. Default 3. Set to 1 to disable retry. */
  maxAttempts?: number
}

const BASE_BACKOFF_MS = 500
const MAX_BACKOFF_MS = 4000

function shouldRetry(status: number | null, attempt: number, max: number): boolean {
  if (attempt >= max) return false
  if (status == null) return true // network failure / fetch threw
  if (status >= 500) return true
  return false
}

function backoffMs(attempt: number): number {
  // Exponential with ±20% jitter to avoid thundering-herd on flapping API.
  const base = Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS)
  const jitter = base * 0.2 * (Math.random() - 0.5) * 2
  return Math.max(0, Math.floor(base + jitter))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Signed API call with retry. Returns `Response` on success (2xx/3xx/4xx),
 * `null` when we couldn't even attempt (no userId, signing failed, all
 * retries exhausted on network/5xx).
 */
export async function signedFetch(opts: SignedFetchOptions): Promise<Response | null> {
  const { method, path, body, idempotencyKey } = opts
  const max = Math.max(1, opts.maxAttempts ?? 3)

  const userId = await getPortfolioUserId()
  if (!userId) return null

  const requestBody = method === 'GET' || method === 'DELETE' ? '' : JSON.stringify(body ?? {})
  const signed = await signRequest({ body: requestBody, userId, method, path })
  if (!signed) return null

  const url = `${resolvePortfolioApiUrl()}${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${userId}`,
    ...signed,
  }
  if (method !== 'GET' && method !== 'DELETE') {
    headers['Content-Type'] = 'application/json'
  }
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey
  }

  const init: RequestInit = {
    method,
    headers,
    ...(method === 'GET' || method === 'DELETE' ? {} : { body: requestBody }),
  }

  let attempt = 0
  while (true) {
    // Short-circuit when we already know we're offline. Saves battery on
    // long-airplane-mode sessions where retry loops would otherwise burn.
    const net = await getCurrentNetInfo()
    if (!net.isOnline) {
      if (!shouldRetry(null, attempt, max)) return null
      await sleep(backoffMs(attempt))
      attempt++
      continue
    }

    let res: Response | null = null
    let status: number | null = null
    try {
      res = await fetch(url, init)
      status = res.status
    } catch {
      res = null
      status = null
    }

    if (res && status != null && status < 500) {
      // 2xx/3xx/4xx — final, return without retry. Caller inspects status.
      return res
    }

    if (!shouldRetry(status, attempt, max)) return res ?? null
    await sleep(backoffMs(attempt))
    attempt++
  }
}
