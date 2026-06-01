/**
 * 星宫排盘 HTTP 端点
 */

import { Hono } from 'hono'
import type { NatalCrossRef } from '../lib/i18n-prompt'
import { generateNatalChart } from '../services/natal/natal'
import { generateChart, generateInterpretation, getHoroscope } from '../services/stellar/stellar'
import type { Env } from '../types'

type AppEnv = { Bindings: Env }

export const stellarRoutes = new Hono<AppEnv>()

/** POST /chart — 排盘 + AI 解读（双盘交叉验证） */
stellarRoutes.post('/chart', async (c) => {
  const input = await c.req.json()

  const { palaces, meta, chart } = generateChart(input)

  const horoscope = getHoroscope(chart, input.date)

  // 计算命格格局作为交叉验证上下文
  let natalContext: NatalCrossRef | undefined
  try {
    const natalChart = generateNatalChart(input)
    natalContext = {
      pillars: `${natalChart.pillars.year.label} ${natalChart.pillars.month.label} ${natalChart.pillars.day.label} ${natalChart.pillars.hour.label}`,
      gejuPrimary: natalChart.geju.primary,
      dayMasterStrength: natalChart.geju.dayMasterStrength,
      favorableElement: natalChart.geju.favorableElement,
      unfavorableElement: natalChart.geju.unfavorableElement,
      tiaohouGods: natalChart.tiaohou?.gods.join('、') ?? '',
      tiaohouSatisfied: natalChart.tiaohouSatisfied,
      dayMasterWuXing: natalChart.dayMasterWuXing,
      dayStem: natalChart.pillars.day.stem,
    }
  } catch (err) {
    console.error('[svc-astro/stellar] Cross-chart natal calc failed:', err)
  }

  let interpretation = null
  try {
    interpretation = await generateInterpretation(
      c.env,
      palaces,
      meta,
      input.isPro ?? false,
      input.language ?? 'zh-CN',
      natalContext
    )
  } catch (err) {
    console.error('[svc-astro/stellar] AI interpretation failed:', err)
  }

  return c.json({ palaces, meta, horoscope, interpretation })
})

/** POST /horoscope — 获取流年运势 */
stellarRoutes.post('/horoscope', async (c) => {
  const input = await c.req.json()
  const { chart } = generateChart(input)
  const horoscope = getHoroscope(chart, input.date)
  return c.json(horoscope)
})
