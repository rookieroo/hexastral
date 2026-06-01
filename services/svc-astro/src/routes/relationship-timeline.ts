/**
 * 关系命运时间轴节点 deep reading — POST /relationship-timeline/explain (Yuán, B-yuan.3).
 *
 * Dual-perspective sibling of /timeline/explain: explains ONE relationship timeline
 * node (流年 关系互动 / 任一方大运换运) for a couple, weaving in the 流年-vs-双方日主
 * 十神 + 与双方日支的 冲(波动)/合(和顺). Deterministic node + summary come from
 * `astro-core/relationship-timeline.ts` (B-yuan.1); this is the ONLY LLM layer.
 *
 * Cost is guarded UPSTREAM by hexastral-api's K.4 guard; this route just generates.
 */

import { Hono } from 'hono'
import { z } from 'zod/v4'
import { callWithFallback } from '../lib/ai-router'
import type { Env } from '../types'

type AppEnv = { Bindings: Env }

export const relationshipTimelineRoutes = new Hono<AppEnv>()

const inputSchema = z.object({
  nodeType: z.enum(['大运', '流年']),
  year: z.number().int(),
  ganZhi: z.string().max(8),
  /** 大运 节点: 谁换运 (A=你 / B=对方). */
  daYunOf: z.enum(['A', 'B']).optional(),
  /** 流年 天干对 你(A) / 对方(B) 日主的十神. */
  shiShenA: z.string().max(4).optional(),
  shiShenB: z.string().max(4).optional(),
  clashA: z.boolean().optional().default(false),
  clashB: z.boolean().optional().default(false),
  harmonyA: z.boolean().optional().default(false),
  harmonyB: z.boolean().optional().default(false),
  significance: z.string().max(16).optional(),
  summary: z.string().max(200).optional(),
  locale: z.string().default('en'),
  isPro: z.boolean().optional().default(false),
})

relationshipTimelineRoutes.post('/explain', async (c) => {
  const input = inputSchema.parse(await c.req.json())
  const langLabel = getLangLabel(input.locale)

  const facts: string[] = [
    `节点类型：${input.nodeType}`,
    `年份：${input.year}`,
    `干支：${input.ganZhi}`,
  ]
  if (input.nodeType === '大运') {
    facts.push(`换运方：${input.daYunOf === 'A' ? '你' : '对方'}`)
  } else {
    if (input.shiShenA) facts.push(`流年对你的十神：${input.shiShenA}`)
    if (input.shiShenB) facts.push(`流年对对方的十神：${input.shiShenB}`)
    const rel: string[] = []
    if (input.clashA) rel.push('冲你日支')
    if (input.clashB) rel.push('冲对方日支')
    if (input.harmonyA) rel.push('合你日支')
    if (input.harmonyB) rel.push('合对方日支')
    if (rel.length > 0) facts.push(`流年与双方：${rel.join('、')}`)
  }
  const factText = facts.join('\n')

  const kindClause =
    input.nodeType === '大运'
      ? `这是${input.daYunOf === 'A' ? '你' : '对方'}的一步十年大运换运，两人的相处节奏会随之调整。`
      : '这是某一年的流年，影响这一年两人相处的整体气场。'

  const systemPrompt = `你是一位通晓八字合婚的东方智慧顾问。用 80–200 字${langLabel}解释「这个时间节点对这段关系意味着什么」。
规则：
- ${kindClause}
- 结合流年对双方日主的十神，以及与双方日支的冲（波动）/合（和顺）关系，说明这段时间关系的机遇与课题，并给出一句可操作的相处建议。
- 称呼用「你」与「对方」。语气务实，讲成「趋势 / 参考」，不是命运定论。
- 禁止使用：命中注定、必然、一定、注定、宿命、must、definitely、certainly。
- 不要罗列术语表，像对朋友解释。
- 只输出解释正文，不要标题、不要 JSON。`

  const userPrompt = `【关系时间节点事实】\n${factText}\n\n请解释 ${input.year} 年这个「${input.nodeType}」节点对这段关系的意义。`

  const explanation = await callWithFallback(c.env, systemPrompt, userPrompt, {
    isPro: input.isPro,
    maxTokens: 320,
    temperature: 0.7,
    thinkingLevel: 'MINIMAL',
    tier: 'standard',
    metricLabel: 'relationship-timeline-explain',
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
