/**
 * FaceOracle / Xingqi Pro push — register + cron targets (ADR-0028).
 *
 * POST/DELETE /register — HMAC (userId)
 * GET /targets — X-Internal-Key (svc-notify)
 * POST /unregister-stale — X-Internal-Key
 */

import { and, eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import { faceoraclePushSubs, physiognomyEvents } from '../../db/schema'
import type { AppEnv } from '../../infra-types'
import { jsonOk } from '../../lib/api-response'
import { requireUserId } from '../../lib/auth'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const EXPO_TOKEN_RE = /^ExponentPushToken\[[a-zA-Z0-9_-]+\]$/
const RECAPTURE_DAYS = 25

const pushRegisterSchema = z.object({
  token: z.string().min(1).max(256),
  platform: z.enum(['ios', 'android']).default('ios'),
  timezoneId: z.string().min(1).max(64),
  locale: z.string().max(16).default('zh'),
  recaptureOn: z.boolean().default(true),
  eventsOn: z.boolean().default(true),
  isPro: z.boolean().default(false),
  lastReadingAt: z.string().min(10).max(40).optional(),
})

function pushCopy(locale: string) {
  const zh = locale.startsWith('zh')
  return {
    recaptureTitle: zh ? '可以更新本期形气了' : 'Time to refresh your reading',
    recaptureBody: zh
      ? '新的一个月窗口已打开。可整组复拍，或只更新面部/左掌/右掌。'
      : 'A new monthly window is open. Refresh all three photos, or update one part.',
    eventTitle: zh ? '宜留意的时间窗' : 'A window worth noting',
  }
}

function daysBetween(isoA: string, ymdB: string): number {
  const a = Date.parse(isoA)
  if (!Number.isFinite(a)) return -1
  const [y, m, d] = ymdB.split('-').map(Number)
  const b = Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)
  return Math.floor((b - a) / (24 * 60 * 60 * 1000))
}

function parseEventsJson(
  raw: string
): Array<{ startMonth?: string; theme?: string; note?: string }> {
  try {
    const v: unknown = JSON.parse(raw)
    if (!Array.isArray(v)) return []
    return v.filter((x): x is { startMonth?: string; theme?: string; note?: string } => {
      return Boolean(x) && typeof x === 'object'
    })
  } catch {
    return []
  }
}

export const physiognomyPushRoutes = new Hono<AppEnv>()

physiognomyPushRoutes.post('/register', async (c) => {
  const userId = requireUserId(c)
  const b = pushRegisterSchema.parse(await c.req.json())
  if (!EXPO_TOKEN_RE.test(b.token)) {
    throw new HTTPException(400, { message: 'invalid Expo push token' })
  }
  const now = new Date().toISOString()
  const db = c.get('db')

  const existing = await db
    .select({ lastReadingAt: faceoraclePushSubs.lastReadingAt })
    .from(faceoraclePushSubs)
    .where(eq(faceoraclePushSubs.userId, userId))
    .get()

  let lastReadingAt = b.lastReadingAt ?? existing?.lastReadingAt ?? null
  if (!lastReadingAt) {
    const ev = await db
      .select({ updatedAt: physiognomyEvents.updatedAt })
      .from(physiognomyEvents)
      .where(eq(physiognomyEvents.userId, userId))
      .get()
    lastReadingAt = ev?.updatedAt ?? null
  }

  await db
    .insert(faceoraclePushSubs)
    .values({
      userId,
      token: b.token,
      platform: b.platform,
      timezoneId: b.timezoneId,
      locale: b.locale,
      recaptureOn: b.recaptureOn,
      eventsOn: b.eventsOn,
      isPro: b.isPro,
      lastReadingAt,
      lastActiveAt: now,
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: faceoraclePushSubs.userId,
      set: {
        token: b.token,
        platform: b.platform,
        timezoneId: b.timezoneId,
        locale: b.locale,
        recaptureOn: b.recaptureOn,
        eventsOn: b.eventsOn,
        isPro: b.isPro,
        lastReadingAt,
        lastActiveAt: now,
      },
    })

  return jsonOk(c, { registered: true })
})

physiognomyPushRoutes.delete('/register', async (c) => {
  const userId = requireUserId(c)
  await c.get('db').delete(faceoraclePushSubs).where(eq(faceoraclePushSubs.userId, userId))
  return jsonOk(c, { unregistered: true })
})

