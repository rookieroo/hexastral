/**
 * 黄历 deep reading — POST /cycle/explain (Cycle satellite, C.4).
 *
 * A short (80–200 char) plain-text explanation of ONE 宜忌/冲 field for a day,
 * locale-aware, weaving in the user's 日主 angle when provided. This is the ONLY
 * LLM in Cycle — the base almanac + 对你而言 overlay are deterministic (C.1/C.3).
 *
 * Cost is guarded UPSTREAM by hexastral-api's K.4 LLM guard (rate / budget / tier);
 * this route just generates. `isPro` selects the model tier inside callWithFallback.
 */

import { Hono } from 'hono'
import { z } from 'zod/v4'
import { callWithFallback } from '../lib/ai-router'
import type { Env } from '../types'

type AppEnv = { Bindings: Env }

export const cycleRoutes = new Hono<AppEnv>()

const inputSchema = z.object({
  date: z.string().min(1),
  /** The 宜忌/冲 field to explain, e.g. "宜 动土" / "忌 出行" / "冲鸡". */
  field: z.string().min(1).max(40),
  ganZhi: z.string().max(8).optional(),
  dayOfficer: z.string().max(4).optional(),
  mansion: z.string().max(8).optional(),
  /** User's 日主 天干 (optional — adds an "对你而言" angle). */
  dayMaster: z.string().max(2).optional(),
  /** Deterministic 日主×今日 relation (生我/克我/…) from the overlay (optional). */
  relation: z.string().max(8).optional(),
  locale: z.string().default('en'),
  isPro: z.boolean().optional().default(false),
})

cycleRoutes.post('/explain', async (c) => {
  const input = inputSchema.parse(await c.req.json())
  const langLabel = getLangLabel(input.locale)

  const facts = [
    `日期：${input.date}`,
    input.ganZhi ? `干支：${input.ganZhi}` : '',
    input.dayOfficer ? `建除值神：${input.dayOfficer}日` : '',
    input.mansion ? `二十八宿：${input.mansion}宿` : '',
    `待解释字段：${input.field}`,
    input.dayMaster ? `用户日主：${input.dayMaster}` : '',
    input.relation ? `日主×今日关系：${input.relation}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const personalClause = input.dayMaster
    ? '\n- 结合用户日主补一句「对你而言」的角度（仅据五行生克，不臆测完整八字）。'
    : ''

  const systemPrompt = `你是一位通晓老黄历（择日）的东方智慧顾问。用 80–200 字${langLabel}解释「为什么今天这个字段是这样」。
规则：
- 依据建除十二神 / 二十八宿 / 节气 / 五行 说明，并给出一句可操作的建议。
- 语气务实，讲成「趋势 / 宜忌参考」，不是命运定论。
- 禁止使用：命中注定、必然、一定、注定、宿命、must、definitely、certainly。
- 不要罗列术语表，像对朋友解释。${personalClause}
- 只输出解释正文，不要标题、不要 JSON。`

  const userPrompt = `【今日黄历事实】\n${facts}\n\n请解释「${input.field}」。`

  const explanation = await callWithFallback(c.env, systemPrompt, userPrompt, {
    isPro: input.isPro,
    maxTokens: 320,
    temperature: 0.7,
    thinkingLevel: 'MINIMAL',
    tier: 'standard',
    metricLabel: 'cycle-explain',
    locale: input.locale,
  })

  return c.json({ explanation: explanation.trim() })
})

function getLangLabel(lang: string): string {
  if (lang.startsWith('zh-Hant') || lang === 'zh-TW') return '繁體中文'
  if (lang.startsWith('zh')) return '简体中文'
  if (lang === 'ja') return '日本語'
  if (lang === 'ko') return '한국어'
  return 'English'
}
