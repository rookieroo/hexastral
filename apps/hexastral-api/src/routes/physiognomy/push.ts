/**
 * FaceOracle / Xingqi Pro push — register + cron targets (ADR-0028).
 *
 * POST/DELETE /register — HMAC (userId)
 * GET /targets — X-Internal-Key (svc-notify)
 * POST /unregister-stale — X-Internal-Key
 */

import { and, eq, gte, inArray, lt, or, isNull } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import { canonicalizeTimezoneToPool } from '@zhop/timezone-pool'
import { faceoraclePushQueue, faceoraclePushSubs, physiognomyEvents } from '../../db/schema'
import type { AppEnv } from '../../infra-types'
import { jsonOk } from '../../lib/api-response'
import { requireUserId } from '../../lib/auth'
import { userIdsWithMonthEventCoverage } from '../../lib/faceoracle-push-harvest'
import { hasActiveEntitlement } from '../../services/entitlements'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const EXPO_TOKEN_RE = /^ExponentPushToken\[[a-zA-Z0-9_-]+\]$/
const RECAPTURE_DAYS = 25
/** Same rest theme must not re-fire within this many days (Compliance). */
const REST_THEME_COOLDOWN_DAYS = 3

function restThemeKeyFromRow(title: string, dataJson: string | null): string {
  if (dataJson) {
    try {
      const parsed: unknown = JSON.parse(dataJson)
      if (parsed && typeof parsed === 'object') {
        const tk = (parsed as Record<string, unknown>).themeKey
        if (typeof tk === 'string' && tk.trim()) return tk.trim().toLowerCase()
      }
    } catch {
      // fall through
    }
  }
  return title.trim().slice(0, 48).toLowerCase()
}

const pushRegisterSchema = z.object({
  token: z.string().min(1).max(256),
  platform: z.enum(['ios', 'android']).default('ios'),
  timezoneId: z.string().min(1).max(64),
  locale: z.string().max(16).default('zh'),
  recaptureOn: z.boolean().default(true),
  eventsOn: z.boolean().default(true),
  /** Ignored — Pro is resolved server-side from entitlements. Kept for old clients. */
  isPro: z.boolean().default(false).optional(),
  lastReadingAt: z.string().min(10).max(40).optional(),
})

