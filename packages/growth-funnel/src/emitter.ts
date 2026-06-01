/**
 * Mobile + web funnel emitter — fire-and-forget POST to `/api/growth/events`.
 *
 * Auto-fills the base fields every event needs (event_id, occurred_at_ms,
 * source, plus optional identity / locale resolvers) so callers only express
 * the discriminator + payload. Failures are swallowed by default since
 * analytics MUST NOT block UX; pass `onError` to log if needed.
 *
 * The endpoint is anonymous (IP-rate-limited, Zod-validated) per
 * hexastral-api/src/routes/growth-funnel-events.ts — no HMAC required.
 */

import type { GrowthEventSource, GrowthFunnelEvent } from './funnel-event'

/** The subset of fields a caller actually needs to specify. */
export type FunnelEmitInput = Pick<
  GrowthFunnelEvent,
  'event_name' | 'payload'
> &
  Partial<Pick<GrowthFunnelEvent, 'surface' | 'utm' | 'ddl_token' | 'target_app'>>

export interface FunnelEmitterOptions {
  /** Absolute base URL of hexastral-api (e.g. https://api.hexastral.com) */
  apiBaseUrl: string
  /** Where this client runs */
  source: GrowthEventSource
  /** Stable anonymous identifier (e.g. install UUID); resolved lazily per emit */
  getAnonymousId?: () => string | null | undefined
  /** Authenticated user id when available */
  getUserId?: () => string | null | undefined
  /** Current session id, if app tracks one */
  getSessionId?: () => string | null | undefined
  /** Active locale tag (e.g. 'zh-Hant', 'en') */
  getLocale?: () => string | null | undefined
  /** Called when emission fails. Default: swallow silently. */
  onError?: (err: unknown, event: GrowthFunnelEvent) => void
  /** Override fetch (testing). Defaults to global fetch. */
  fetchImpl?: typeof fetch
  /** Override id generator (testing). Defaults to crypto.randomUUID. */
  newEventId?: () => string
}

export interface FunnelEmitter {
  emit: (input: FunnelEmitInput) => void
}

function defaultEventId(): string {
  // Workers' globalThis type omits `crypto`; structural cast keeps the optional-global guard typechecking everywhere.
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (typeof c?.randomUUID === 'function') {
    return c.randomUUID()
  }
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Build an emitter bound to a hexastral-api base URL.
 *
 * Emission is fire-and-forget: `emit` returns synchronously and the POST runs
 * in the background. Failed sends do not throw and do not retry — telemetry
 * loss is preferred to UX impact.
 */
export function createFunnelEmitter(opts: FunnelEmitterOptions): FunnelEmitter {
  const {
    apiBaseUrl,
    source,
    getAnonymousId,
    getUserId,
    getSessionId,
    getLocale,
    onError,
    fetchImpl,
    newEventId,
  } = opts

  const url = `${apiBaseUrl.replace(/\/+$/, '')}/api/growth/events`
  const doFetch = fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined)
  const mintId = newEventId ?? defaultEventId

  return {
    emit(input) {
      if (!doFetch) return // unsupported environment

      const event = {
        event_id: mintId(),
        occurred_at_ms: Date.now(),
        source,
        anonymous_id: getAnonymousId?.() ?? undefined,
        user_id: getUserId?.() ?? undefined,
        session_id: getSessionId?.() ?? undefined,
        locale: getLocale?.() ?? undefined,
        surface: input.surface,
        utm: input.utm,
        ddl_token: input.ddl_token,
        target_app: input.target_app,
        event_name: input.event_name,
        payload: input.payload,
      } as GrowthFunnelEvent

      // Fire-and-forget — no await, no retry, no throw.
      // `keepalive` isn't in the Workers RequestInit type; the variable avoids the excess-property check (runtime ignores it).
      const requestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
        keepalive: true,
      }
      void doFetch(url, requestInit).catch((err) => {
        if (onError) onError(err, event)
      })
    },
  }
}
