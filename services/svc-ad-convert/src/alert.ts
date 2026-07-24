/**
 * Throttled admin alerts via svc-admin-notify (Telegram).
 * Never throws — alert failure must not break postback retries.
 */

import type { Env } from './types'

type AlertLevel = 'info' | 'warning' | 'error' | 'critical'

const ALERT_TTL_SECONDS = 60 * 60 // 1h

export async function alertAdminThrottled(
  env: Env,
  opts: {
    vendor: string
    kind: string
    title: string
    message: string
    level?: AlertLevel
    context?: Record<string, string>
  }
): Promise<void> {
  const key = `ad_convert_alert:${opts.vendor}:${opts.kind}`
  try {
    const existing = await env.ALERT_KV.get(key)
    if (existing) {
      const count = Number.parseInt(existing, 10)
      const next = Number.isFinite(count) ? String(count + 1) : '1'
      await env.ALERT_KV.put(key, next, { expirationTtl: ALERT_TTL_SECONDS })
      return
    }
    await env.ALERT_KV.put(key, '1', { expirationTtl: ALERT_TTL_SECONDS })
  } catch (err: unknown) {
    console.error('[svc-ad-convert] alert throttle KV failed', err)
  }

  try {
    const res = await env.SVC_ADMIN_NOTIFY.fetch(
      new Request('https://svc-admin-notify.internal/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: opts.title,
          message: opts.message,
          level: opts.level ?? 'error',
          context: opts.context,
        }),
        signal: AbortSignal.timeout(15_000),
      })
    )
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[svc-ad-convert] admin-notify non-OK', res.status, body.slice(0, 200))
    }
  } catch (err: unknown) {
    console.error('[svc-ad-convert] admin-notify failed', err)
  }
}
