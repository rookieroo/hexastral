/**
 * Server-side growth-funnel event emitter.
 *
 * Why this exists (P0-8): the webhook handler needs to fire
 * `subscription_started` and similar revenue-side events. Mirror of the
 * client `ingestGrowthEvent` helper, but writes directly to
 * `GROWTH_FUNNEL_ANALYTICS` (Analytics Engine) instead of POSTing to
 * /api/growth-funnel/event (which would require server self-call).
 *
 * Validated by the same `GrowthFunnelEvent` zod schema as the client-facing
 * endpoint — so emit shape stays consistent across web/iOS/api sources.
 */

import type { GrowthFunnelEvent } from '@zhop/growth-funnel'
import { parseGrowthFunnelEvent } from '@zhop/growth-funnel'

import type { CloudflareBindings } from '../infra-types'

const MAX_PAYLOAD_BLOB_BYTES = 4096

/**
 * Fire a growth-funnel event from a Worker handler. Validates against the
 * shared schema; throws on shape mismatch (caller catches if needed).
 *
 * Best-effort: Analytics Engine writes never reject; on error we log and
 * move on. We don't block the calling request on telemetry.
 */
export function emitGrowthEventServer(
  env: CloudflareBindings,
  rawEvent: unknown,
  rid?: string
): void {
  let event: GrowthFunnelEvent
  try {
    event = parseGrowthFunnelEvent(rawEvent)
  } catch (err) {
    console.warn(`[${rid ?? '?'}] growth-emit validation failed`, err)
    return
  }

  const payloadBlob = JSON.stringify('payload' in event ? event.payload : {})
  const payloadTruncated =
    payloadBlob.length > MAX_PAYLOAD_BLOB_BYTES
      ? payloadBlob.slice(0, MAX_PAYLOAD_BLOB_BYTES)
      : payloadBlob

  try {
    env.GROWTH_FUNNEL_ANALYTICS.writeDataPoint({
      blobs: [
        event.event_name,
        event.target_app ?? '',
        event.source,
        event.event_id,
        payloadTruncated,
      ],
      doubles: [event.occurred_at_ms],
      indexes: [(event.anonymous_id ?? event.user_id ?? 'na').slice(0, 64)],
    })
  } catch (err) {
    console.warn(`[${rid ?? '?'}] growth-emit Analytics Engine write failed`, err)
    console.info(`[${rid ?? '?'}] growth-emit fallback-log`, JSON.stringify(event))
  }
}
