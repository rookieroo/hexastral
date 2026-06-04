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
    maxTokens: 512,
    temperature: 0.7,
    noThink: true,
    tier: 'standard',
    metricLabel: 'cycle-explain',
    locale: input.locale,
  })

  return c.json({ explanation: explanation.trim() })
})

// ── POST /explain-batch — all of today's 宜忌/冲 fields in ONE call ───────────
//
// The single-field route above is kept for back-compat, but the API now batches:
// on the first tap of a day it asks for EVERY field at once and caches each, so
// later taps are KV hits (no per-tap LLM). Returns a {field → explanation} map.

const batchSchema = z.object({
  date: z.string().min(1),
  fields: z.array(z.string().min(1).max(40)).min(1).max(40),
  ganZhi: z.string().max(8).optional(),
  dayOfficer: z.string().max(4).optional(),
  mansion: z.string().max(8).optional(),
  dayMaster: z.string().max(2).optional(),
  relation: z.string().max(8).optional(),
  locale: z.string().default('en'),
  isPro: z.boolean().optional().default(false),
})

/** Extract the {field: explanation} object from a (possibly fenced) LLM reply. */
function parseBatchJson(raw: string, fields: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  try {
    let s = raw.trim()
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fence?.[1]) s = fence[1].trim()
    const start = s.indexOf('{')
    const end = s.lastIndexOf('}')
    if (start >= 0 && end > start) s = s.slice(start, end + 1)
    const obj = JSON.parse(s) as Record<string, unknown>
    for (const f of fields) {
      const v = obj[f]
      if (typeof v === 'string' && v.trim()) out[f] = v.trim()
    }
  } catch {
    // partial/empty — the API caller templates the misses, never blank.
  }
  return out
}

