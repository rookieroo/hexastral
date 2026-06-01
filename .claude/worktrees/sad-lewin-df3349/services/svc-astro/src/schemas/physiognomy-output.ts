/**
 * Zod schema — 面相手相独立解读输出
 */

import { z } from 'zod/v4'

const scoredDimensionSchema = z.object({
  score: z.number().int().min(1).max(10),
  insight: z.string(),
})

export const physiognomyOutputSchema = z.object({
  type: z.enum(['face', 'palm']),
  /** 整体格局概述 */
  overview: z.string(),
  /** 各部位特征分析 */
  featureAnalysis: z.array(
    z.object({
      region: z.string(),
      observation: z.string(),
      fortune: z.string(),
    })
  ),
  /** 性格特征 */
  personality: z.string(),
  /** 事业运 */
  career: scoredDimensionSchema,
  /** 财运 */
  wealth: scoredDimensionSchema,
  /** 健康运 */
  health: scoredDimensionSchema,
  /** 感情运 */
  relationship: scoredDimensionSchema,
  /** 特别备注（罕见格局、命格亮点） */
  specialNotes: z.string(),
  /** 幸运元素 */
  luckyElements: z.object({
    colors: z.array(z.string()),
    directions: z.array(z.string()),
    numbers: z.array(z.number().int()),
  }),
  /** 引人入胜的钩子文案 */
  hookLine: z.string(),
  /** 社交分享金句（≤20字） */
  shareQuote: z.string(),
})

export type PhysiognomyOutput = z.infer<typeof physiognomyOutputSchema>
