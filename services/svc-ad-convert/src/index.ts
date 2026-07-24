/**
 * svc-ad-convert — merchant conversion postback (Meta / Google / TikTok / Reddit)
 *
 * Queue consumer only (plus /health). Secrets missing → silent skip.
 * Configured-but-failing → throttled Telegram via svc-admin-notify.
 */

import { Hono } from 'hono'
import { sendGoogle } from './adapters/google'
import { sendMeta } from './adapters/meta'
import { sendReddit } from './adapters/reddit'
import { sendTikTok } from './adapters/tiktok'
import { alertAdminThrottled } from './alert'
import {
  type AdConvertMessage,
  AdConvertMessageSchema,
  type AdVendor,
  type Env,
  type VendorResult,
} from './types'

const app = new Hono<{ Bindings: Env }>()

app.get('/health', (c) => {
  const configured = {
    meta: !!(c.env.META_PIXEL_ID && c.env.META_ACCESS_TOKEN),
    google: !!(c.env.GOOGLE_MEASUREMENT_ID && c.env.GOOGLE_API_SECRET),
    tiktok: !!(c.env.TIKTOK_PIXEL_ID && c.env.TIKTOK_ACCESS_TOKEN),
    reddit: !!(c.env.REDDIT_PIXEL_ID && c.env.REDDIT_CONVERSIONS_TOKEN),
  }
  return c.json({ status: 'ok', service: 'svc-ad-convert', configured })
})

async function dispatchVendor(
  env: Env,
  vendor: AdVendor,
  msg: AdConvertMessage
): Promise<VendorResult> {
  switch (vendor) {
    case 'meta':
      return sendMeta(env, msg)
    case 'google':
      return sendGoogle(env, msg)
    case 'tiktok':
      return sendTikTok(env, msg)
    case 'reddit':
      return sendReddit(env, msg)
  }
}

export async function processAdConvertMessage(
  env: Env,
  raw: unknown,
  attempts = 1
): Promise<'ack' | 'retry'> {
  const parsed = AdConvertMessageSchema.safeParse(raw)
  if (!parsed.success) {
    console.error('[svc-ad-convert] invalid message', parsed.error.issues)
    await alertAdminThrottled(env, {
      vendor: 'all',
      kind: 'invalid_dto',
      title: 'ad-convert: invalid queue message',
      message: parsed.error.issues.map((i) => i.message).join('; ').slice(0, 400),
      level: 'error',
    })
    return 'ack'
  }

  const msg = parsed.data
  const vendors: AdVendor[] = msg.vendors?.length
    ? msg.vendors
    : ['meta', 'google', 'tiktok', 'reddit']

  let anyTransient = false
  for (const vendor of vendors) {
    const result = await dispatchVendor(env, vendor, msg)
    const ok = await handleResult(env, result, msg, attempts)
    if (!ok) anyTransient = true
  }

  return anyTransient ? 'retry' : 'ack'
}

async function handleResult(
  env: Env,
  result: VendorResult,
  msg: AdConvertMessage,
  attempts: number
): Promise<boolean> {
  if (result.status === 'skipped') {
    console.info('[svc-ad-convert] skip', result.vendor, result.reason, msg.event_id)
    return true
  }
  if (result.status === 'ok') {
    console.info('[svc-ad-convert] ok', result.vendor, msg.event_id)
    return true
  }
  if (result.status === 'config_error') {
    await alertAdminThrottled(env, {
      vendor: result.vendor,
      kind: 'config',
      title: `ad-convert: ${result.vendor} misconfigured`,
      message: result.reason,
      level: 'critical',
      context: { event_id: msg.event_id, event_name: msg.event_name },
    })
    return true
  }
  if (result.status === 'auth_error') {
    await alertAdminThrottled(env, {
      vendor: result.vendor,
      kind: 'auth',
      title: `ad-convert: ${result.vendor} auth failed`,
      message: `HTTP ${result.httpStatus}: ${result.body.slice(0, 200)}`,
      level: 'critical',
      context: {
        event_id: msg.event_id,
        httpStatus: String(result.httpStatus),
      },
    })
    return true
  }
  // Transient: retry quietly; alert only near max retries (wrangler max_retries: 3)
  console.warn('[svc-ad-convert] transient', result.vendor, attempts, result.body.slice(0, 200))
  if (attempts >= 3) {
    await alertAdminThrottled(env, {
      vendor: result.vendor,
      kind: 'transient',
      title: `ad-convert: ${result.vendor} retries exhausted`,
      message: result.body.slice(0, 300),
      level: 'error',
      context: {
        event_id: msg.event_id,
        httpStatus: result.httpStatus != null ? String(result.httpStatus) : 'n/a',
        attempts: String(attempts),
      },
    })
  }
  return false
}

app.onError((err, c) => {
  console.error('[svc-ad-convert] unhandled', err)
  return c.json({ error: 'Internal error' }, 500)
})

export default {
  fetch: app.fetch,

  async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      try {
        const outcome = await processAdConvertMessage(env, msg.body, msg.attempts)
        if (outcome === 'retry') {
          msg.retry()
        } else {
          msg.ack()
        }
      } catch (err: unknown) {
        console.error('[svc-ad-convert] queue handler error', err)
        await alertAdminThrottled(env, {
          vendor: 'all',
          kind: 'consumer_crash',
          title: 'ad-convert: consumer exception',
          message: err instanceof Error ? err.message : String(err),
          level: 'critical',
        })
        msg.retry()
      }
    }
  },
}
