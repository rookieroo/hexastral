/**
 * /api/internal/almanac/* — internal endpoints powering the daily Almanac pipeline.
 *
 * Consumers:
 *   - svc-signal cron (00:00 UTC):
 *       GET  /eligible-users  — paginate users with all required static traits
 *       POST /upsert          — write today's daily_almanac row for one user
 *   - svc-notify queue consumer (per timezone @ 8am local):
 *       GET  /today           — fetch today's almanac row for a specific user
 *
 * Auth: X-Internal-Key header, constant-time compared to env.INTERNAL_KEY.
 *       No HMAC, no Turnstile — these endpoints are reachable only via service
 *       binding from sibling Workers, never from the public internet.
 */

import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import { dailyAlmanac, pushTokens, users } from '../db/schema'
import type { AppEnv } from '../infra-types'

export const internalAlmanacRoutes = new Hono<AppEnv>()

function requireInternal(c: {
  req: { header: (k: string) => string | undefined }
  env: { INTERNAL_KEY: string }
}): void {
  const key = c.req.header('X-Internal-Key')
  if (!key || key !== c.env.INTERNAL_KEY) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }
}

// ── GET /eligible-users — paginate users ready for almanac generation ────

internalAlmanacRoutes.get('/eligible-users', async (c) => {
  requireInternal(c)

  const limit = Math.min(Number.parseInt(c.req.query('limit') ?? '100', 10) || 100, 500)
  const cursor = c.req.query('cursor') ?? '0'
  const offset = Number.parseInt(cursor, 10)

  const db = c.get('db')

  // Pull from pushTokens INNER JOIN users so we only enqueue users with at
  // least one active push token (no point computing almanac for users who
  // can't receive the morning push, and the in-app card will lazy-generate
  // on first open if they're notification-disabled).
  const rows = await db
    .select({
      userId: users.id,
      locale: users.locale,
      timezoneId: pushTokens.timezoneId,
      dayMasterStem: users.dayMasterStem,
      dayMasterStrength: users.dayMasterStrength,
      favorableElement: users.favorableElement,
      unfavorableElement: users.unfavorableElement,
      birthBranch: users.birthBranch,
    })
    .from(users)
    .innerJoin(pushTokens, eq(pushTokens.userId, users.id))
    .limit(limit + 1)
    .offset(offset)

  const hasMore = rows.length > limit
  const data = hasMore ? rows.slice(0, limit) : rows

  // Filter: only users with the static traits the almanac engine requires.
  // Onboarding 4.8 populates these on natal chart computation — anyone missing
  // them simply hasn't completed onboarding yet, skip silently.
  const eligible = data.filter(
    (r) =>
      r.dayMasterStem != null &&
      r.favorableElement != null &&
      r.unfavorableElement != null &&
      r.birthBranch != null
  )

  return c.json({
    data: eligible,
    nextCursor: hasMore ? String(offset + limit) : null,
  })
})

// ── POST /upsert — write/replace today's daily_almanac row ────────────────

const upsertSchema = z.object({
  userId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  relation: z.string().min(1),
  energyLevel: z.string().min(1),
  headline: z.string().min(1),
  todayLens: z.string().min(1),
  watchFor: z.string().min(1),
  luckyHour: z.string().nullable().optional(),
  luckyDirection: z.string().nullable().optional(),
  luckyColor: z.string().nullable().optional(),
  locale: z.string().min(1),
  notificationId: z.string().nullable().optional(),
})

internalAlmanacRoutes.post('/upsert', async (c) => {
  requireInternal(c)

  const body = await c.req.json()
  const parsed = upsertSchema.parse(body)
  const db = c.get('db')

  // Replace any prior row for (userId, date) — idempotent across cron retries.
  await db
    .delete(dailyAlmanac)
    .where(and(eq(dailyAlmanac.userId, parsed.userId), eq(dailyAlmanac.date, parsed.date)))

  await db.insert(dailyAlmanac).values({
    id: crypto.randomUUID(),
    userId: parsed.userId,
    date: parsed.date,
    relation: parsed.relation,
    energyLevel: parsed.energyLevel,
    headline: parsed.headline,
    todayLens: parsed.todayLens,
    watchFor: parsed.watchFor,
    luckyHour: parsed.luckyHour ?? null,
    luckyDirection: parsed.luckyDirection ?? null,
    luckyColor: parsed.luckyColor ?? null,
    locale: parsed.locale,
    notificationId: parsed.notificationId ?? null,
  })

  return c.json({ ok: true })
})

// ── GET /today?userId=&date= — fetch today's row for a specific user ─────

internalAlmanacRoutes.get('/today', async (c) => {
  requireInternal(c)

  const userId = c.req.query('userId')
  const date = c.req.query('date') ?? new Date().toISOString().slice(0, 10)
  if (!userId) throw new HTTPException(400, { message: 'userId is required' })

  const db = c.get('db')
  const row = await db.query.dailyAlmanac.findFirst({
    where: and(eq(dailyAlmanac.userId, userId), eq(dailyAlmanac.date, date)),
  })

  if (!row) return c.json({ data: null })

  return c.json({
    data: {
      userId: row.userId,
      date: row.date,
      relation: row.relation,
      energyLevel: row.energyLevel,
      headline: row.headline,
      todayLens: row.todayLens,
      watchFor: row.watchFor,
      luckyHour: row.luckyHour,
      luckyDirection: row.luckyDirection,
      luckyColor: row.luckyColor,
      locale: row.locale,
      notificationId: row.notificationId,
    },
  })
})
