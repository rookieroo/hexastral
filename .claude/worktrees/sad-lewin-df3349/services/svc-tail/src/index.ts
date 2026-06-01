/**
 * svc-tail — Tail Worker for centralized log aggregation + admin alerting
 *
 * Receives trace events from all hexastral Workers.
 * Filters, enriches, and forwards structured log data.
 * Forwards exceptions and non-OK outcomes to svc-admin-notify (Telegram).
 *
 * To attach to a producer Worker, add to its wrangler.jsonc:
 *   "tail_consumers": [{ "service": "svc-tail" }]
 */

interface Env {
  SVC_ADMIN_NOTIFY: Fetcher
}

interface TailMessage {
  readonly scriptName: string | null
  readonly event:
    | { readonly request: { readonly url: string; readonly method: string } }
    | { readonly cron: string; readonly scheduledTime: number }
    | { readonly queue: string; readonly batchSize: number }
    | Record<string, unknown>
  readonly eventTimestamp: number | null
  readonly logs: ReadonlyArray<{
    readonly message: readonly unknown[]
    readonly level: string
    readonly timestamp: number
  }>
  readonly exceptions: ReadonlyArray<{
    readonly name: string
    readonly message: string
    readonly timestamp: number
  }>
  readonly outcome: string
}

// In-memory dedup: key = `${service}:${msg}`, value = timestamp of last alert
const recentAlerts = new Map<string, number>()
const DEDUP_TTL_MS = 5 * 60 * 1_000 // 5 minutes

// Global rate limit: max 20 alerts per minute
const ALERT_RATE_LIMIT = 20
let alertsThisMinute = 0
let minuteStart = Date.now()
let droppedThisMinute = 0

/**
 * Keywords in console.error logs that warrant a Telegram alert.
 * Keep intentionally tight — only truly actionable signals.
 */
const ALERT_KEYWORDS = [
  'payment_failed',
  'quota_exceeded',
  'stripe',
  'revenuecat',
  'db_error',
  'd1 error',
  'migration',
  'unhandled',
  'critical',
  'sentry',
  'ses error',
  'push_failed',
] as const

function hasAlertKeyword(msg: string): boolean {
  const lower = msg.toLowerCase()
  return ALERT_KEYWORDS.some((kw) => lower.includes(kw))
}

function shouldAlert(key: string): boolean {
  const now = Date.now()

  // Reset per-minute counter and flush dropped-alert meta-alert
  if (now - minuteStart >= 60_000) {
    alertsThisMinute = 0
    droppedThisMinute = 0
    minuteStart = now
  }

  if (alertsThisMinute >= ALERT_RATE_LIMIT) {
    droppedThisMinute++
    return false
  }

  // Dedup: check if already alerted recently
  const last = recentAlerts.get(key)
  if (last !== undefined && now - last < DEDUP_TTL_MS) return false

  recentAlerts.set(key, now)
  alertsThisMinute++
  return true
}

/** Send a once-per-minute meta-alert when the rate limit is being hit */
function maybeFlushDroppedAlert(env: Env): void {
  if (droppedThisMinute > 0) {
    sendAlert(env, {
      title: 'svc-tail: alert rate limit hit',
      message: `${droppedThisMinute} alert(s) were suppressed in the last minute due to rate limiting. Check Cloudflare Tail Logs for full details.`,
      level: 'warn',
      context: { droppedCount: String(droppedThisMinute) },
    })
    droppedThisMinute = 0
  }
}

/** Fire-and-forget admin alert — never throws */
function sendAlert(
  env: Env,
  payload: { title: string; message: string; level: string; context?: Record<string, string> },
): void {
  env.SVC_ADMIN_NOTIFY.fetch('https://svc-admin-notify.internal/alert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(3_000),
  }).catch(() => undefined)
}

export default {
  async tail(events: TailMessage[], env: Env): Promise<void> {
    // Flush any suppressed-alert meta-notification from the previous window
    maybeFlushDroppedAlert(env)

    for (const event of events) {
      const service = event.scriptName ?? 'unknown'

      // Forward exceptions to Telegram (CRITICAL)
      for (const exception of event.exceptions) {
        console.error(
          JSON.stringify({
            type: 'exception',
            service,
            name: exception.name,
            message: exception.message,
            outcome: event.outcome,
            ts: new Date(exception.timestamp).toISOString(),
          })
        )

        const dedupeKey = `${service}:${exception.name}:${exception.message.slice(0, 80)}`
        if (shouldAlert(dedupeKey)) {
          sendAlert(env, {
            title: `${service}: unhandled exception`,
            message: `${exception.name}: ${exception.message}`,
            level: 'critical',
            context: { service, exceptionName: exception.name, outcome: event.outcome },
          })
        }
      }

      // Forward non-OK outcomes (ERROR) — but skip if there were exceptions (already alerted above)
      if (event.outcome !== 'ok' && event.exceptions.length === 0) {
        console.warn(
          JSON.stringify({
            type: 'outcome',
            service,
            outcome: event.outcome,
            ts: event.eventTimestamp ? new Date(event.eventTimestamp).toISOString() : null,
          })
        )

        const dedupeKey = `${service}:outcome:${event.outcome}`
        if (shouldAlert(dedupeKey)) {
          sendAlert(env, {
            title: `${service}: worker outcome ${event.outcome}`,
            message: `Worker completed with non-OK outcome: ${event.outcome}`,
            level: 'error',
            context: { service, outcome: event.outcome },
          })
        }
      }

      // Log warn/error level messages. For error-level logs containing actionable keywords,
      // escalate to Telegram in addition to structured console output.
      for (const log of event.logs) {
        if (log.level === 'warn' || log.level === 'error') {
          const parts = log.message.map((m) => (typeof m === 'string' ? m : JSON.stringify(m)))
          const msgStr = parts.join(' ')
          console.log(
            JSON.stringify({
              type: 'log',
              service,
              level: log.level,
              msg: msgStr,
              ts: new Date(log.timestamp).toISOString(),
            })
          )

          // Escalate error-level logs that contain known critical keywords
          if (log.level === 'error' && hasAlertKeyword(msgStr)) {
            const dedupeKey = `${service}:log:${msgStr.slice(0, 80)}`
            if (shouldAlert(dedupeKey)) {
              sendAlert(env, {
                title: `${service}: error log`,
                message: msgStr.slice(0, 500),
                level: 'error',
                context: { service },
              })
            }
          }
        }
      }
    }
  },
}
