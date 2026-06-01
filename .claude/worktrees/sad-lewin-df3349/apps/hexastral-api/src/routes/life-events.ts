import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import { lifeEvents } from '../db/schema'
import type { AppEnv } from '../infra-types'
import { requireUserId } from '../lib/auth'

export const lifeEventRoutes = new Hono<AppEnv>()

const EVENT_TYPES = [
  'career',
  'relationship',
  'health',
  'travel',
  'education',
  'family',
  'other',
] as const

const createLifeEventSchema = z.object({
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'eventDate must be YYYY-MM-DD'),
  eventType: z.enum(EVENT_TYPES),
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
})

const listLifeEventsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  eventType: z.enum(EVENT_TYPES).optional(),
})

/** POST /api/life-events — 创建人生事件 */
lifeEventRoutes.post('/', async (c) => {
  const userId = requireUserId(c)
  const body = await c.req.json()
  const input = createLifeEventSchema.parse(body)
  const db = c.get('db')

  const id = crypto.randomUUID()
  await db.insert(lifeEvents).values({
    id,
    userId,
    eventDate: input.eventDate,
    eventType: input.eventType,
    title: input.title,
    description: input.description ?? null,
  })

  const created = await db.select().from(lifeEvents).where(eq(lifeEvents.id, id)).get()

  return c.json({ data: created }, 201)
})

/** GET /api/life-events — 分页列表 */
lifeEventRoutes.get('/', async (c) => {
  const userId = requireUserId(c)
  const query = listLifeEventsSchema.parse(c.req.query())
  const db = c.get('db')

  const conditions = [eq(lifeEvents.userId, userId)]
  if (query.eventType) {
    conditions.push(eq(lifeEvents.eventType, query.eventType))
  }

  const rows = await db
    .select()
    .from(lifeEvents)
    .where(and(...conditions))
    .orderBy(desc(lifeEvents.eventDate))
    .limit(query.limit)
    .offset(query.offset)

  const countRows = await db
    .select({ total: sql<number>`count(*)` })
    .from(lifeEvents)
    .where(and(...conditions))
  const total = countRows[0]?.total ?? 0

  return c.json({ data: rows, total, limit: query.limit, offset: query.offset })
})

/** GET /api/life-events/timeline — 按大运分组的时间线视图 */
lifeEventRoutes.get('/timeline', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')

  const rows = await db
    .select()
    .from(lifeEvents)
    .where(eq(lifeEvents.userId, userId))
    .orderBy(asc(lifeEvents.eventDate))

  // Group by dayunIndex (null = ungrouped)
  const grouped: Record<string, typeof rows> = {}
  for (const row of rows) {
    const key = row.dayunIndex !== null ? `dayun_${row.dayunIndex}` : 'ungrouped'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(row)
  }

  return c.json({ data: grouped })
})

/** GET /api/life-events/:id — 单条事件详情 */
lifeEventRoutes.get('/:id', async (c) => {
  const userId = requireUserId(c)
  const eventId = c.req.param('id')
  const db = c.get('db')

  const event = await db
    .select()
    .from(lifeEvents)
    .where(and(eq(lifeEvents.id, eventId), eq(lifeEvents.userId, userId)))
    .get()

  if (!event) throw new HTTPException(404, { message: 'Life event not found' })

  return c.json({ data: event })
})

/** DELETE /api/life-events/:id — 删除事件 */
lifeEventRoutes.delete('/:id', async (c) => {
  const userId = requireUserId(c)
  const eventId = c.req.param('id')
  const db = c.get('db')

  const event = await db
    .select({ id: lifeEvents.id, userId: lifeEvents.userId })
    .from(lifeEvents)
    .where(eq(lifeEvents.id, eventId))
    .get()

  if (!event) throw new HTTPException(404, { message: 'Life event not found' })
  if (event.userId !== userId) throw new HTTPException(403, { message: 'Forbidden' })

  await db.delete(lifeEvents).where(eq(lifeEvents.id, eventId))

  return c.json({ data: { deleted: true } })
})

const stampLifeEventSchema = z.object({
  stampLabel: z.enum(['验', '准', '偏']),
})

lifeEventRoutes.patch('/:id', async (c) => {
  const userId = requireUserId(c)
  const eventId = c.req.param('id')
  const db = c.get('db')

  const body = await c.req.json()
  const parsed = stampLifeEventSchema.safeParse(body)
  if (!parsed.success) throw new HTTPException(400, { message: 'Invalid stamp label' })

  const event = await db
    .select({ id: lifeEvents.id, userId: lifeEvents.userId })
    .from(lifeEvents)
    .where(eq(lifeEvents.id, eventId))
    .get()

  if (!event) throw new HTTPException(404, { message: 'Life event not found' })
  if (event.userId !== userId) throw new HTTPException(403, { message: 'Forbidden' })

  const updated = await db
    .update(lifeEvents)
    .set({
      stampLabel: parsed.data.stampLabel,
      verifiedAt: new Date().toISOString(),
    })
    .where(eq(lifeEvents.id, eventId))
    .returning()
    .get()

  return c.json({ data: updated })
})
