/**
 * 综合命运报告 HTTP 端点
 *
 * POST /generate — 生成综合命运报告（Gemini 3.1 Pro + DeepSeek-R1 fallback）
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { Env } from '../types'
import { generateFateReport } from '../services/fate/report'

type AppEnv = { Bindings: Env }

export const fateRoutes = new Hono<AppEnv>()

/** POST /generate */
fateRoutes.post('/generate', async (c) => {
  const input = await c.req.json<{
    stellarChartData: string
    natalChartData: string
    queryYear: number
    physiognomyFeaturesJson?: string | null
    language?: string
    isPro?: boolean
  }>()

  if (!input.stellarChartData || !input.natalChartData) {
    throw new HTTPException(400, { message: 'stellarChartData and natalChartData are required' })
  }

  const result = await generateFateReport(
    c.env,
    {
      stellarChartData: input.stellarChartData,
      natalChartData: input.natalChartData,
      queryYear: input.queryYear,
      physiognomyFeaturesJson: input.physiognomyFeaturesJson,
      language: input.language,
      isPro: input.isPro ?? false,
    },
  )

  return c.json(result)
})
