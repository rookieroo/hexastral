/**
 * 命格排盘 HTTP 端点
 */

import { Hono } from 'hono'
import type { StellarCrossRef } from '../lib/i18n-prompt'
import { generateNatalChart, generateNatalInterpretation } from '../services/natal/natal'
import { generateChart } from '../services/stellar/stellar'
import type { Env } from '../types'

type AppEnv = { Bindings: Env }

export const natalRoutes = new Hono<AppEnv>()

/** POST /chart — 命格排盘 + AI 解读（双盘交叉验证） */
natalRoutes.post('/chart', async (c) => {
  const input = await c.req.json()

  const chart = generateNatalChart(input)

  // 计算星宫盘面作为交叉验证上下文
  let stellarContext: StellarCrossRef | undefined
  try {
    const { palaces, meta } = generateChart(input)
    const findPalace = (name: string) => palaces.find((p) => p.name === name)
    const formatStars = (p: ReturnType<typeof findPalace>) =>
      p?.majorStars.map((s) => s.name).join('、') ?? '无主星'
    const formatBrightness = (p: ReturnType<typeof findPalace>) =>
      p?.majorStars
        .map((s) => s.brightness)
        .filter(Boolean)
        .join('、') ?? ''
    const formatMutagen = (p: ReturnType<typeof findPalace>) =>
      p?.majorStars
        .map((s) => s.mutagen)
        .filter(Boolean)
        .join('、') ?? ''

    stellarContext = {
      soulPalace: {
        majorStars: formatStars(findPalace('命宫')),
        brightness: formatBrightness(findPalace('命宫')),
      },
      wealthPalace: {
        majorStars: formatStars(findPalace('财帛')),
        mutagen: formatMutagen(findPalace('财帛')),
      },
      careerPalace: {
        majorStars: formatStars(findPalace('官禄')),
        mutagen: formatMutagen(findPalace('官禄')),
      },
      spousePalace: {
        majorStars: formatStars(findPalace('夫妻')),
        mutagen: formatMutagen(findPalace('夫妻')),
      },
      fiveElementsClass: meta.fiveElementsClass,
    }
  } catch (err) {
    console.error('[svc-astro/natal] Cross-chart stellar calc failed:', err)
  }

  let hooks = null
  let interpretation = null
  try {
    const result = await generateNatalInterpretation(
      c.env,
      chart,
      input.isPro ?? false,
      input.language ?? 'zh-CN',
      stellarContext
    )
    hooks = result.hooks
    interpretation = result.full_reading
  } catch (err) {
    console.error('[svc-astro/natal] AI interpretation failed:', err)
  }

  return c.json({ chart, hooks, interpretation })
})
