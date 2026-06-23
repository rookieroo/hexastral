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
import { summarizeZiwei, ziweiYearCrossConfirm } from '../services/hehun/ziwei-synastry'
import type { Env } from '../types'

type AppEnv = { Bindings: Env }

export const relationshipTimelineRoutes = new Hono<AppEnv>()

/** Optional births (server-to-server only) so we can cross-confirm with 紫微. */
const birthSchema = z.object({
  solarDate: z.string().max(12),
  timeIndex: z.number().int().min(0).max(12),
  gender: z.enum(['男', '女']),
})

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
  /** Both births → 紫微 流年 cross-confirmation woven into the prose (P4). */
  personA: birthSchema.optional(),
  personB: birthSchema.optional(),
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
  // 紫微 流年 cross-confirmation (P4) — best-effort; the node stays 八字-driven, 紫微
  // only corroborates in the prose. Births arrive server-to-server (never to device).
  let ziweiNote = ''
  if (input.personA && input.personB) {
    try {
      const za = summarizeZiwei(input.personA)
      const zb = summarizeZiwei(input.personB)
      const sig = ziweiYearCrossConfirm(za, zb, input.year)
      if (sig.significant) ziweiNote = sig.note
    } catch {
      // 紫微 compute failed → degrade silently to a 八字-only explanation.
    }
  }
  if (ziweiNote) facts.push(ziweiNote)

  const factText = facts.join('\n')

  const kindClause =
    input.nodeType === '大运'
      ? `这是${input.daYunOf === 'A' ? '你' : '对方'}的一步十年大运换运，两人的相处节奏会随之调整。`
      : '这是某一年的流年，影响这一年两人相处的整体气场。'

  const ziweiClause = ziweiNote
    ? '\n- 事实中已附「紫微流年印证」：请自然点出八字与紫微「双双指向此节点」，作为可信度的加强（一句带过即可，不要堆砌术语）。'
    : ''

  const systemPrompt = `你是一位通晓八字合婚的东方智慧顾问。用 80–200 字${langLabel}解释「这个时间节点对这段关系意味着什么」。
规则：
- ${kindClause}
- 结合流年对双方日主的十神，以及与双方日支的冲（波动）/合（和顺）关系，说明这段时间关系的机遇与课题，并给出一句可操作的相处建议。${ziweiClause}
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

// ── POST /relationship-timeline/makeif-explain — 关系择时窗口深解 (Workstream B) ──
//
// Sibling of /explain, but for a forward 流月 DECISION window (make-if): "这个月对
// 推进『求婚/同居/…/自定义』这一步合不合适？". Pure DERIVED facts (lean / 用神 / 神煞),
// never raw birth → privacy D2-safe; supports a free-text `note` (custom step).
const makeifInputSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  ganZhi: z.string().max(8),
  element: z.string().max(8).optional(),
  lean: z.enum(['favorable', 'mixed', 'caution']).optional(),
  yongshen: z.string().max(8).optional(),
  isYongshen: z.boolean().optional().default(false),
  feedsYongshen: z.boolean().optional().default(false),
  harmony: z.boolean().optional().default(false),
  taohua: z.boolean().optional().default(false),
  yima: z.boolean().optional().default(false),
  shishang: z.boolean().optional().default(false),
  /** The step being weighed — a preset move label or a free-text custom note. */
  step: z.string().max(120).optional(),
  locale: z.string().default('en'),
  isPro: z.boolean().optional().default(false),
})

relationshipTimelineRoutes.post('/makeif-explain', async (c) => {
  const input = makeifInputSchema.parse(await c.req.json())
  const langLabel = getLangLabel(input.locale)
  const step = input.step?.trim() || '推进这段关系'

  const facts: string[] = [`月份：${input.year}年${input.month}月`, `干支：${input.ganZhi}`]
  if (input.element) facts.push(`五行：${input.element}`)
  if (input.yongshen) facts.push(`两人通关用神：${input.yongshen}`)
  facts.push(
    `窗口气象：${input.lean === 'favorable' ? '气顺（宜推进）' : input.lean === 'caution' ? '宜守（不宜硬推）' : '中性（取舍在人）'}`
  )
  const sig: string[] = []
  if (input.isYongshen) sig.push('流月正合用神')
  else if (input.feedsYongshen) sig.push('流月生用神（蓄势）')
  if (input.harmony) sig.push('与命盘相合（和顺）')
  if (input.taohua) sig.push('桃花动')
  if (input.yima) sig.push('驿马动')
  if (input.shishang) sig.push('食伤显')
  if (sig.length > 0) facts.push(`神煞：${sig.join('、')}`)
  facts.push(`考虑的一步：${step}`)
  const factText = facts.join('\n')

  const systemPrompt = `你是一位通晓八字合婚的东方智慧顾问。用 80–180 字${langLabel}解释「这个月对『${step}』这一步意味着什么」。
规则：
- 这是未来某个流月窗口，正在权衡「${step}」这一步；只谈这个窗口的时机适配，不预测结果、不替人做决定。
- 结合该月与两人通关用神的关系、相合 / 神煞（桃花·驿马·食伤），说明这个窗口适不适合推进这一步、要注意什么，并给一句可操作的相处 / 择时建议。
- 称呼用「你」与「对方 / 你们」。语气务实，讲成「趋势 / 参考」，决定权在你们手中，不是命运定论。
- 禁止使用：命中注定、必然、一定、注定、宿命、must、definitely、certainly。
- 不要罗列术语表，像对朋友解释。
- 只输出解释正文，不要标题、不要 JSON。`

  const userPrompt = `【关系择时窗口事实】\n${factText}\n\n请解释 ${input.year}年${input.month}月 这个窗口，对「${step}」这一步是否合适、要注意什么。`

  const explanation = await callWithFallback(c.env, systemPrompt, userPrompt, {
    isPro: input.isPro,
    maxTokens: 300,
    temperature: 0.7,
    thinkingLevel: 'MINIMAL',
    tier: 'standard',
    metricLabel: 'relationship-makeif-explain',
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
