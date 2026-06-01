/**
 * /api/notify/* — 推送令牌管理 (D1) + SVC_NOTIFY 服务绑定代理
 *
 * POST /register-device  — 注册/更新 Expo Push Token (D1 直写)
 * GET  /push-targets      — 按时区查询推送目标 (供 svc-notify cron)
 * ALL  /*                 — 其余请求透传到 svc-notify
 */

import { and, eq, inArray, lt } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import { notificationAttributions, pushTokens, users } from '../db/schema'
import type { AppEnv } from '../infra-types'
import { requireUserId } from '../lib/auth'

export const notifyRoutes = new Hono<AppEnv>()

// ── POST /register-device — 注册/更新推送令牌 ────────────────

const registerDeviceSchema = z.object({
  userId: z.string().min(1),
  token: z.string().min(1),
  platform: z.enum(['ios', 'android']).default('ios'),
  timezoneId: z.string().min(1),
})

notifyRoutes.post('/register-device', async (c) => {
  const body = await c.req.json()
  const parsed = registerDeviceSchema.parse(body)
  parsed.userId = requireUserId(c)

  const db = c.get('db')
  const now = new Date().toISOString()

  // Upsert push token + update users.lastActiveAt in one batch (activity signal for svc-fortune)
  await db.batch([
    db
      .insert(pushTokens)
      .values({
        token: parsed.token,
        userId: parsed.userId,
        platform: parsed.platform,
        timezoneId: parsed.timezoneId,
        lastActiveAt: now,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: pushTokens.token,
        set: {
          userId: parsed.userId,
          timezoneId: parsed.timezoneId,
          lastActiveAt: now,
        },
      }),
    db.update(users).set({ lastActiveAt: now }).where(eq(users.id, parsed.userId)),
  ])

  return c.json({ ok: true })
})

// ── GET /push-targets — 按时区批量查询推送目标 ────────────────

notifyRoutes.get('/push-targets', async (c) => {
  const internalKey = c.req.header('X-Internal-Key')
  if (!internalKey || internalKey !== c.env.INTERNAL_KEY)
    throw new HTTPException(401, { message: 'Unauthorized' })

  const timezoneId = c.req.query('timezoneId')
  const limit = Math.min(Number.parseInt(c.req.query('limit') ?? '200', 10) || 200, 500)
  const cursor = c.req.query('cursor') ?? '0'
  const offset = Number.parseInt(cursor, 10)

  const db = c.get('db')

  const condition = timezoneId ? eq(pushTokens.timezoneId, timezoneId) : undefined

  const rows = await db
    .select({
      token: pushTokens.token,
      userId: pushTokens.userId,
      timezoneId: pushTokens.timezoneId,
      locale: users.locale,
    })
    .from(pushTokens)
    .innerJoin(users, eq(pushTokens.userId, users.id))
    .where(condition)
    .limit(limit + 1)
    .offset(offset)

  const hasMore = rows.length > limit
  const data = hasMore ? rows.slice(0, limit) : rows

  return c.json({
    data,
    nextCursor: hasMore ? String(offset + limit) : null,
  })
})

// ── DELETE /register-device — 注销推送令牌 ────────────────

notifyRoutes.delete('/register-device', async (c) => {
  const userId = requireUserId(c)

  const db = c.get('db')
  await db.delete(pushTokens).where(eq(pushTokens.userId, userId))

  return c.json({ ok: true })
})

// ── DELETE /unregister-stale — 批量删除失效 token (DeviceNotRegistered) ────

notifyRoutes.delete('/unregister-stale', async (c) => {
  const internalKey = c.req.header('X-Internal-Key')
  if (!internalKey || internalKey !== c.env.INTERNAL_KEY)
    throw new HTTPException(401, { message: 'Unauthorized' })

  const body = await c.req.json<{ tokens: unknown }>()
  if (!Array.isArray(body.tokens) || body.tokens.length === 0)
    throw new HTTPException(400, { message: 'tokens must be a non-empty array' })

  const tokens = (body.tokens as unknown[])
    .filter((t): t is string => typeof t === 'string')
    .slice(0, 100)

  const db = c.get('db')
  await db.delete(pushTokens).where(inArray(pushTokens.token, tokens))

  return c.json({ ok: true, deleted: tokens.length })
})

// ── GET /stale-tokens — 返回超过 N 天未活跃的 token (供 svc-notify 周清理) ──

notifyRoutes.get('/stale-tokens', async (c) => {
  const internalKey = c.req.header('X-Internal-Key')
  if (!internalKey || internalKey !== c.env.INTERNAL_KEY)
    throw new HTTPException(401, { message: 'Unauthorized' })

  const inactiveDays = Math.min(Number.parseInt(c.req.query('inactiveDays') ?? '90', 10) || 90, 365)
  const limit = Math.min(Number.parseInt(c.req.query('limit') ?? '500', 10) || 500, 1000)
  const cursor = Number.parseInt(c.req.query('cursor') ?? '0', 10)

  const cutoff = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000).toISOString()

  const db = c.get('db')
  const rows = await db
    .select({
      token: pushTokens.token,
      userId: pushTokens.userId,
      lastActiveAt: pushTokens.lastActiveAt,
    })
    .from(pushTokens)
    .where(lt(pushTokens.lastActiveAt, cutoff))
    .limit(limit + 1)
    .offset(cursor)

  const hasMore = rows.length > limit
  const data = hasMore ? rows.slice(0, limit) : rows

  return c.json({ data, nextCursor: hasMore ? String(cursor + limit) : null })
})

// ── POST /attribution — 记录推送 → IAP 转化归因 ────────────────

const attributionSchema = z.object({
  notificationId: z.string().min(1),
  productId: z.string().min(1),
  skuId: z.string().min(1),
})

notifyRoutes.post('/attribution', async (c) => {
  const userId = requireUserId(c)

  const body = await c.req.json()
  const input = attributionSchema.parse(body)

  const db = c.get('db')
  await db.insert(notificationAttributions).values({
    id: crypto.randomUUID(),
    userId,
    notificationId: input.notificationId,
    productId: input.productId,
    skuId: input.skuId,
  })

  return c.json({ ok: true })
})

// Forward all GET/POST requests dynamically
notifyRoutes.all('/*', async (c) => {
  const path = c.req.path.replace(/^\/api\/notify/, '') || '/'
  const url = new URL(`https://svc-notify.internal${path}`)
  url.search = new URL(c.req.url).search // retain query params

  const reqInit: RequestInit = {
    method: c.req.method,
    headers: c.req.raw.headers,
  }

  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    reqInit.body = c.req.raw.body
  }

  const res = await c.env.SVC_NOTIFY.fetch(url, reqInit)
  const newRes = new Response(res.body, res)
  return newRes
})
