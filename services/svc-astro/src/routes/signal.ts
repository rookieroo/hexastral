/**
 * Daily signal generation — POST /signal/generate
 *
 * Inputs (from `apps/hexastral-api/src/routes/signal.ts`):
 *   - chartHash:        natal chart fingerprint (audit only here)
 *   - date:             user's local-tz day, YYYY-MM-DD
 *   - locale:           target output locale
 *   - explanationMode:  'plain' (Phase 4 default)
 *   - user:             static natal traits (dayMaster, strength, favorable/unfavorable
 *                       elements, ziwei 命宫主星, year branch)
 *   - almanac:          optional deterministic scaffold from `daily_almanac` row.
 *                       When present, headline / lucky coordinates anchor here so
 *                       the in-app card matches the morning push.
 *   - isOnboardingReveal?: boolean — first-signal copy gets a richer "reveal" tone.
 *
 * Output: SignalOutput (see schemas/signal-output.ts) — strict JSON.
 *
 * Cost: ~$0.005/call. `isPro` selects router tier; hexastral-api sends `isPro: false`
 * for this route so Free+Pro share the Flash-tier chain (Pro value-add is client UI).
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import { callWithFallback } from '../lib/ai-router'
import { extractJson } from '../lib/extract-json'
import { signalOutputSchema, toJsonSchema } from '../schemas'
import type { Env } from '../types'

type AppEnv = { Bindings: Env }

export const signalRoutes = new Hono<AppEnv>()

const userSchema = z.object({
  dayMasterStem: z.string().nullable().optional(),
  dayMasterStrength: z.string().nullable().optional(),
  favorableElement: z.string().nullable().optional(),
  unfavorableElement: z.string().nullable().optional(),
  ziweiMingPalaceStar: z.string().nullable().optional(),
  birthBranch: z.string().nullable().optional(),
})

const almanacSchema = z
  .object({
    relation: z.string().nullable().optional(),
    energyLevel: z.string().nullable().optional(),
    headline: z.string().nullable().optional(),
    todayLens: z.string().nullable().optional(),
    watchFor: z.string().nullable().optional(),
    luckyHour: z.string().nullable().optional(),
    luckyDirection: z.string().nullable().optional(),
    luckyColor: z.string().nullable().optional(),
  })
  .nullable()
  .optional()

const inputSchema = z.object({
  chartHash: z.string().min(1),
  date: z.string().min(1),
  locale: z.string().default('en'),
  explanationMode: z.enum(['plain', 'classical']).default('plain'),
  user: userSchema,
  almanac: almanacSchema,
  isPro: z.boolean().optional().default(false),
  isOnboardingReveal: z.boolean().optional().default(false),
})

signalRoutes.post('/generate', async (c) => {
  const body = await c.req.json()
  const input = inputSchema.parse(body)

  const langLabel = getLangLabel(input.locale)

  const userFacts = [
    input.user.dayMasterStem ? `日主：${input.user.dayMasterStem}` : '',
    input.user.dayMasterStrength ? `日主强弱：${input.user.dayMasterStrength}` : '',
    input.user.favorableElement ? `喜用五行：${input.user.favorableElement}` : '',
    input.user.unfavorableElement ? `忌神五行：${input.user.unfavorableElement}` : '',
    input.user.ziweiMingPalaceStar ? `紫微命宫主星：${input.user.ziweiMingPalaceStar}` : '',
    input.user.birthBranch ? `出生年支：${input.user.birthBranch}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const almanacFacts = input.almanac
    ? [
        `日期：${input.date}`,
        input.almanac.relation ? `日主×今日干支关系：${input.almanac.relation}` : '',
        input.almanac.energyLevel ? `能量等级：${input.almanac.energyLevel}` : '',
        input.almanac.headline ? `Almanac headline (locale-ready)：${input.almanac.headline}` : '',
        input.almanac.todayLens ? `Almanac todayLens：${input.almanac.todayLens}` : '',
        input.almanac.watchFor ? `Almanac watchFor：${input.almanac.watchFor}` : '',
        input.almanac.luckyHour ? `吉时：${input.almanac.luckyHour}` : '',
        input.almanac.luckyDirection ? `吉方：${input.almanac.luckyDirection}` : '',
        input.almanac.luckyColor ? `吉色：${input.almanac.luckyColor}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    : `日期：${input.date}（无 Almanac scaffold — 自由生成 lucky coordinates）`

  const revealClause = input.isOnboardingReveal
    ? '\n这是用户的首次每日信号，语气可略带"揭示感"，让用户感到被命盘"看见"，但不要使用决定论措辞。'
    : ''

  const systemPrompt = `你是一位精通八字的东方智慧顾问，正在为用户撰写**今日信号卡**。
基于用户的命格静态特征 + 今日干支关系（已由 Almanac 引擎给出），生成一段个性化、可操作、不流于俗套的内容。

CRITICAL OUTPUT RULES:
1. headline: ≤16 字（中文）/ ≤8 词（其他语言），新闻标题风格，**必须**呼应今日 energyLevel 与日主关系。如果 Almanac 已提供 headline，可直接采用或微调更贴用户。
2. energy.level: 必须是 'rising' | 'steady' | 'productive' | 'guarded' | 'volatile' 之一。优先沿用 Almanac energyLevel。
3. energy.wuxing: 必须是 'wood' | 'fire' | 'earth' | 'metal' | 'water' 之一，反映今日主导五行（结合用户喜忌判断）。
4. todayLens: 1–2 句，60–100 字（中文）/ 35–55 词（其他语言）。**必须引用用户的日主或命宫主星**，给出今日的策略框架。
5. watchFor: 1 句，25–40 字（中文）/ 15–25 词（其他语言）。点出今日最易踩的具体陷阱（结合忌神五行 + 今日关系）。
6. lucky.hour / direction / color: 优先采用 Almanac 提供的值；若无则按今日干支推导。direction 用单字（东/南/西/北/中）。
7. lucky.advice: 1 句，20–35 字（中文）/ 12–22 词（其他语言）。一个**具体可执行**的微行动，不要泛泛而谈。
8. goldenLine: 1–2 句"今日金句"。30–50 字（中文）/ 20–35 词（其他语言）。**必须**浓缩 todayLens 的策略核心，可独立成立、有画面感、能让用户截图分享；不可与 headline 雷同，不可使用占星术语。**必填字段**。
9. reasoningChain: 1 句，30–50 字（中文）/ 20–35 词（其他语言）。用通俗语言桥接"用户日主 → 今日干支 → 为什么是 ${'this'} 个能量等级"，不暴露占星术语。
10. 禁止使用：命中注定、必然、一定会、肯定、绝对、注定、宿命、avoid、must、definitely、certainly。
11. 全部用 ${langLabel} 输出。命盘事实块保留中文术语原貌。${revealClause}`

  const userPrompt = `【用户静态命格】
${userFacts || '（无静态命格 — 仅按今日干支生成通用信号）'}

【今日 Almanac 锚点】
${almanacFacts}

请基于以上事实生成 SignalOutput JSON。`

  const raw = await callWithFallback(c.env, systemPrompt, userPrompt, {
    isPro: input.isPro,
    maxTokens: 900,
    temperature: 0.8,
    thinkingLevel: 'MINIMAL',
    tier: 'standard',
    metricLabel: 'signal-generate',
    locale: input.locale,
    jsonMode: true,
    responseSchema: toJsonSchema(signalOutputSchema),
  })

  const jsonStr = extractJson(raw)
  if (!jsonStr) {
    console.error('[signal] failed to extract JSON', raw.slice(0, 500))
    throw new HTTPException(500, { message: 'Failed to parse signal response' })
  }

  let parsedRaw: unknown
  try {
    parsedRaw = JSON.parse(jsonStr)
  } catch (err) {
    console.error('[signal] JSON.parse failed', err, jsonStr.slice(0, 500))
    throw new HTTPException(500, { message: 'Invalid signal response structure' })
  }

  const result = signalOutputSchema.safeParse(parsedRaw)
  if (!result.success) {
    console.error('[signal] schema validation failed', result.error.issues, jsonStr.slice(0, 500))
    throw new HTTPException(500, { message: 'Invalid signal response shape' })
  }

  return c.json(result.data)
})

function getLangLabel(lang: string): string {
  if (lang.startsWith('zh-Hant') || lang === 'zh-TW') return '繁體中文'
  if (lang.startsWith('zh')) return '简体中文'
  if (lang === 'en') return 'English'
  if (lang === 'ko') return '한국어'
  if (lang === 'ja') return '日本語'
  if (lang === 'de') return 'Deutsch'
  if (lang === 'es') return 'Español'
  if (lang === 'vi') return 'Tiếng Việt'
  if (lang === 'th') return 'ภาษาไทย'
  return 'English'
}
