/**
 * 合婚预览路由 — Web 端免费预览（纯计算，无 AI 解读）
 *
 * POST /preview — Turnstile 验证后，调用 astro-core 本地计算合婚评分
 *                 不扣费、不存库、不需要登录
 */

import { getFourPillars } from '@zhop/astro-core/ganzhi'
import { calculateHeHun } from '@zhop/astro-core/hehun'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import type { AppEnv } from '../../infra-types'
import { solarDateSchema } from '../../lib/validation'

export const pairPreviewRoutes = new Hono<AppEnv>()

const personSchema = z.object({
  solarDate: solarDateSchema,
  timeIndex: z.int().min(0).max(12),
  gender: z.enum(['男', '女']),
  name: z.string().optional(),
})

const previewInputSchema = z.object({
  personA: personSchema,
  personB: personSchema,
})

/** Convert timeIndex (0-12) to 24h hour for getFourPillars */
function timeIndexToHour(timeIndex: number): number {
  if (timeIndex === 0) return 0
  if (timeIndex === 12) return 23
  return timeIndex * 2 - 1
}

/** Parse "YYYY-M-D" + timeIndex → DateTimeInput */
function parsePerson(solarDate: string, timeIndex: number) {
  const [yearStr, monthStr, dayStr] = solarDate.split('-')
  return {
    year: Number.parseInt(yearStr!, 10),
    month: Number.parseInt(monthStr!, 10),
    day: Number.parseInt(dayStr!, 10),
    hour: timeIndexToHour(timeIndex),
  }
}

/** POST /preview — 免费合盘评分预览 */
pairPreviewRoutes.post('/preview', async (c) => {
  const body = await c.req.json()
  const input = previewInputSchema.parse(body)

  const dtA = parsePerson(input.personA.solarDate, input.personA.timeIndex)
  const dtB = parsePerson(input.personB.solarDate, input.personB.timeIndex)

  const pillarsA = getFourPillars(dtA)
  const pillarsB = getFourPillars(dtB)

  const result = calculateHeHun(pillarsA, pillarsB)

  return c.json({
    score: result.score,
    grade: result.grade,
    gradeLabel: result.gradeLabel,
    dimensions: result.dimensions.map((d) => ({
      name: d.name,
      score: d.score,
      maxScore: d.maxScore,
    })),
    summary: result.summary,
    highlights: result.highlights,
    warnings: result.warnings,
  })
})
