/**
 * PreviewEssence — Free 用户首页的双盘精华载荷。
 *
 * 取代旧 preview 输出：在 personalityBullets / fateTease / warning 之外，
 * 额外提供 dualChartConsensus（八字×紫微合参 1-2 句）+ dimensionPulses
 * （4 维度走势卡）+ hookLine（≤20 字 share 金句）。
 *
 * 由 `/preview` 端点产生，仅 1 次 LLM 调用，输出 ~600 token。
 */

import { z } from 'zod/v4'

export const dimensionEnum = z.enum(['career', 'wealth', 'love', 'health'])
export const directionEnum = z.enum(['rising', 'steady', 'falling'])

export const dimensionPulseSchema = z.object({
  dimension: dimensionEnum,
  direction: directionEnum,
  score: z.number().min(1).max(10),
  oneLine: z.string(),
})

export const previewEssenceSchema = z.object({
  /** 3 条人格画像（10-25 字 / 8-20 词） */
  personalityBullets: z.array(z.string()),
  /** 1 条命运伏笔（30-50 字，以 …… 结尾） */
  fateTease: z.string(),
  /** 1 条反复模式警示（20-35 字，以 …… 结尾） */
  warning: z.string(),
  /** 八字×紫微 1-2 句合参精华（50-80 字） */
  dualChartConsensus: z.string(),
  /** 事业 / 财富 / 感情 / 健康 4 维度脉动（顺序固定） */
  dimensionPulses: z.array(dimensionPulseSchema),
  /** ≤4 字·古典命理签名（例：“金水互生” / “火炽冲天” / “阳刃赋型”） */
  fateSignature: z.string().optional(),
  /** ≤20 字 share / shelf 金句 */
  hookLine: z.string(),
})

export type PreviewEssence = z.infer<typeof previewEssenceSchema>
export type DimensionPulse = z.infer<typeof dimensionPulseSchema>
export type Dimension = z.infer<typeof dimensionEnum>
export type Direction = z.infer<typeof directionEnum>
