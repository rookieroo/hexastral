/**
 * alertAdmin — fire-and-forget wrapper around svc-admin-notify
 *
 * Rules:
 *   - Never throws; alert failure must not block user-facing flows
 *   - Hard timeout of 3s (admin alerts are best-effort)
 *   - Log locally if the alert itself fails
 */

type Fetcher = { fetch(input: RequestInfo, init?: RequestInit): Promise<Response> }

export type AlertLevel = 'info' | 'warning' | 'error' | 'critical'

export interface AlertPayload {
  title?: string
  message: string
  level?: AlertLevel
  context?: Record<string, string>
}

/**
 * Send an admin alert to svc-admin-notify (Telegram).
 * Always fire-and-forget — never await if you don't want to block.
 *
 * @example
 * alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
 *   title: 'IAP webhook auth failed',
 *   message: 'RevenueCat webhook authorization header mismatch',
 *   level: 'critical',
 *   context: { eventType, productId },
 * }).catch(() => {})
 */
export function alertAdmin(svc: Fetcher, payload: AlertPayload): Promise<void> {
  return svc
    .fetch(
      new Request('https://svc-admin-notify.internal/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3_000),
      })
    )
    .then((res) => {
      if (!res.ok) {
        console.error('[admin-alert] non-OK response', res.status)
      }
    })
    .catch((err: unknown) => {
      console.error('[admin-alert] failed to send alert', err)
    })
}
