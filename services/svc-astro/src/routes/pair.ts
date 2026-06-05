/**
 * 合婚 HTTP 端点
 */

import { Hono } from 'hono'
import {
  computeHeHun,
  generateAnnualForecast,
  generateHeHunInterpretation,
  generateSynastryChapters,
} from '../services/hehun/hehun'
import type { Env } from '../types'

type AppEnv = { Bindings: Env }

export const pairRoutes = new Hono<AppEnv>()

/** POST /compute — 合盘评分 + AI解读 */
pairRoutes.post('/compute', async (c) => {
  const input = await c.req.json()

  const result = computeHeHun(input)
  const language = input.language ?? 'zh-CN'

  // Flat interpretation (cards/teaser/share) and the six deep chapters + aha
  // hook are independent LLM calls — run them in parallel so the deep report
  // adds no extra latency. Either can fail independently without 500-ing.
  const [interpResult, chaptersResult] = await Promise.allSettled([
    generateHeHunInterpretation(c.env, result, input, input.isPro ?? false, language),
    generateSynastryChapters(c.env, result, input, language),
  ])

  if (interpResult.status === 'rejected') {
    console.error('[svc-astro/hehun] AI interpretation failed:', interpResult.reason)
  }
  if (chaptersResult.status === 'rejected') {
    console.error('[svc-astro/hehun] chapter generation failed:', chaptersResult.reason)
  }

  const interpretation =
    interpResult.status === 'fulfilled'
      ? {
          ...interpResult.value,
          ...(chaptersResult.status === 'fulfilled' ? chaptersResult.value : {}),
        }
      : null

  return c.json({ result, interpretation })
})

/** POST /annual-forecast — 年度双人运势解读（基于已有合盘数据） */
pairRoutes.post('/annual-forecast', async (c) => {
  const input = await c.req.json()

  const interpretation = await generateAnnualForecast(c.env, input)

  return c.json(interpretation)
})
