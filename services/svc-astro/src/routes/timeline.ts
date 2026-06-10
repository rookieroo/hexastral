/**
 * 命运时间轴节点 deep reading — POST /timeline/explain.
 *
 * A short plain-text explanation of ONE timeline node, locale-aware, framed as
 * REFLECTION not prediction (Terms §3 / 4.3(b)). Two callers share this route:
 *   • fate/Yuán (B-fate.3): 大运 换运 / 流年, woven through the 十神-vs-日主 angle.
 *   • auspice 人生时间线 (P1, docs/timeline-deep-read-plan.md): + 流月, woven
 *     through the 对你而言 overlay (element/fit/reasons — the SAME engine as the
 *     daily 黄历). Persisted (落库) UPSTREAM in hexastral-api so re-views + the
 *     cron push reuse one generation.
 * The deterministic node + summary are computed in `astro-core`; this is the ONLY
 * LLM layer on top. DRAFT — prompt wording + the reason→flag mapping want review.
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

// Superset schema — serves BOTH callers without breaking either:
//   • fate (/api/timeline/explain): nodeType 大运|流年 + shiShen/clashesDayBranch/significance
//   • auspice (/api/auspice/timeline/explain): + 流月, + the 对你而言 overlay (element/fit/reasons)
// Every caller-specific field is optional; the prompt folds in whatever is present.
const inputSchema = z.object({
  nodeType: z.enum(['大运', '流年', '流月']),
  year: z.number().int(),
  /** 1-12 for 流月; 0/absent for 流年/大运. */
  month: z.number().int().min(0).max(12).optional().default(0),
  ganZhi: z.string().max(8),
  /** 该节点天干对日主的十神 (fate caller), e.g. "正官" / "七杀". */
  shiShen: z.string().max(4).optional(),
  /** 节点地支是否冲日支(本命) (fate caller). */
  clashesDayBranch: z.boolean().optional().default(false),
  significance: z.string().max(16).optional(),
  /** astro-core 生成的确定性一句话(作为兜底/上下文). */
  summary: z.string().max(200).optional(),
  /** 本节点五行 + 对你而言 verdict + reason codes (auspice caller — the same overlay as the daily 黄历). */
  element: z.string().max(2).optional(),
  fit: z.string().max(2).optional(),
  reasons: z.array(z.string().max(40)).max(12).optional(),
  locale: z.string().default('en'),
  isPro: z.boolean().optional().default(false),
})

timelineRoutes.post('/explain', async (c) => {
  const input = inputSchema.parse(await c.req.json())
  const langLabel = getLangLabel(input.locale)

  // 对你而言 reason codes → short human flags for the prompt (auspice caller).
  const reasonNote = (input.reasons ?? [])
    .map((r) =>
      r === 'favorable_element_present'
        ? '用神得力'
        : r === 'unfavorable_element_present'
          ? '忌神当值'
          : r === 'personal_clash'
            ? '与本命相冲'
            : ''
    )
    .filter(Boolean)
    .join('、')

  const facts = [
    `节点类型：${input.nodeType}`,
    input.nodeType === '流月' && input.month
      ? `年月：${input.year}年${input.month}月`
      : `年份：${input.year}`,
    `干支：${input.ganZhi}`,
    input.shiShen ? `十神（对日主）：${input.shiShen}` : '',
    input.element ? `本节点五行：${input.element}` : '',
    input.fit ? `对你而言：${input.fit}` : '',
    reasonNote ? `要点：${reasonNote}` : '',
    input.clashesDayBranch ? '该节点地支冲日支（本命），主变动' : '',
    input.significance ? `显著度：${input.significance}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const kindClause =
    input.nodeType === '大运'
      ? '这是一步十年大运的换运节点，属人生阶段转换，影响深远。'
      : input.nodeType === '流月'
        ? '这是某一个月的流月，影响该月的细部节奏与时机。'
        : '这是某一年的流年，影响该年的整体气运。'

  // 流月 is the finest grain → a tighter read.
  const lengthHint = input.nodeType === '流月' ? '60–140 字' : '80–200 字'
  const relationClause = [
    input.shiShen ? `十神 ${input.shiShen}` : '',
    input.fit ? `对你而言为「${input.fit}」` : '',
    input.element ? `五行 ${input.element}` : '',
  ]
    .filter(Boolean)
    .join('、')

  const systemPrompt = `你是一位通晓八字大运流年流月的东方智慧顾问。用 ${lengthHint}${langLabel}解释「这个时间节点对命主意味着什么」。
规则：
- ${kindClause}
- 结合本节点与命主日主的关系（${relationClause || '生克'}）说明此节点的机遇与挑战，并给出一句可操作、用于「省思」的建议。
- 这是反思与参考，不是预测、不是命运定论，也不替命主做决定。
- 语气务实，讲成「趋势 / 参考」。
- 禁止使用：命中注定、必然、一定、注定、宿命、预测、must、definitely、certainly、predict。
- 不要罗列术语表，像对朋友解释。
- 只输出解释正文，不要标题、不要 JSON。`

  const userPrompt = `【时间节点事实】\n${facts}\n\n请解释这个「${input.nodeType}」节点对命主的意义（反思视角，非预测）。`

  const explanation = await callWithFallback(c.env, systemPrompt, userPrompt, {
    isPro: input.isPro,
    maxTokens: input.nodeType === '流月' ? 220 : 320,
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
