/**
 * Zod schema — 命理输出 (双盘合参 + 面相)
 * Used for: shuangpan / fate-report structured output validation
 */

import { z } from 'zod/v4'

const scoredDimensionSchema = z.object({
  score: z.number().int().min(1).max(10),
  insight: z.string(),
})

export const fateOutputSchema = z.object({
  /** 总体命运概述 */
  lifeSummary: z.string(),
  /** 日主分析 */
  dayMasterAnalysis: z.object({
    element: z.string(),
    strength: z.string(),
    personality: z.string(),
  }),
  /** 五行能量占比 (各字段 0-100，合计约 100) */
  fiveElementBalance: z.object({
    metal: z.number().int().min(0).max(100),
    wood: z.number().int().min(0).max(100),
    water: z.number().int().min(0).max(100),
    fire: z.number().int().min(0).max(100),
    earth: z.number().int().min(0).max(100),
  }),
  /** 星宫亮点 */
  stellarHighlights: z.object({
    fatePalace: z.string(),
    bodyPalace: z.string(),
    majorStars: z.array(z.string()),
    brightness: z.string(),
  }),
  /** 面相修正维度（可选，仅当有面相数据时） */
  physiognomyModifiers: z
    .array(
      z.object({
        trait: z.string(),
        refinement: z.string(),
        confidence: z.enum(['high', 'medium', 'low']),
      })
    )
    .optional(),
  /** 流年各维度预测 */
  yearForecast: z.object({
    career: scoredDimensionSchema,
    wealth: scoredDimensionSchema,
    relationship: scoredDimensionSchema,
    health: scoredDimensionSchema,
  }),
  /** 大运阶段概述（最近 3-4 个） */
  decadeTransits: z.array(
    z.object({
      period: z.string(),
      theme: z.string(),
      opportunity: z.string(),
      risk: z.string(),
    })
  ),
  /** 关键月份提示 */
  monthlyHighlights: z.array(
    z.object({
      month: z.number().int().min(1).max(12),
      focus: z.string(),
    })
  ),
  /** 行动建议 (3-5 条) */
  actionAdvice: z.array(z.string()),
  /** 幸运元素 */
  luckyElements: z.object({
    colors: z.array(z.string()),
    directions: z.array(z.string()),
    numbers: z.array(z.number().int()),
  }),
  /** 引人入胜的钩子文案（用于报告顶部摘要） */
  hookLine: z.string(),
  /** 社交分享金句（≤20字） */
  shareQuote: z.string(),
})

export type FateOutput = z.infer<typeof fateOutputSchema>
