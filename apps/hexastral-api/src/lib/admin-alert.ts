/**
 * alertAdmin — fire-and-forget wrapper around svc-admin-notify
 *
 * Rules:
 *   - Never throws; alert failure must not block user-facing flows
 *   - Soft timeout (Telegram can be slow from some edges)
 *   - Log locally if the alert itself fails
 *   - Callers SHOULD wrap with `c.executionCtx.waitUntil(...)` so the
 *     subrequest is not canceled when the parent response returns
 */

type Fetcher = { fetch(input: RequestInfo, init?: RequestInit): Promise<Response> }

export type AlertLevel = 'info' | 'warning' | 'error' | 'critical'

export interface AlertPayload {
  title?: string
  message: string
  level?: AlertLevel
  context?: Record<string, string>
}

/** Telegram + service binding can exceed a few seconds on cold/slow edges. */
const ALERT_TIMEOUT_MS = 15_000

/**
 * Send an admin alert to svc-admin-notify (Telegram).
 * Always fire-and-forget — never await if you don't want to block.
 *
 * @example
 * c.executionCtx.waitUntil(
 *   alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
 *     title: 'IAP webhook auth failed',
 *     message: 'RevenueCat webhook authorization header mismatch',
 *     level: 'critical',
 *     context: { eventType, productId },
 *   })
 * )
 */
export function alertAdmin(svc: Fetcher, payload: AlertPayload): Promise<void> {
  return svc
    .fetch(
      new Request('https://svc-admin-notify.internal/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(ALERT_TIMEOUT_MS),
      })
    )
    .then(async (res) => {
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        console.error('[admin-alert] non-OK response', res.status, body.slice(0, 300))
      }
    })
    .catch((err: unknown) => {
      console.error('[admin-alert] failed to send alert', err)
    })
}
