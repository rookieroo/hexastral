/**
 * 合婚 HTTP 端点
 */

import { Hono } from 'hono'
import { computeHeHun, generateHeHunInterpretation, generateAnnualForecast } from '../services/hehun/hehun'
import type { Env } from '../types'

type AppEnv = { Bindings: Env }

export const pairRoutes = new Hono<AppEnv>()

/** POST /compute — 合盘评分 + AI解读 */
pairRoutes.post('/compute', async (c) => {
  const input = await c.req.json()

  const result = computeHeHun(input)

  let interpretation = null
  try {
    interpretation = await generateHeHunInterpretation(
      c.env,
      result,
      input,
      input.isPro ?? false,
      input.language ?? 'zh-CN'
    )
  } catch (err) {
    console.error('[svc-astro/hehun] AI interpretation failed:', err)
  }

  return c.json({ result, interpretation })
})

/** POST /annual-forecast — 年度双人运势解读（基于已有合盘数据） */
pairRoutes.post('/annual-forecast', async (c) => {
  const input = await c.req.json()

  const interpretation = await generateAnnualForecast(c.env, input)

  return c.json(interpretation)
})
