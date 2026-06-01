/**
 * Public visibility routes — controls which chart sections are exposed on public profile.
 *
 * GET    /api/user/visibility  — read current visibility flags
 * PATCH  /api/user/visibility  — update visibility flags
 *
 * Extracted from the (deleted) fate-signature.ts during the deep refactor;
 * fate-signature concept is gone but visibility settings remain orthogonal.
 */

import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod/v4'
import { users } from '../db/schema'
import type { AppEnv } from '../infra-types'
import { requireUserId } from '../lib/auth'

const VISIBILITY_KEYS = ['signature', 'bazi', 'ziwei', 'basic', 'plainIntro'] as const
type VisibilityKey = (typeof VISIBILITY_KEYS)[number]
export type PublicVisibility = Record<VisibilityKey, boolean>

const visibilityPatchSchema = z.object({
  signature: z.boolean().optional(),
  bazi: z.boolean().optional(),
  ziwei: z.boolean().optional(),
  basic: z.boolean().optional(),
  plainIntro: z.boolean().optional(),
})

/**
 * Parse `public_visibility_json`.
 * Legacy `stats` (原「互动/解读次数」开关) 在缺省 `basic` 时映射到 `basic`，避免旧客户端写入丢语义。
 */
export function parseVisibility(json: string | null): PublicVisibility {
  const defaults: PublicVisibility = {
    signature: true,
    bazi: true,
    ziwei: true,
    basic: true,
    plainIntro: false,
  }
  if (!json) return defaults
  try {
    const raw = JSON.parse(json) as Record<string, unknown>
    const out: PublicVisibility = { ...defaults }
    for (const k of VISIBILITY_KEYS) {
      if (typeof raw[k] === 'boolean') {
        out[k] = raw[k] as boolean
      }
    }
    if (typeof raw.basic !== 'boolean' && typeof raw.stats === 'boolean') {
      out.basic = raw.stats
    }
    return out
  } catch {
    return defaults
  }
}

export const visibilityRoutes = new Hono<AppEnv>()
  .get('/', async (c) => {
    const userId = requireUserId(c)
    const db = c.get('db')
    const user = await db
      .select({
        chartPublic: users.chartPublic,
        publicVisibilityJson: users.publicVisibilityJson,
      })
      .from(users)
      .where(eq(users.id, userId))
      .get()
    if (!user) throw new HTTPException(404, { message: 'User not found' })
    return c.json({
      data: {
        chartPublic: user.chartPublic,
        visibility: parseVisibility(user.publicVisibilityJson),
      },
    })
  })
  .patch('/', zValidator('json', visibilityPatchSchema), async (c) => {
    const userId = requireUserId(c)
    const input = c.req.valid('json')
    const db = c.get('db')

    const user = await db
      .select({
        publicVisibilityJson: users.publicVisibilityJson,
        chartPublic: users.chartPublic,
        username: users.username,
      })
      .from(users)
      .where(eq(users.id, userId))
      .get()
    if (!user) throw new HTTPException(404, { message: 'User not found' })

    const u = (user.username ?? '').trim()
    if (!user.chartPublic || u.length < 2 || !/^[a-z0-9_]+$/.test(u)) {
      throw new HTTPException(403, { message: 'Public chart not enabled or username missing' })
    }

    const merged: PublicVisibility = { ...parseVisibility(user.publicVisibilityJson), ...input }
    await db
      .update(users)
      .set({
        publicVisibilityJson: JSON.stringify(merged),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId))

    return c.json({ data: { visibility: merged } })
  })
