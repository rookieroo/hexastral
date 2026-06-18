/**
 * 合婚 HTTP 端点
 */

import { Hono } from 'hono'
import {
  computeHeHun,
  generateAnnualForecast,
  generateHeHunInterpretation,
  generateRelationshipPushSnippets,
  generateSynastryChapters,
  summarizeZiweiPair,
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
  const [interpResult, chaptersResult, snippetsResult] = await Promise.allSettled([
    generateHeHunInterpretation(c.env, result, input, input.isPro ?? false, language),
    generateSynastryChapters(c.env, result, input, language),
    // Harvest (ADR-0025): pre-write relationship push 语料 in the same LLM moment, so
    // the kindred push queue is fed with zero per-day cron LLM. Non-fatal.
    generateRelationshipPushSnippets(c.env, result, input, language),
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

  const pushSnippets = snippetsResult.status === 'fulfilled' ? snippetsResult.value : []

  // 紫微 summaries — persisted by the API layer so the living layer (timeline /
  // what-if) can fold a deterministic 紫微 signal without recomputing iztro.
  const { ziweiSummaryA, ziweiSummaryB } = summarizeZiweiPair(input)

  return c.json({ result, interpretation, ziweiSummaryA, ziweiSummaryB, pushSnippets })
})

/** POST /annual-forecast — 年度双人运势解读（基于已有合盘数据） */
pairRoutes.post('/annual-forecast', async (c) => {
  const input = await c.req.json()

  const interpretation = await generateAnnualForecast(c.env, input)

  return c.json(interpretation)
})