cycleRoutes.post('/explain-batch', async (c) => {
  const input = batchSchema.parse(await c.req.json())
  const langLabel = getLangLabel(input.locale)

  const facts = [
    `日期：${input.date}`,
    input.ganZhi ? `干支：${input.ganZhi}` : '',
    input.dayOfficer ? `建除值神：${input.dayOfficer}日` : '',
    input.mansion ? `二十八宿：${input.mansion}宿` : '',
    input.dayMaster ? `用户日主：${input.dayMaster}` : '',
    input.relation ? `日主×今日关系：${input.relation}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const personalClause = input.dayMaster
    ? '\n- 每个字段可结合用户日主补一句「对你而言」的角度（仅据五行生克，不臆测完整八字）。'
    : ''

  const systemPrompt = `你是一位通晓老黄历（择日）的东方智慧顾问。为今天列出的每个宜忌/冲字段各写 60–140 字${langLabel}解释。
规则：
- 依据建除十二神 / 二十八宿 / 节气 / 五行 说明，并给出一句可操作的建议。
- 语气务实，讲成「趋势 / 宜忌参考」，不是命运定论。
- 禁止使用：命中注定、必然、一定、注定、宿命、must、definitely、certainly。${personalClause}
- 严格只输出一个 JSON 对象：键为给定字段「原文」，值为该字段的解释正文。不要标题、不要 Markdown、不要代码块、不要任何多余文字。`

  const userPrompt = `【今日黄历事实】\n${facts}\n\n字段列表（共 ${input.fields.length} 个）：\n${input.fields
    .map((f) => `- ${f}`)
    .join('\n')}\n\n请为每个字段各写一段，按 JSON 返回：{"字段原文": "解释", ...}`

  const maxTokens = Math.min(3072, input.fields.length * 200 + 768)
  const raw = await callWithFallback(c.env, systemPrompt, userPrompt, {
    isPro: input.isPro,
    maxTokens,
    temperature: 0.6,
    noThink: true,
    tier: 'standard',
    metricLabel: 'cycle-explain-batch',
    locale: input.locale,
  })

  return c.json({ explanations: parseBatchJson(raw, input.fields) })
})

// ── POST /makeif-narrate — the "假如你..." stories for the make-if branches ────
//
// make-if (人生分支) Phase 3: the branch STRUCTURE is deterministic + client-side;
// this writes the per-branch second-person narrative in ONE call (same batch
// pattern as /explain-batch). The branches are explicitly fictional — a Pro
// teaser — so narrative is fine here (unlike the deterministic 宜忌).

const narrateSchema = z.object({
  dayMaster: z.string().max(2),
  dayPillar: z.string().max(8).optional(),
  yearPillar: z.string().max(8).optional(),
  gender: z.enum(['M', 'F']).optional(),
  currentAge: z.number().int().min(0).max(120).optional(),
  locale: z.string().default('en'),
  isPro: z.boolean().optional().default(false),
  branches: z
    .array(
      z.object({
        id: z.string().max(16),
        label: z.string().max(40),
        divergeAtAge: z.number().int().min(0).max(120),
        mergeAtAge: z.number().int().min(0).max(120).nullable(),
        /** Whether the fork age is in the user's past (a reflection) vs future. */
        isPast: z.boolean().optional(),
        /** The real 大运 干支 active at the fork age — anchors the reading. */
        realPillar: z.string().max(8).optional(),
      })
    )
    .min(1)
    .max(5),
})

cycleRoutes.post('/makeif-narrate', async (c) => {
  const input = narrateSchema.parse(await c.req.json())
  const langLabel = getLangLabel(input.locale)

  const ctx = [
    `日主：${input.dayMaster}`,
    input.dayPillar ? `日柱：${input.dayPillar}` : '',
    input.yearPillar ? `年柱：${input.yearPillar}` : '',
    input.gender ? `性别：${input.gender === 'M' ? '男' : '女'}` : '',
    input.currentAge != null ? `当前年龄：约 ${input.currentAge} 岁` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const branchLines = input.branches
    .map((b) => {
      const merge =
        b.mergeAtAge != null ? `约 ${b.mergeAtAge} 岁回归本命主线` : '一路走到终点、不回归'
      const when = b.isPast ? '已过去' : '现在/未来'
      const pillar = b.realPillar ? `真实大运 ${b.realPillar}` : ''
      return `- ${b.id}｜${b.label}｜约 ${b.divergeAtAge} 岁分岔（${when}·${pillar}），${merge}`
    })
    .join('\n')

  const systemPrompt = `你是一位通晓八字的命理叙事师。为用户的每一条「假如」人生分支写 70–140 字${langLabel}第二人称叙事（以「假如你…」开头），并锚定在该节点真实的大运能量上。
规则：
- 每条分支会标注它发生在「已过去」还是「现在/未来」，以及当时真实的大运干支：
  · 已过去：先用一句点出这条「假如」与你真实人生的差异，再写它可能的走向。
  · 现在/未来：写这条选择可能带来的人生走向，并务必各给一句「做这个决定要注意的事项」与「潜在风险」。
- 依据该大运的五行/十神能量来写，讲成「趋势·参考」，不是命运定论，也不是对未来的断言或保证。
- 禁止使用：命中注定、必然、一定、注定、宿命、must、definitely、certainly。
- 严格只输出一个 JSON 对象：键为分支 id、值为该分支叙事正文。不要标题、不要 Markdown、不要代码块。`

  const userPrompt = `【用户八字】\n${ctx}\n\n【分支】\n${branchLines}\n\n为每条分支各写一段，按 JSON 返回：{"分支id": "叙事", ...}`

  const ids = input.branches.map((b) => b.id)
  const maxTokens = Math.min(3072, ids.length * 300 + 768)
  const raw = await callWithFallback(c.env, systemPrompt, userPrompt, {
    isPro: input.isPro,
    maxTokens,
    temperature: 0.8,
    noThink: true,
    tier: 'standard',
    metricLabel: 'cycle-makeif-narrate',
    locale: input.locale,
  })

  return c.json({ narratives: parseBatchJson(raw, ids) })
})

function getLangLabel(lang: string): string {
  if (lang.startsWith('zh-Hant') || lang === 'zh-TW') return '繁體中文'
  if (lang.startsWith('zh')) return '简体中文'
  if (lang === 'ja') return '日本語'
  if (lang === 'ko') return '한국어'
  return 'English'
}
