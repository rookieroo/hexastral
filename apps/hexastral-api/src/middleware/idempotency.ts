/**
 * Idempotency-Key middleware — replay-safe POST handler.
 *
 * Why this exists (P0-10): mobile clients retry timeouts. If a `POST
 * /invite-chapter-unlock` succeeds on the server but the response is lost
 * mid-flight, the next retry would send a duplicate invitation email. The
 * existing per-row dedup (inviter + target_email + status='pending') wins the
 * race for STEADY-STATE retries but loses on near-simultaneous double-send.
 *
 * Pattern (Stripe-style): client generates a unique `Idempotency-Key` per
 * intent (UUID / nanoid). On first request, server runs the handler, caches
 * the `(status, headers, body)` in KV scoped by `userId`. On retry with the
 * same key, server replays the cached response WITHOUT re-running the
 * handler. TTL = 24h (Stripe uses 24h too — long enough for any sane retry,
 * short enough that the KV doesn't grow unbounded).
 *
 * Scope: per-userId. Anonymous (`anon`) callers share a smaller cache scope.
 *
 * Behavior:
 *   - No `Idempotency-Key` header → pass through, no caching (opt-in)
 *   - Key present + no cached response → run handler, cache 2xx/4xx
 *     responses fire-and-forget after returning (waitUntil — does not block
 *     the response). 5xx responses are NOT cached (transient failures should
 *     be retryable, not replayed)
 *   - Key present + cached response → replay with `X-Idempotency-Replay: true`
 *
 * Key format: 8-128 chars from `[A-Za-z0-9_-]` (UUID v4 = 36, nanoid(32) = 32).
 * Anything weirder gets a 400 — prevents abuse of the cache namespace.
 *
 * RC webhook has its OWN dedup (`rc_evt:${eventId}` keyed by RevenueCat's
 * event ID) — that's payload-derived, not client-provided. Different
 * mechanism, kept separate.
 *
 * Apply this middleware to any mutating POST that:
 *   - Triggers an external side-effect (email, push, payment)
 *   - Mutates billable / quota-affecting state
 *   - Could race itself on mobile retry
 *
 * Do NOT apply to: GETs (already idempotent), webhook endpoints (have their
 * own dedup), pure-compute POSTs that have no external side-effect.
 */

import type { MiddlewareHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'

import type { AppEnv } from '../infra-types'

/** 24h — matches Stripe convention. */
const IDEM_TTL_SECONDS = 24 * 60 * 60
const KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/

interface CachedResponse {
  status: number
  headers: [string, string][]
  body: string
}

export function createIdempotencyMiddleware(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const headerKey = c.req.header('Idempotency-Key')
    if (!headerKey) {
      // Opt-in: no key = no idempotency layer
      await next()
      return
    }

    if (!KEY_PATTERN.test(headerKey)) {
      throw new HTTPException(400, {
        message: 'Idempotency-Key must be 8-128 chars [A-Za-z0-9_-]',
      })
    }

    // Scope by userId when authenticated; fall back to 'anon' for pre-auth
    // routes. Note: anon-scoped collisions are possible across different
    // clients reusing a popular UUID — accepted risk given the route surface
    // is HMAC-verified before this middleware runs.
    const userId = c.get('userId') ?? 'anon'
    const idemKey = `idem:${userId}:${headerKey}`

    // Replay if cached
    const cached = await c.env.GUARD_KV.get<CachedResponse>(idemKey, 'json')
    if (cached) {
      const headers = new Headers(cached.headers)
      headers.set('X-Idempotency-Replay', 'true')
      return c.newResponse(cached.body, {
        status: cached.status as 200,
        headers,
      })
    }

    // Run the handler
    await next()
    const res = c.res

    // Don't cache 5xx — those are transient and SHOULD be retried with the
    // same key (and may succeed next time). Caching them would lock in a
    // failure for 24h.
    if (res.status >= 500) return

    // Capture response without consuming the original. Hono's c.res is a
    // Web `Response`; clone() is the standard way to peek at the body.
    const cloned = res.clone()
    const body = await cloned.text()
    const headers: [string, string][] = []
    cloned.headers.forEach((v, k) => {
      headers.push([k, v])
    })

    const payload: CachedResponse = {
      status: res.status,
      headers,
      body,
    }

    // Fire-and-forget — KV write must not block the response. If KV fails,
    // the retry just runs the handler again (same as if the middleware
    // didn't exist). That's correct fallback behavior.
    c.executionCtx.waitUntil(
      c.env.GUARD_KV.put(idemKey, JSON.stringify(payload), {
        expirationTtl: IDEM_TTL_SECONDS,
      })
    )
  }
}
