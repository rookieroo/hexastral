/**
 * Zod schema — 合盘输出 (双人双盘合参 + 双方面相)
 * Scope: all relationship types (spouse / partner / parent / sibling / friend / colleague / boss)
 */

import { z } from 'zod/v4'

export const hehunOutputSchema = z.object({
  /** 0-100 总体匹配分 */
  overallScore: z.number().int().min(0).max(100),
  /** S / A / B / C / D */
  grade: z.enum(['S', 'A', 'B', 'C', 'D']),
  /** 四维度评分 (感情/长期/沟通/吸引力 or 关系维度) */
  dimensions: z.array(
    z.object({
      name: z.string(),
      score: z.number().int().min(0).max(100),
      insight: z.string(),
    })
  ),
  /** 日主五行关系 */
  dayMasterChemistry: z.object({
    relation: z.string(),
    description: z.string(),
  }),
  /** 地支三柱共鸣分析 */
  branchResonance: z.object({
    year: z.object({ type: z.string(), effect: z.string() }),
    month: z.object({ type: z.string(), effect: z.string() }),
    day: z.object({ type: z.string(), effect: z.string() }),
  }),
  /** 面相互补分析（可选，仅当有面相数据时） */
  physiognomyHarmony: z
    .object({
      complementary: z.array(z.string()),
      conflicting: z.array(z.string()),
    })
    .optional(),
  /** 关系原型名（朗朗上口，适合截图） */
  archetypeName: z.string(),
  /** 原型标签语（≤20字） */
  archetypeTagline: z.string(),
  /** 优势亮点（3-5 条） */
  highlights: z.array(z.string()),
  /** 需要注意的事项（2-3 条） */
  warnings: z.array(z.string()),
  /** 最佳时间窗口（如婚嫁、重要决策） */
  bestTimingWindows: z.array(
    z.object({
      event: z.string(),
      period: z.string(),
      reason: z.string(),
    })
  ),
  /** 综合建议 */
  advice: z.string(),
  /** 引人入胜的钩子文案 */
  hookLine: z.string(),
  /** 社交分享金句（≤20字） */
  shareQuote: z.string(),
})

export type HehunOutput = z.infer<typeof hehunOutputSchema>
