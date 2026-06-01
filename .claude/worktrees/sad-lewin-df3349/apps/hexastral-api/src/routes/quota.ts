/**
 * GET /api/quota — Pro 用户月度配额查询
 *
 * 仅限已登录的 Pro 用户访问。返回当月各类配额的使用情况，
 * 供 iOS 端渲染配额仪表盘（QuotaBar 组件）。
 *
 * 非 Pro 用户调用返回 403（含提示信息），iOS 端应据此展示升级入口。
 */

import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { users } from '../db/schema'
import type { AppEnv } from '../infra-types'
import { isProUser } from '../lib/access-check'
import { requireUserId } from '../lib/auth'
import {
  getFreeMonthlyDivinationStatus,
  getQuotaStatus,
  QUOTA_LIMITS,
} from '../services/quota'

export const quotaRoutes = new Hono<AppEnv>()

/** GET /api/quota — 获取 Pro 用户当月配额状态 */
quotaRoutes.get('/', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')

  const user = await db
    .select({ subscriptionStatus: users.subscriptionStatus })
    .from(users)
    .where(eq(users.id, userId))
    .get()

  if (!user) throw new HTTPException(404, { message: 'User not found' })

  const isPro = isProUser(user)

  if (!isPro) {
    return c.json(
      {
        error: 'not_pro',
        message: 'Quota system is only available for Pro subscribers.',
        subscriptionStatus: user.subscriptionStatus,
      },
      403
    )
  }

  const status = await getQuotaStatus(db, userId)

  return c.json({ ...status, limits: QUOTA_LIMITS })
})

/** GET /api/quota/free — 获取 Free 用户当月占卜配额状态 */
quotaRoutes.get('/free', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')

  const user = await db
    .select({
      subscriptionStatus: users.subscriptionStatus,
      divinationCreditsRemaining: users.divinationCreditsRemaining,
    })
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
