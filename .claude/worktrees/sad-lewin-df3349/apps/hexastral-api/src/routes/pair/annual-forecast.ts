/**
 * 合盘年度运势预测路由
 *
 * POST /api/pair/:id/annual-forecast
 *   — 基于已有合盘数据，为特定年份生成双人年度运势解读
 *   — Pro 用户: 消耗 1 次 pairUsed 配额
 *   — 非 Pro: 返回 402，iOS 端展示订阅引导
 *   — 缓存: 相同 pairReadingId + queryYear 命中即返回，不重复计费
 */

import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import { pairAnnualForecasts, pairReadings } from '../../db/schema'
import type { AppEnv } from '../../infra-types'
import { callAstro } from '../../lib/astro-client'
import { requireUserId } from '../../lib/auth'
import { isProUser } from '../../lib/access-check'
import { consumeProPairQuota } from '../../services/quota'

export const pairAnnualForecastRoutes = new Hono<AppEnv>()

const forecastInputSchema = z.object({
  queryYear: z.int().min(2020).max(2099),
  language: z.string().optional().default('zh-CN'),
  requestId: z.string().min(1),
})

/** POST /api/pair/:id/annual-forecast */
pairAnnualForecastRoutes.post('/:id/annual-forecast', async (c) => {
  const pairReadingId = c.req.param('id')
  const body = await c.req.json()
  const input = forecastInputSchema.parse(body)
  const userId = requireUserId(c)
  const db = c.get('db')

  // 验证合盘记录归属
  const pairReading = await db
    .select()
    .from(pairReadings)
    .where(and(eq(pairReadings.id, pairReadingId), eq(pairReadings.userId, userId)))
    .get()

  if (!pairReading) {
    throw new HTTPException(404, { message: 'Pair reading not found' })
  }

  // 命中缓存：相同 pairReadingId + queryYear 直接返回已有解读
  const cached = await db
    .select()
    .from(pairAnnualForecasts)
    .where(
      and(
        eq(pairAnnualForecasts.pairReadingId, pairReadingId),
        eq(pairAnnualForecasts.queryYear, input.queryYear)
      )
    )
    .get()

  if (cached) {
    return c.json({
      id: cached.id,
      pairReadingId,
      queryYear: cached.queryYear,
      interpretation: JSON.parse(cached.interpretation),
      cached: true,
    })
  }

  // 获取用户订阅状态
  const { users } = await import('../../db/schema')
  const { eq: deq } = await import('drizzle-orm')
  const user = await db.select().from(users).where(deq(users.id, userId)).get()
  if (!user) throw new HTTPException(404, { message: 'User not found' })

  const isPro = isProUser(user)

  if (!isPro) throw new HTTPException(403, { message: 'pro_required' })

  // Pro: 消耗 1 次 pairUsed 配额，耗尽则 402
  const plan = (user.subscriptionPlan as 'monthly' | 'annual' | null) ?? 'monthly'
  const { decided } = await consumeProPairQuota(db, userId, plan)

  if (decided === 'overflow') {
    throw new HTTPException(402, { message: 'quota_exceeded' })
  }

  // 生成年度运势解读
  const interpretation = await callAstro<Record<string, string>>(
    c.env.SVC_ASTRO,
    '/pair/annual-forecast',
    {
      personASolarDate: pairReading.personASolarDate,
      personATimeIndex: pairReading.personATimeIndex,
      personAGender: pairReading.personAGender,
      personAName: pairReading.personAName,
      personBSolarDate: pairReading.personBSolarDate,
      personBTimeIndex: pairReading.personBTimeIndex,
      personBGender: pairReading.personBGender,
      personBName: pairReading.personBName,
      compatibilityData: JSON.parse(pairReading.compatibilityData),
      queryYear: input.queryYear,
      language: input.language,
    }
  )

  // 保存结果
  const forecastId = crypto.randomUUID()
  await db.insert(pairAnnualForecasts).values({
    id: forecastId,
    userId,
    pairReadingId,
    queryYear: input.queryYear,
    interpretation: JSON.stringify(interpretation),
  })

  return c.json({
    id: forecastId,
    pairReadingId,
    queryYear: input.queryYear,
    interpretation,
    cached: false,
    meta: { isPro },
  })
})