function pushCopy(locale: string) {
  const base = locale.toLowerCase()
  const hant = base.includes('hant') || base === 'zh-tw' || base === 'zh-hk'
  const hans = base.startsWith('zh') && !hant
  const ja = base.startsWith('ja')
  if (hant) {
    return {
      recaptureTitle: '可以更新本期形氣了',
      recaptureBody: '新的一個月視窗已開啟。可整組複拍，或只更新面部／左掌／右掌。',
      eventTitle: '宜留意的時間窗',
    }
  }
  if (hans) {
    return {
      recaptureTitle: '可以更新本期形气了',
      recaptureBody: '新的一个月窗口已打开。可整组复拍，或只更新面部/左掌/右掌。',
      eventTitle: '宜留意的时间窗',
    }
  }
  if (ja) {
    return {
      recaptureTitle: '今期の形気を更新できます',
      recaptureBody:
        '新しい月の窓が開きました。三点まとめて撮り直すか、顔／左手／右手だけ更新できます。',
      eventTitle: '意識したい時間窓',
    }
  }
  return {
    recaptureTitle: 'Time to refresh your reading',
    recaptureBody:
      'A new monthly window is open. Refresh all three photos, or update one part.',
    eventTitle: 'A window worth noting',
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
  const timezoneId = canonicalizeTimezoneToPool(b.timezoneId)
  const isPro =
    (await hasActiveEntitlement(db, userId, 'faceoracle_pro')) ||
    (await hasActiveEntitlement(db, userId, 'universe_pro'))

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
      timezoneId,
      locale: b.locale,
      recaptureOn: b.recaptureOn,
      eventsOn: b.eventsOn,
      isPro,
      lastReadingAt,
      lastActiveAt: now,
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: faceoraclePushSubs.userId,
      set: {
        token: b.token,
        platform: b.platform,
        timezoneId,
        locale: b.locale,
        recaptureOn: b.recaptureOn,
        eventsOn: b.eventsOn,
        isPro,
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
 * Internal: Pro push targets. Query params: timezoneId, date, optional hour (9|21).
 * Prefers dated faceoracle_push_queue rows for that local hour; falls back to
 * recapture / event rules. ≤1 message per user.
 */
physiognomyPushRoutes.get('/targets', async (c) => {
  const key = c.req.header('X-Internal-Key')
  if (!key || key !== c.env.INTERNAL_KEY) throw new HTTPException(401, { message: 'Unauthorized' })

  const timezoneId = c.req.query('timezoneId')
  const date = c.req.query('date')
  if (!timezoneId || !date || !DATE_RE.test(date)) {
    throw new HTTPException(400, { message: 'timezoneId + date=YYYY-MM-DD required' })
  }
  const hourRaw = Number.parseInt(c.req.query('hour') ?? '9', 10)
  const localHour = hourRaw === 21 ? 21 : 9
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

  const queuedByUser = new Map<string, Array<typeof faceoraclePushQueue.$inferSelect>>()
  /** Users who already have queue fuel (queued or sent) covering this calendar month. */
  const monthFuelCovered = new Set<string>()
  /** userId → rest themeKeys sent within the cooldown window. */
  const restCooldownByUser = new Map<string, Set<string>>()
  if (userIds.length > 0) {
    const nowIso = new Date().toISOString()
    const qrows = await db
      .select()
      .from(faceoraclePushQueue)
      .where(
        and(
          inArray(faceoraclePushQueue.userId, userIds),
          eq(faceoraclePushQueue.status, 'queued'),
          eq(faceoraclePushQueue.fireOn, date),
          eq(faceoraclePushQueue.localHour, localHour),
          or(isNull(faceoraclePushQueue.expiresAt), gte(faceoraclePushQueue.expiresAt, nowIso))
        )
      )
    for (const r of qrows) {
      const list = queuedByUser.get(r.userId) ?? []
      list.push(r)
      queuedByUser.set(r.userId, list)
    }

    const cooldownCutoff = new Date(
      Date.now() - REST_THEME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
    ).toISOString()
    const recentRest = await db
      .select({
        userId: faceoraclePushQueue.userId,
        title: faceoraclePushQueue.title,
        dataJson: faceoraclePushQueue.dataJson,
      })
      .from(faceoraclePushQueue)
      .where(
        and(
          inArray(faceoraclePushQueue.userId, userIds),
          eq(faceoraclePushQueue.status, 'sent'),
          eq(faceoraclePushQueue.kind, 'rest'),
          gte(faceoraclePushQueue.sentAt, cooldownCutoff)
        )
      )
    for (const r of recentRest) {
      const set = restCooldownByUser.get(r.userId) ?? new Set<string>()
      set.add(restThemeKeyFromRow(r.title, r.dataJson))
      restCooldownByUser.set(r.userId, set)
    }

    if (localHour === 9) {
      // Only treat as "month event already covered" when queue has the month-start
      // event window (1st) or explicit startMonth — not any rest/observe later in month.
      const coverRows = await db
        .select({
          userId: faceoraclePushQueue.userId,
          fireOn: faceoraclePushQueue.fireOn,
          dataJson: faceoraclePushQueue.dataJson,
          status: faceoraclePushQueue.status,
        })
        .from(faceoraclePushQueue)
        .where(
          and(
            inArray(faceoraclePushQueue.userId, userIds),
            inArray(faceoraclePushQueue.status, ['queued', 'sent'])
          )
        )
      for (const id of userIdsWithMonthEventCoverage(coverRows, month)) {
        monthFuelCovered.add(id)
      }
    }
  }

  const messages: Array<{
    userId: string
    token: string
    title: string
    body: string
    data: Record<string, string>
  }> = []
  const consumed: string[] = []

  for (const sub of page) {
    const stillPro =
      (await hasActiveEntitlement(db, sub.userId, 'faceoracle_pro')) ||
      (await hasActiveEntitlement(db, sub.userId, 'universe_pro'))
    if (!stillPro) {
      if (sub.isPro) {
        await db
          .update(faceoraclePushSubs)
          .set({ isPro: false })
          .where(eq(faceoraclePushSubs.userId, sub.userId))
      }
      continue
    }

    const L = pushCopy(sub.locale)
    const fuel = queuedByUser.get(sub.userId) ?? []
    if (fuel.length > 0) {
      fuel.sort((a, b) => b.priority - a.priority)
      const cooled = restCooldownByUser.get(sub.userId) ?? new Set<string>()
      const top = fuel.find((row) => {
        if (row.kind !== 'rest') return true
        const key = restThemeKeyFromRow(row.title, row.dataJson)
        return !cooled.has(key)
      })
      if (top) {
        let data: Record<string, string> = { kind: top.kind, targetApp: 'faceoracle' }
        if (top.dataJson) {
          try {
            const parsed: unknown = JSON.parse(top.dataJson)
            if (parsed && typeof parsed === 'object') {
              for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
                if (typeof v === 'string') data[k] = v
              }
            }
          } catch {
            // keep defaults
          }
        }
        messages.push({
          userId: sub.userId,
          token: sub.token,
          title: top.title,
          body: top.body,
          data,
        })
        consumed.push(top.id)
        continue
      }
    }

    // Rule fallback only at morning hour (recapture / month-start events).
    if (localHour !== 9) continue
    let emitted = false

    if (!emitted && sub.recaptureOn && sub.lastReadingAt) {
      const days = daysBetween(sub.lastReadingAt, date)
      if (days >= RECAPTURE_DAYS && days < RECAPTURE_DAYS + 3) {
        messages.push({
          userId: sub.userId,
          token: sub.token,
          title: L.recaptureTitle,
          body: L.recaptureBody,
          data: { kind: 'recapture', targetApp: 'faceoracle' },
        })
        emitted = true
      }
    }

    if (!emitted && sub.eventsOn && !monthFuelCovered.has(sub.userId)) {
      const raw = eventsByUser.get(sub.userId)
      if (raw) {
        const events = parseEventsJson(raw)
        for (const ev of events.slice(0, 8)) {
          if (ev.startMonth !== month) continue
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
          break
        }
      }
    }
  }

  if (consumed.length > 0) {
    await db
      .update(faceoraclePushQueue)
      .set({ status: 'sent', sentAt: new Date().toISOString() })
      .where(inArray(faceoraclePushQueue.id, consumed))
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

physiognomyPushRoutes.post('/purge-inactive', async (c) => {
  const key = c.req.header('X-Internal-Key')
  if (!key || key !== c.env.INTERNAL_KEY) throw new HTTPException(401, { message: 'Unauthorized' })
  const inactiveDays = Math.min(Number.parseInt(c.req.query('inactiveDays') ?? '90', 10) || 90, 365)
  const cutoff = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000).toISOString()
  const db = c.get('db')
  const stale = await db
    .select({ userId: faceoraclePushSubs.userId })
    .from(faceoraclePushSubs)
    .where(lt(faceoraclePushSubs.lastActiveAt, cutoff))
    .limit(500)
  if (stale.length === 0) return jsonOk(c, { deleted: 0 })
  const ids = stale.map((r) => r.userId)
  await db.delete(faceoraclePushSubs).where(inArray(faceoraclePushSubs.userId, ids))
  await db
    .update(faceoraclePushQueue)
    .set({ status: 'expired' })
    .where(inArray(faceoraclePushQueue.userId, ids))
  return jsonOk(c, { deleted: ids.length })
})