/**
 * Internal: morning slot (~09:00 local). Pro + opted-in prefs → recapture due
 * and/or event windows whose startMonth matches the local YYYY-MM.
 */
physiognomyPushRoutes.get('/targets', async (c) => {
  const key = c.req.header('X-Internal-Key')
  if (!key || key !== c.env.INTERNAL_KEY) throw new HTTPException(401, { message: 'Unauthorized' })

  const timezoneId = c.req.query('timezoneId')
  const date = c.req.query('date')
  if (!timezoneId || !date || !DATE_RE.test(date)) {
    throw new HTTPException(400, { message: 'timezoneId + date=YYYY-MM-DD required' })
  }
  const limit = Math.min(Number.parseInt(c.req.query('limit') ?? '200', 10) || 200, 500)
  const offset = Number.parseInt(c.req.query('cursor') ?? '0', 10)
  const db = c.get('db')

  const page0 = await db
    .select()
    .from(faceoraclePushSubs)
    .where(and(eq(faceoraclePushSubs.timezoneId, timezoneId), eq(faceoraclePushSubs.isPro, true)))
    .limit(limit + 1)
    .offset(offset)

  const hasMore = page0.length > limit
  const page = hasMore ? page0.slice(0, limit) : page0
  const month = date.slice(0, 7) // YYYY-MM

  const userIds = page.map((s) => s.userId)
  const eventsByUser = new Map<string, string>()
  if (userIds.length > 0) {
    const rows = await db
      .select({
        userId: physiognomyEvents.userId,
        eventsJson: physiognomyEvents.eventsJson,
      })
      .from(physiognomyEvents)
      .where(inArray(physiognomyEvents.userId, userIds))
    for (const r of rows) eventsByUser.set(r.userId, r.eventsJson)
  }

  const messages: Array<{
    userId: string
    token: string
    title: string
    body: string
    data: Record<string, string>
  }> = []

  for (const sub of page) {
    const L = pushCopy(sub.locale)

    if (sub.recaptureOn && sub.lastReadingAt) {
      const days = daysBetween(sub.lastReadingAt, date)
      // Fire once on the due day (and tolerate cron lag of a few days).
      if (days >= RECAPTURE_DAYS && days < RECAPTURE_DAYS + 3) {
        messages.push({
          userId: sub.userId,
          token: sub.token,
          title: L.recaptureTitle,
          body: L.recaptureBody,
          data: { kind: 'recapture', targetApp: 'faceoracle' },
        })
      }
    }

    if (sub.eventsOn) {
      const raw = eventsByUser.get(sub.userId)
      if (raw) {
        const events = parseEventsJson(raw)
        for (const ev of events.slice(0, 8)) {
          if (ev.startMonth !== month) continue
          // Fire on the 1st–3rd of the event month (local).
          const dayNum = Number(date.slice(8, 10))
          if (dayNum < 1 || dayNum > 3) continue
          const body = `${ev.theme ?? ''}${ev.note ? ` — ${ev.note}` : ''}`.trim()
          if (!body) continue
          messages.push({
            userId: sub.userId,
            token: sub.token,
            title: L.eventTitle,
            body,
            data: {
              kind: 'event',
              startMonth: ev.startMonth,
              targetApp: 'faceoracle',
            },
          })
          break // one event nudge per day
        }
      }
    }
  }

  return jsonOk(c, {
    messages,
    nextCursor: hasMore ? String(offset + limit) : null,
  })
})

physiognomyPushRoutes.post('/unregister-stale', async (c) => {
  const key = c.req.header('X-Internal-Key')
  if (!key || key !== c.env.INTERNAL_KEY) throw new HTTPException(401, { message: 'Unauthorized' })
  const body = await c.req.json<{ tokens?: unknown }>().catch(() => ({ tokens: [] }))
  const tokens = (Array.isArray(body.tokens) ? body.tokens : [])
    .filter((t): t is string => typeof t === 'string')
    .slice(0, 100)
  if (tokens.length === 0) return jsonOk(c, { deleted: 0 })
  await c.get('db').delete(faceoraclePushSubs).where(inArray(faceoraclePushSubs.token, tokens))
  return jsonOk(c, { deleted: tokens.length })
})
