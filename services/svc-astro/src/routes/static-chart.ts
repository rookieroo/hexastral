/**
 * 静态命盘端点 — 0 LLM 成本，纯 astro-core / iztro 计算
 *
 * 返回 natal（八字）+ stellar（紫薇）+ 完整大运 + 神煞 + 调候，
 * 供 Free 用户首页 / 详情页展示，无需调用任何 AI 模型。
 */

import { Hono } from 'hono'
import { z } from 'zod/v4'
import { generateNatalChart } from '../services/natal/natal'
import { generateChart } from '../services/stellar/stellar'
import type { Env } from '../types'

type AppEnv = { Bindings: Env }

export const staticChartRoutes = new Hono<AppEnv>()

const inputSchema = z.object({
  solarDate: z.string(),
  timeIndex: z.number().int().min(0).max(12),
  /** 精确出生时间：当天 00:00 起分钟数 0-1439。存在 = 精确模式 + 真太阳时校准。 */
  clockMinutes: z.number().int().min(0).max(1439).optional(),
  /** 是否做真太阳时校准（默认 true）；仅精确模式 + 有经度时生效。 */
  calibrate: z.boolean().optional(),
  gender: z.enum(['男', '女']),
  longitude: z.number().optional(),
  latitude: z.number().optional(),
  timezoneId: z.string().optional(),
  city: z.string().optional(),
  userId: z.string().min(1),
  language: z.string().optional().default('zh-CN'),
})

/** POST /chart/static — 纯静态命盘 */
staticChartRoutes.post('/static', async (c) => {
  const body = await c.req.json()
  const input = inputSchema.parse(body)

  const natal = generateNatalChart(input)
  const { palaces, meta } = generateChart(input)

  // 提取 natal 静态字段（不含 LLM 输出）
  const natalSummary = {
    pillars: natal.pillars,
    nayin: natal.nayin,
    shishen: natal.shishen,
    dayMaster: natal.pillars.day.stem,
    dayMasterWuXing: natal.dayMasterWuXing,
    geju: {
      primary: natal.geju.primary,
      dayMasterStrength: natal.geju.dayMasterStrength,
      favorableElement: natal.geju.favorableElement,
      unfavorableElement: natal.geju.unfavorableElement,
    },
    tiaohou: natal.tiaohou
      ? {
          gods: natal.tiaohou.gods,
          satisfied: natal.tiaohouSatisfied,
        }
      : null,
    dayun: natal.daYun
      ? {
          direction: natal.daYun.direction,
          startAge: natal.daYun.startAge,
          startYear: natal.daYun.startYear,
          steps: natal.daYun.steps,
        }
      : null,
    shensha:
      natal.shenSha?.items?.map((s) => ({
        name: s.name,
        pillar: s.pillar,
        polarity: s.polarity,
      })) ?? [],
  }

  // 提取 stellar 静态字段
  const soulPalace = palaces.find((p) => p.name === '命宫')
  const stellarSummary = {
    soulStar: meta.soul,
    bodyStar: meta.body,
    fiveElementsClass: meta.fiveElementsClass,
    sign: meta.sign,
    zodiac: meta.zodiac,
    soulPalaceMajorStars: soulPalace?.majorStars.map((s) => s.name) ?? [],
    palaces: palaces.map((p) => ({
      name: p.name,
      heavenlyStem: p.heavenlyStem,
      earthlyBranch: p.earthlyBranch,
      isBodyPalace: p.isBodyPalace,
      majorStars: p.majorStars,
      decadal: p.decadal,
    })),
  }

  return c.json({
    natal: natalSummary,
    stellar: stellarSummary,
    language: input.language,
  })
})
