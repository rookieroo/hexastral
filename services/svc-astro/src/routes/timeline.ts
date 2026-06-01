/**
 * 命运时间轴节点 deep reading — POST /timeline/explain (fate/Yuán timeline, B-fate.3).
 *
 * A short (80–200 char) plain-text explanation of ONE timeline node (大运 换运 / 流年)
 * for a chart, locale-aware, weaving in the node's 十神-vs-日主 angle. Mirrors
 * `/cycle/explain`: the deterministic node + summary are computed in `astro-core`
 * (`timeline.ts`); this is the ONLY LLM layer on top.
 *
 * Cost is guarded UPSTREAM by hexastral-api's K.4 LLM guard (rate / budget / tier);
 * this route just generates. `isPro` selects the model tier inside callWithFallback.
 */

import { Hono } from 'hono'
import { z } from 'zod/v4'
import { callWithFallback } from '../lib/ai-router'
import type { Env } from '../types'

type AppEnv = { Bindings: Env }

export const timelineRoutes = new Hono<AppEnv>()

const inputSchema = z.object({
  nodeType: z.enum(['大运', '流年']),
  year: z.number().int(),
  ganZhi: z.string().max(8),
  /** 该节点天干对日主的十神, e.g. "正官" / "七杀". */
  shiShen: z.string().max(4),
  /** 节点地支是否冲日支(本命). */
  clashesDayBranch: z.boolean().optional().default(false),
  significance: z.string().max(16).optional(),
  /** astro-core 生成的确定性一句话(作为兜底/上下文). */
  summary: z.string().max(200).optional(),
  locale: z.string().default('en'),
  isPro: z.boolean().optional().default(false),
})

timelineRoutes.post('/explain', async (c) => {
  const input = inputSchema.parse(await c.req.json())
  const langLabel = getLangLabel(input.locale)

  const facts = [
    `节点类型：${input.nodeType}`,
    `年份：${input.year}`,
    `干支：${input.ganZhi}`,
    `十神（对日主）：${input.shiShen}`,
    input.clashesDayBranch ? '该节点地支冲日支（本命），主变动' : '',
    input.significance ? `显著度：${input.significance}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const kindClause =
    input.nodeType === '大运'
      ? '这是一步十年大运的换运节点，属人生阶段转换，影响深远。'
      : '这是某一年的流年，影响该年的整体气运。'

  const systemPrompt = `你是一位通晓八字大运流年的东方智慧顾问。用 80–200 字${langLabel}解释「这个时间节点对命主意味着什么」。
规则：
- ${kindClause}
- 结合十神（${input.shiShen}）与日主的生克关系说明此节点的机遇与挑战，并给出一句可操作的建议。
- 语气务实，讲成「趋势 / 参考」，不是命运定论。
- 禁止使用：命中注定、必然、一定、注定、宿命、must、definitely、certainly。
- 不要罗列术语表，像对朋友解释。
- 只输出解释正文，不要标题、不要 JSON。`

  const userPrompt = `【时间节点事实】\n${facts}\n\n请解释 ${input.year} 年这个「${input.nodeType}」节点对命主的意义。`

  const explanation = await callWithFallback(c.env, systemPrompt, userPrompt, {
    isPro: input.isPro,
    maxTokens: 320,
    temperature: 0.7,
    thinkingLevel: 'MINIMAL',
    tier: 'standard',
    metricLabel: 'timeline-explain',
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
