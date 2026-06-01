/**
 * POST /api/growth/events — validate and accept cross-platform funnel events (web + native).
 * Persists to Analytics Engine for SQL/query + dashboards; falls back to structured logs if AE unavailable.
 */

import type { GrowthFunnelEvent } from '@zhop/growth-funnel'
import { safeParseGrowthFunnelEvent } from '@zhop/growth-funnel'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { CloudflareBindings, ContextVariables } from '../infra-types'

const MAX_PAYLOAD_BLOB_BYTES = 8192

function funnelPayloadJson(event: GrowthFunnelEvent): string {
  try {
    return JSON.stringify(event.payload)
  } catch {
    return '{}'
  }
}

export const growthFunnelEventRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: ContextVariables
}>().post('/', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw new HTTPException(422, { message: 'Expected JSON body' })
  }

  const parsed = safeParseGrowthFunnelEvent(body)
  if (!parsed.success) {
    console.warn(`[${c.get('requestId')}] growth-funnel invalid payload`, parsed.error.flatten())
    throw new HTTPException(422, { message: 'Invalid growth funnel payload' })
  }

  const event = parsed.data
  const payloadBlob = funnelPayloadJson(event)
  const payloadTruncated =
    payloadBlob.length > MAX_PAYLOAD_BLOB_BYTES
      ? payloadBlob.slice(0, MAX_PAYLOAD_BLOB_BYTES)
      : payloadBlob

  const rid = c.get('requestId')
  try {
    c.env.GROWTH_FUNNEL_ANALYTICS.writeDataPoint({
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
    console.warn(`[${rid}] growth-funnel Analytics Engine write failed`, err)
    console.info(`[${rid}] growth-funnel fallback-log`, JSON.stringify(event))
  }

  return c.body(null, 204)
})
