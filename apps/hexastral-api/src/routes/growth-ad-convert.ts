/**
 * POST /api/growth/ad-convert — public, rate-limited web CTA / page postback enqueue.
 * Does NOT write Analytics Engine; fans out via AD_CONVERT_QUEUE → svc-ad-convert.
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { AppEnv } from '../infra-types'
import { AdConvertMessageSchema, enqueueAdConvert } from '../lib/ad-convert-queue'

export const growthAdConvertRoutes = new Hono<AppEnv>()

growthAdConvertRoutes.post('/', async (c) => {
  const { success } = await c.env.RATE_LIMITER.limit({
    key: `ad_convert:${c.req.header('cf-connecting-ip') ?? 'unknown'}`,
  })
  if (!success) throw new HTTPException(429, { message: 'Rate limited' })

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw new HTTPException(422, { message: 'Expected JSON body' })
  }

  const parsed = AdConvertMessageSchema.safeParse(body)
  if (!parsed.success) {
    throw new HTTPException(422, { message: 'Invalid ad-convert payload' })
  }

  // Web clients may omit IP / UA — fill from request when absent
  const message = {
    ...parsed.data,
    client_ip:
      parsed.data.client_ip ??
      c.req.header('cf-connecting-ip') ??
      c.req.header('x-forwarded-for') ??
      undefined,
    client_user_agent: parsed.data.client_user_agent ?? c.req.header('user-agent') ?? undefined,
  }

  const kind = message.event_name === 'Lead' || message.event_name === 'ViewContent' ? 'cta' : 'other'
  const result = await enqueueAdConvert(c.env, message, kind)
  if (!result.ok) {
    throw new HTTPException(503, { message: 'Postback queue unavailable' })
  }

  return c.json({ ok: true, event_id: message.event_id })
})
