/**
 * POST /api/onboarding/static-traits
 *
 * Lightweight endpoint that derives Ba Zi static traits (day master, strength,
 * favorable / unfavorable element, birth branch) from the user's birth info
 * and writes them to the users row. Used during onboarding to populate the
 * fields that /signal/today and /report depend on.
 *
 * Pure compute — does NOT call svc-astro, does NOT generate AI interpretation,
 * does NOT consume credits. Idempotent: safe to overwrite on each call.
 *
 * Heavy-weight natal chart + LLM reading remains at POST /api/natal.
 */

import { getFourPillars } from '@zhop/astro-core/ganzhi'
import { analyzeGeJu } from '@zhop/astro-core'
import { getFourPillarsShiShen } from '@zhop/astro-core/shishen'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import { users } from '../../db/schema'
import type { AppEnv } from '../../infra-types'
import { requireUserId } from '../../lib/auth'
import { solarDateSchema } from '../../lib/validation'

const inputSchema = z.object({
  solarDate: solarDateSchema,
  timeIndex: z.int().min(0).max(12),
  gender: z.enum(['男', '女']),
})

const TIME_INDEX_TO_HOUR: Record<number, number> = {
  0: 23, 1: 1, 2: 3, 3: 5, 4: 7, 5: 9, 6: 11,
  7: 13, 8: 15, 9: 17, 10: 19, 11: 21, 12: 12,
}

export const onboardingStaticTraitsRoutes = new Hono<AppEnv>().post(
  '/',
  zValidator('json', inputSchema),
  async (c) => {
    const userId = requireUserId(c)
    const db = c.get('db')
    const { solarDate, timeIndex } = c.req.valid('json')

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (!user) throw new HTTPException(404, { message: 'User not found' })

    const [year, month, day] = solarDate.split('-').map(Number) as [number, number, number]
    const hour = TIME_INDEX_TO_HOUR[timeIndex] ?? 12
    const pillars = getFourPillars({ year, month, day, hour })
    const shishen = getFourPillarsShiShen(pillars)
    const geju = analyzeGeJu(pillars, shishen)

    await db
      .update(users)
      .set({
        dayMasterStem: pillars.day.stem,
        dayMasterStrength: geju.dayMasterStrength,
        favorableElement: geju.favorableElement,
        unfavorableElement: geju.unfavorableElement,
        birthBranch: pillars.year.branch,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId))

    return c.json({
      ok: true,
      traits: {
        dayMasterStem: pillars.day.stem,
        dayMasterStrength: geju.dayMasterStrength,
        favorableElement: geju.favorableElement,
        unfavorableElement: geju.unfavorableElement,
        birthBranch: pillars.year.branch,
      },
    })
  }
)
