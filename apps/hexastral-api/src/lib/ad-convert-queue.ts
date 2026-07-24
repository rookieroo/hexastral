/**
 * Merchant conversion postback enqueue → Cloudflare Queue `ad-convert`
 * consumed by services/svc-ad-convert.
 *
 * Create once:
 *   bunx wrangler queues create ad-convert
 *   bunx wrangler queues create ad-convert-dlq
 */

import { z } from 'zod/v4'
import type { CloudflareBindings } from '../infra-types'
import { alertAdmin } from './admin-alert'

export const AdConvertMessageSchema = z.object({
  event_id: z.string().min(8).max(128),
  event_name: z.enum([
    'PageView',
    'Lead',
    'Purchase',
    'Subscribe',
    'ViewContent',
    'CompleteRegistration',
  ]),
  occurred_at_ms: z.number().int().positive(),
  action_source: z.enum(['website', 'app']),
  target_app: z.string().max(64).optional(),
  click_ids: z.record(z.string(), z.string()).optional(),
  utm: z.record(z.string(), z.string()).optional(),
  value: z.number().nonnegative().optional(),
  currency: z.string().max(8).optional(),
  user_id: z.string().max(128).optional(),
  vendors: z.array(z.enum(['meta', 'google', 'tiktok', 'reddit'])).optional(),
  client_user_agent: z.string().max(512).optional(),
  client_ip: z.string().max(64).optional(),
})

export type AdConvertMessage = z.infer<typeof AdConvertMessageSchema>

export type EnqueueAdConvertKind = 'purchase' | 'cta' | 'other'

export async function enqueueAdConvert(
  env: CloudflareBindings,
  message: AdConvertMessage,
  kind: EnqueueAdConvertKind = 'other'
): Promise<{ ok: true } | { ok: false; error: string }> {
  const queue = env.AD_CONVERT_QUEUE
  if (!queue) {
    const err = 'ad_convert_queue_unavailable'
    console.error('[ad-convert]', err, 'hint: bunx wrangler queues create ad-convert')
    await alertEnqueueFailure(env, kind, err, message)
    return { ok: false, error: err }
  }

  try {
    await queue.send(message)
    return { ok: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ad-convert] enqueue failed', msg)
    await alertEnqueueFailure(env, kind, msg, message)
    return { ok: false, error: msg }
  }
}

async function alertEnqueueFailure(
  env: CloudflareBindings,
  kind: EnqueueAdConvertKind,
  error: string,
  message: AdConvertMessage
): Promise<void> {
  const level = kind === 'purchase' ? 'critical' : 'error'
  const title =
    kind === 'purchase'
      ? 'ad-convert: enqueue failed (purchase)'
      : kind === 'cta'
        ? 'ad-convert: enqueue failed (CTA)'
        : 'ad-convert: enqueue failed'

  // Throttle via GUARD_KV when available
  const throttleKey = `ad_convert_alert:api:enqueue_${kind}`
  try {
    const existing = await env.GUARD_KV.get(throttleKey)
    if (existing) return
    await env.GUARD_KV.put(throttleKey, '1', { expirationTtl: 3600 })
  } catch (kvErr: unknown) {
    console.error('[ad-convert] throttle KV failed', kvErr)
  }

  await alertAdmin(env.SVC_ADMIN_NOTIFY, {
    title,
    message: error.slice(0, 400),
    level,
    context: {
      event_id: message.event_id,
      event_name: message.event_name,
      target_app: message.target_app ?? '',
    },
  })
}
