/**
 * GET /api/quota/free — Free 用户当月占卜配额查询
 *
 * 订阅用户为无限额度（由 user_entitlements 决定，K.4 日级守卫防滥用），不再有计量池，
 * 因此只保留 Free 用户的占卜配额 + 预购次数查询，供 iOS 端渲染升级入口。
 */

import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { users } from '../db/schema'
import type { AppEnv } from '../infra-types'
import { requireUserId } from '../lib/auth'
import { getFreeMonthlyDivinationStatus } from '../services/quota'

export const quotaRoutes = new Hono<AppEnv>()

/** GET /api/quota/free — 获取 Free 用户当月占卜配额状态 */
quotaRoutes.get('/free', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')

  const user = await db
    .select({ divinationCreditsRemaining: users.divinationCreditsRemaining })
    .from(users)
    .where(eq(users.id, userId))
    .get()

  if (!user) throw new HTTPException(404, { message: 'User not found' })

  const divination = await getFreeMonthlyDivinationStatus(db, userId)

  return c.json({
    divination: {
      usedThisMonth: divination.used,
      limit: divination.limit,
      remaining: divination.remaining,
      creditsRemaining: user.divinationCreditsRemaining,
    },
  })
})
