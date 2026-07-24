/**
 * Last-touch paid acquisition attribution (DDL click ids / UTM).
 * Joined at RevenueCat INITIAL_PURCHASE for merchant CAPI postbacks.
 */

import { and, eq, gt } from 'drizzle-orm'
import type { Context } from 'hono'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import { userGrowthAttributions } from '../db/schema'
import type { AppDb, AppEnv } from '../infra-types'
import { enqueueAdConvert } from '../lib/ad-convert-queue'

const ATTR_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30d

const bodySchema = z.object({
  anonymous_id: z.string().min(8).max(128).optional(),
  target_app: z.string().max(64).optional(),
  click_ids: z.record(z.string(), z.string().max(512)).optional(),
  utm: z.record(z.string(), z.string().max(256)).optional(),
  landing_path: z.string().max(512).optional(),
  claimed_at_ms: z.number().int().positive().optional(),
  /** When true and user is authenticated, also enqueue CompleteRegistration postback */
  emit_login_postback: z.boolean().optional(),
})

export const growthAttributionRoutes = new Hono<AppEnv>()

/** Authenticated last-touch upload (login) — HMAC required at mount. */
growthAttributionRoutes.post('/', async (c) => {
  const userId = c.get('userId')
  if (!userId) throw new HTTPException(401, { message: 'Unauthorized' })
  return handleUpsert(c, userId)
})

/**
 * Pre-login DDL claim upload — public + rate-limited.
 * Merged onto user_id when the signed `/` route is called with the same anonymous_id.
 */
growthAttributionRoutes.post('/anon', async (c) => {
  return handleUpsert(c, null)
})

async function handleUpsert(c: Context<AppEnv>, forcedUserId: string | null) {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw new HTTPException(422, { message: 'Expected JSON body' })
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw new HTTPException(422, { message: 'Invalid attribution payload' })
  }

  const data = parsed.data
  const userId = forcedUserId ?? c.get('userId')
  const clickIds = data.click_ids ?? {}
  const utm = data.utm ?? {}
  if (Object.keys(clickIds).length === 0 && Object.keys(utm).length === 0) {
    return c.json({ ok: true, skipped: 'empty_attribution' })
  }

  if (!userId && !data.anonymous_id) {
    throw new HTTPException(401, { message: 'userId or anonymous_id required' })
  }

  const db = c.get('db')
  const now = Date.now()
  const claimedAt = data.claimed_at_ms ?? now
  const expiresAt = new Date(claimedAt + ATTR_TTL_MS).toISOString()
  const updatedAt = new Date().toISOString()

  await upsertGrowthAttribution(db, {
    userId: userId ?? null,
    anonymousId: data.anonymous_id ?? null,
    targetApp: data.target_app ?? null,
    clickIds,
    utm,
    landingPath: data.landing_path ?? null,
    claimedAtMs: claimedAt,
    expiresAt,
    updatedAt,
  })

  if (userId && data.emit_login_postback) {
    c.executionCtx.waitUntil(
      enqueueAdConvert(
        c.env,
        {
          event_id: `login_${userId}_${claimedAt}`,
          event_name: 'CompleteRegistration',
          occurred_at_ms: now,
          action_source: 'app',
          user_id: userId,
          target_app: data.target_app,
          click_ids: clickIds,
          utm,
        },
        'other'
      ).then(() => undefined)
    )
  }

  return c.json({ ok: true })
}

export type StoredGrowthAttribution = {
  click_ids: Record<string, string>
  utm: Record<string, string>
  target_app: string | null
  landing_path: string | null
}

export async function loadGrowthAttributionForUser(
  db: AppDb,
  userId: string
): Promise<StoredGrowthAttribution | null> {
  const nowIso = new Date().toISOString()
  const row = await db
    .select()
    .from(userGrowthAttributions)
    .where(
      and(eq(userGrowthAttributions.userId, userId), gt(userGrowthAttributions.expiresAt, nowIso))
    )
    .get()
  if (!row) return null
  return {
    click_ids: parseJsonRecord(row.clickIdsJson),
    utm: parseJsonRecord(row.utmJson),
    target_app: row.targetApp,
    landing_path: row.landingPath,
  }
}

function parseJsonRecord(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string' && v.length > 0) out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

async function upsertGrowthAttribution(
  db: AppDb,
  input: {
    userId: string | null
    anonymousId: string | null
    targetApp: string | null
    clickIds: Record<string, string>
    utm: Record<string, string>
    landingPath: string | null
    claimedAtMs: number
    expiresAt: string
    updatedAt: string
  }
): Promise<void> {
  const clickIdsJson = JSON.stringify(input.clickIds)
  const utmJson = JSON.stringify(input.utm)

  let existing =
    input.userId != null
      ? await db
          .select()
          .from(userGrowthAttributions)
          .where(eq(userGrowthAttributions.userId, input.userId))
          .get()
      : undefined

  if (!existing && input.anonymousId) {
    existing = await db
      .select()
      .from(userGrowthAttributions)
      .where(eq(userGrowthAttributions.anonymousId, input.anonymousId))
      .get()
  }

  if (existing) {
    await db
      .update(userGrowthAttributions)
      .set({
        userId: input.userId ?? existing.userId,
        anonymousId: input.anonymousId ?? existing.anonymousId,
        targetApp: input.targetApp ?? existing.targetApp,
        clickIdsJson,
        utmJson,
        landingPath: input.landingPath ?? existing.landingPath,
        claimedAtMs: input.claimedAtMs,
        expiresAt: input.expiresAt,
        updatedAt: input.updatedAt,
      })
      .where(eq(userGrowthAttributions.id, existing.id))
    return
  }

  await db.insert(userGrowthAttributions).values({
    id: crypto.randomUUID(),
    userId: input.userId,
    anonymousId: input.anonymousId,
    targetApp: input.targetApp,
    clickIdsJson,
    utmJson,
    landingPath: input.landingPath,
    claimedAtMs: input.claimedAtMs,
    expiresAt: input.expiresAt,
    updatedAt: input.updatedAt,
  })
}
