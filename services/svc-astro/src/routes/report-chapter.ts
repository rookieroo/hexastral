/**
 * Report chapter generation — POST /report/chapter
 *
 * Inputs (from `apps/hexastral-api/src/routes/report.ts`):
 *   - slug:             chapter identifier (one of CHAPTER_PROMPT_BUILDERS keys)
 *   - chartHash:        natal chart fingerprint (audit only here)
 *   - contextHash:      full hash incl. liunian/dayun/perspectiveSeed (audit only)
 *   - locale:           target output locale
 *   - explanationMode:  'plain' | 'classical' (Phase 4 default 'plain')
 *   - perspectiveSeed?: optional re-roll seed; injected into prompt for variation
 *   - user:             static natal traits (same shape as signal route)
 *   - timeContext:      { liunian, dayun } | null (null for static chapters)
 *
 * Output: ReportChapterOutput (see schemas/report-chapter-output.ts) — strict JSON.
 *
 * Model dispatch: the API layer chooses Pro vs Flash via CHAPTER_MODEL_REGISTRY
 * and forwards `isPro` here so the AI router selects the right model tier.
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import { callWithFallback } from '../lib/ai-router'
import { buildRichFacts } from '../lib/build-rich-facts'
import { extractJson } from '../lib/extract-json'
import { buildLanguageBlock, buildLanguageReminder } from '../lib/i18n-prompt'
import { auditGeneratedOutput } from '../lib/output-audit'
import { buildEnhancedGuardrails } from '../lib/prompts/guardrails'
import { getSystemRole } from '../lib/prompts/system-role'
import {
  isThinReportGap,
  reportChapterGaps,
  reportChapterProseLength,
} from '../lib/report-chapter-gaps'
import { buildChapterFacts, CHAPTER_PROMPT_BUILDERS } from '../prompts/chapters'
import {
  ch4TimelineOutputSchema,
  ch5HiddenOutputSchema,
  ch6ActionOutputSchema,
  monthlyDepthOutputSchema,
  reportChapterOutputSchema,
  toJsonSchema,
} from '../schemas'
import type { Env } from '../types'

type AppEnv = { Bindings: Env }

export const reportChapterRoutes = new Hono<AppEnv>()

const userSchema = z.object({
  dayMasterStem: z.string().nullable().optional(),
  dayMasterStrength: z.string().nullable().optional(),
  favorableElement: z.string().nullable().optional(),
  unfavorableElement: z.string().nullable().optional(),
  ziweiMingPalaceStar: z.string().nullable().optional(),
  birthBranch: z.string().nullable().optional(),
})

const timeContextSchema = z
  .object({
    liunian: z.string().nullable().optional(),
    dayun: z.string().nullable().optional(),
  })
  .nullable()

/**
 * Optional raw birth inputs. When supplied, the route builds the rich
 * dual-chart facts block (Ba Zi pillars + 紫微 palaces + 大运/流年) so the
 * chapter prompt can quote concrete details. Falls back to the thin
 * `user`/`timeContext` blocks when omitted or when chart computation fails.
 */
const birthSchema = z
  .object({
    solarDate: z.string().min(1),
    timeIndex: z.int().min(0).max(12),
    clockMinutes: z.number().int().min(0).max(1439).optional(),
    calibrate: z.boolean().optional(),
    gender: z.enum(['男', '女']),
    longitude: z.number().optional(),
    latitude: z.number().optional(),
    timezoneId: z.string().optional(),
    city: z.string().optional(),
  })
  .optional()

const slugEnum = z.enum([
  'ch1_personality',
  'ch2_dimensions_static',
  'ch2_dimensions_dynamic',
  'ch3_stellar',
  'ch4_timeline',
  'ch5_hidden',
  'ch6_action',
])
const stylePresetEnum = z.enum(['direct', 'coach', 'gentle'])

const inputSchema = z.object({
  slug: slugEnum,
  chartHash: z.string().min(1),
  contextHash: z.string().min(1),
  locale: z.string().default('en'),
  explanationMode: z.enum(['plain', 'classical']).default('plain'),
  perspectiveSeed: z.string().optional(),
  stylePreset: stylePresetEnum.optional(),
  styleSeed: z.string().max(64).optional(),
  user: userSchema,
  timeContext: timeContextSchema,
  birth: birthSchema,
  isPro: z.boolean().optional().default(false),
})

const chapterOutputSchemaMap = {
  ch1_personality: reportChapterOutputSchema,
  ch2_dimensions_static: reportChapterOutputSchema,
  ch2_dimensions_dynamic: reportChapterOutputSchema,
  ch3_stellar: reportChapterOutputSchema,
  ch4_timeline: ch4TimelineOutputSchema,
  ch5_hidden: ch5HiddenOutputSchema,
  ch6_action: ch6ActionOutputSchema,
} as const

const chapterSchemaHints: Record<z.infer<typeof slugEnum>, string> = {
  ch1_personality:
    'Output schema: ReportChapterOutput = { title, summary, sections, highlights, watchOuts }',
  ch2_dimensions_static:
    'Output schema: ReportChapterOutput = { title, summary, sections, highlights, watchOuts }',
  ch2_dimensions_dynamic:
    'Output schema: ReportChapterOutput = { title, summary, sections, highlights, watchOuts }',
  ch3_stellar:
    'Output schema: ReportChapterOutput = { title, summary, sections, highlights, watchOuts }',
  ch4_timeline:
    'Output schema: Ch4TimelineOutput = ReportChapterOutput + { currentDayunOverview, yearlyRhythm[{ period, theme, intensity(low|medium|high) }], decisionWindows[{ timeframe, domain, description }], oneThingToFocus }',
  ch5_hidden:
    'Output schema: Ch5HiddenOutput = ReportChapterOutput + { tensionPoints[{ source, sourceType(huaJi|shenSha|xingChong|fiveElement|other), impactDomain, mechanism, currentlyActive }], dormantPattern }',
  ch6_action:
    'Output schema: Ch6ActionOutput = ReportChapterOutput + { immediateAction{ description, timeframe(today|thisWeek) }, thirtyDayFocus[{ domain, action, rationale }], ninetyDayDirection{ domain, description }, delayItem{ description, reason } }',
}

reportChapterRoutes.post('/chapter', async (c) => {
  const body = await c.req.json()
  const input = inputSchema.parse(body)

  const langLabel = getLangLabel(input.locale)
  const builder = CHAPTER_PROMPT_BUILDERS[input.slug]
  const outputSchema = chapterOutputSchemaMap[input.slug]

  // When birth inputs are present, build the rich dual-chart facts block.
  // This is the primary fix for the `[具体X]` placeholder leak: prompts like
  // ch3_stellar ask the LLM for full chart interpretation, so they need the
  // full chart in their facts block — not just `ziweiMingPalaceStar`.
  const richFacts = input.birth
    ? buildRichFacts({
        solarDate: input.birth.solarDate,
        timeIndex: input.birth.timeIndex,
        clockMinutes: input.birth.clockMinutes,
        calibrate: input.birth.calibrate,
        gender: input.birth.gender,
        longitude: input.birth.longitude,
        latitude: input.birth.latitude,
        timezoneId: input.birth.timezoneId,
        city: input.birth.city,
        userId: `report-chapter:${input.chartHash}`,
        language: input.locale,
      })
    : null

  const ctx = {
    user: input.user,
    timeContext: input.timeContext ?? null,
    perspectiveSeed: input.perspectiveSeed,
    richFacts: richFacts ?? undefined,
  }

  // Language enforcement — was MISSING here (unlike fate/report + hehun), so the
  // personal-report chapters drifted (whole chapters in Chinese under en, raw 命理
  // terms glued into English prose with no pinyin/gloss). The shared block makes the
  // model output ONLY in the target language and render 命理 terms as「term (pinyin,
  // gloss)」; the terse reminder at the END of the user prompt stops a parallel
  // chapter call drifting back to Chinese.
  const systemPrompt = `${builder(ctx, langLabel)}\n${buildEnhancedGuardrails('观照自身，选边直言，但不作命运断言', input.locale)}\n${buildLanguageBlock(input.locale, 'fate')}`
  const factsBlock = buildChapterFacts(ctx)
  const perspectiveClause = input.perspectiveSeed
    ? `\n\n【视角种子】${input.perspectiveSeed} — 请以略微不同的切入点重写本章，保留事实与结论的一致性，但调整叙事重心。`
    : ''
  const stylePresetClause = input.stylePreset
    ? `\n\n【语气预设】${getStylePresetInstruction(input.stylePreset)}`
    : ''
  const styleSeedClause = input.styleSeed
    ? `\n\n【语气补充】${input.styleSeed} — 在不改变命盘事实的前提下，按该风格组织表达。`
    : ''

  const userPrompt = `${factsBlock}${perspectiveClause}${stylePresetClause}${styleSeedClause}\n\n${chapterSchemaHints[input.slug]}\n请基于以上事实生成严格 JSON，禁止输出额外字段。${buildLanguageReminder(input.locale)}`

  const timeBoundSlugs = new Set(['ch4_timeline', 'ch5_hidden', 'ch6_action'])

  type Parsed = z.infer<typeof outputSchema>
  const asRecord = (p: Parsed): Record<string, unknown> => p as unknown as Record<string, unknown>

  // One generation attempt: call → extract → parse → schema-validate. Returns
  // null on any failure (caller decides whether to re-roll). `temperature` lets
  // the retry steady the shape; `extraUser` carries the structure/deepen nudge.
  const genOnce = async (
    label: string,
    temperature: number,
    extraUser: string
  ): Promise<Parsed | null> => {
    const raw = await callWithFallback(c.env, systemPrompt, userPrompt + extraUser, {
      isPro: input.isPro,
      preferFlash: timeBoundSlugs.has(input.slug),
      // Headroom for 4–5 developed sections + the extended ch4/ch6 fields.
      maxTokens: 4096,
      temperature,
      thinkingLevel: input.isPro ? 'MEDIUM' : 'MINIMAL',
      metricLabel: `report-chapter:${input.slug}${label}`,
      locale: input.locale,
      jsonMode: true,
      responseSchema: toJsonSchema(outputSchema),
    })
    const jsonStr = extractJson(raw)
    if (!jsonStr) {
      console.error('[report-chapter] failed to extract JSON', input.slug, raw.slice(0, 400))
      return null
    }
    let parsedRaw: unknown
    try {
      parsedRaw = JSON.parse(jsonStr)
    } catch (err) {
      console.error('[report-chapter] JSON.parse failed', input.slug, err, jsonStr.slice(0, 400))
      return null
    }
    const result = outputSchema.safeParse(parsedRaw)
    if (!result.success) {
      console.error('[report-chapter] schema validation failed', input.slug, result.error.issues)
      return null
    }
    return result.data
  }

  // Base draft: one shape-heal re-roll (steadier temp) if the first is invalid.
  let parsed: Parsed | null = await genOnce('', 0.7, '')
  if (!parsed) parsed = await genOnce(':retry', 0.55, '')
  if (!parsed) {
    throw new HTTPException(500, { message: 'Invalid chapter response' })
  }

  const chapterGaps = () => reportChapterGaps(input.slug, asRecord(parsed as Parsed))

  // Structure retry: accepted only when it STRICTLY reduces gaps AND does not
  // shrink the prose (mirrors faceoracle — never trade a richer draft for a
  // terser one). Names the failed checks so the model repairs them in place.
  let gaps = chapterGaps()
  if (gaps.length > 0) {
    console.warn('[report-chapter] structure gaps — retrying', { slug: input.slug, gaps })
    const structNudge = [
      '',
      '【结构重写】上一稿未通过以下结构检查（不是字数问题）：',
      gaps.join('、'),
      '逐条修好，且不得缩短任何 section：summary 要有 aha；每个 section 走完「命盘锚点→机理→点名窗口」链，不得只写标题的同义复述；watchOuts 给足 ≥2 条（短板+何时+一步）；第四章只讲"会怎样"、第六章只给"做什么"，互不复述；删除所有正确的废话套话。只输出合法 JSON。',
    ].join('\n')
    const retry = await genOnce(':struct', 0.6, structNudge)
    if (retry) {
      const retryGaps = reportChapterGaps(input.slug, asRecord(retry))
      const curLen = reportChapterProseLength(asRecord(parsed))
      const retryLen = reportChapterProseLength(asRecord(retry))
      if (retryGaps.length < gaps.length && retryLen + 12 >= curLen) {
        parsed = retry
        gaps = retryGaps
      } else {
        console.warn('[report-chapter] structure retry rejected (no strict gain / regressed)', {
          slug: input.slug,
          curLen,
          retryLen,
          curGaps: gaps.length,
          retryGaps: retryGaps.length,
        })
      }
    }
  }

  // Deepen retry: thin one-liner fields remain → expand with mechanism + one
  // dated scene while KEEPING structure. Accept only when thin gaps drop, the
  // draft grows, and no new gaps appear.
  const thinGaps = gaps.filter(isThinReportGap)
  if (thinGaps.length > 0) {
    console.warn('[report-chapter] thin fields — deepen retry', { slug: input.slug, thinGaps })
    const deepenNudge = [
      '',
      '【加深重写】保持相同结构、章节与结论，不要重构或缩短任何内容。',
      `以下部分仍是单薄的一句话：${thinGaps.join('、')}。`,
      '对每一处，沿「命盘锚点→机理(为什么，扣日主/喜忌/大运)→一个点名窗口(年龄/年份/干支)的具体场景」把它写成真正的大师段落；靠推演与一个有日期的场景加深，绝不靠注水、复读或空话。只输出合法 JSON。',
    ].join('\n')
    const deep = await genOnce(':deepen', 0.6, deepenNudge)
    if (deep) {
      const deepGaps = reportChapterGaps(input.slug, asRecord(deep))
      const deepThin = deepGaps.filter(isThinReportGap)
      const curLen = reportChapterProseLength(asRecord(parsed))
      const deepLen = reportChapterProseLength(asRecord(deep))
      if (
        deepThin.length < thinGaps.length &&
        deepLen >= curLen &&
        deepGaps.length <= gaps.length
      ) {
        parsed = deep
        gaps = deepGaps
      } else {
        console.warn('[report-chapter] deepen retry rejected', {
          slug: input.slug,
          curLen,
          deepLen,
          thinBefore: thinGaps.length,
          thinAfter: deepThin.length,
        })
      }
    }
  }

  // Hard/soft forbidden audit — one rewrite, then accept (never hard-fail here).
  const audit = auditGeneratedOutput(JSON.stringify(parsed))
  if (audit.hits.length > 0 && audit.rewriteSuffix) {
    console.warn('[report-chapter] forbidden phrases — rewrite', {
      slug: input.slug,
      hits: audit.hits,
    })
    const fixed = await genOnce(':forbidden', 0.55, `\n\n${audit.rewriteSuffix}`)
    if (fixed && auditGeneratedOutput(JSON.stringify(fixed)).hits.length === 0) {
      parsed = fixed
    }
  }

  return c.json(parsed)
})

/**
 * 流年深读 — POST /report/monthly
 *
 * The Pro LLM enrichment of the deterministic monthly rhythm card. The caller (hexastral-api)
 * supplies the month's deterministic atoms (干支 · 五行 · 已算好的 headline/body) plus the
 * user's birth so we can rebuild the full chart facts. We expand that grounded taste into
 * a short multi-theme monthly read — consistent with the free card, just deeper.
 *
 * No allowance: the API caches one depth per user+month+chart, so this naturally fires
 * about once a month. Output: MonthlyDepthOutput (strict JSON).
 */
const monthInputSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  ganZhi: z.string().min(1),
  element: z.string().min(1),
  headline: z.string().min(1),
  body: z.string().min(1),
})

const monthlyRequestSchema = z.object({
  chartHash: z.string().min(1),
  contextHash: z.string().min(1),
  locale: z.string().default('en'),
  user: userSchema,
  birth: birthSchema,
  month: monthInputSchema,
  isPro: z.boolean().optional().default(true),
})

reportChapterRoutes.post('/monthly', async (c) => {
  const body = await c.req.json()
  const input = monthlyRequestSchema.parse(body)
  const { month } = input

  const richFacts = input.birth
    ? buildRichFacts({
        solarDate: input.birth.solarDate,
        timeIndex: input.birth.timeIndex,
        clockMinutes: input.birth.clockMinutes,
        calibrate: input.birth.calibrate,
        gender: input.birth.gender,
        longitude: input.birth.longitude,
        latitude: input.birth.latitude,
        timezoneId: input.birth.timezoneId,
        city: input.birth.city,
        userId: `report-monthly:${input.chartHash}`,
        language: input.locale,
      })
    : null

  const ctx = {
    user: input.user,
    timeContext: null,
    perspectiveSeed: undefined,
    richFacts: richFacts ?? undefined,
  }

  const systemPrompt = [
    getSystemRole('fate'),
    '',
    '你正在为客户写「本月参考」的深读（reflection / monthly rhythm — 不是运势预测）。',
    '你拿到的是本月流月与其命盘的确定性判断（干支、五行、十神关系、喜忌、以及一段已写好的简版结论）。',
    '你的任务是把这段简版结论展开成一篇简短但有洞见的本月深读：保持与简版一致的基调，不要推翻它，而是补充机理、落到具体生活场景、并给出可执行的建议。',
    '只谈本月，不要泛泛而谈一生；语气克制、具体、不渲染大吉大凶；这是文化参照，不是命运定论。',
    buildEnhancedGuardrails('观照自身，不作预测', input.locale),
    buildLanguageBlock(input.locale, 'fate'),
  ].join('\n')

  const factsBlock = buildChapterFacts(ctx)
  const monthBlock = `【本月流月】${month.label} · ${month.ganZhi}（${month.element}）
【确定性基调】${month.headline}
【简版结论】${month.body}`

  const schemaHint =
    'Output schema: MonthlyDepthOutput = { title, overview, themes[{ label, body }] (2-4), advice, watchFor }'
  const userPrompt = `${factsBlock}\n\n${monthBlock}\n\n${schemaHint}\n请基于以上事实生成严格 JSON，只针对本月，禁止输出额外字段。${buildLanguageReminder(input.locale)}`

  let parsed: z.infer<typeof monthlyDepthOutputSchema> | null = null
  let lastIssue = ''
  let lastIssueDetail = ''
  for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
    const auditSuffix = attempt > 0 && lastIssue === 'forbidden' ? `\n\n${lastIssueDetail}` : ''
    const raw = await callWithFallback(c.env, systemPrompt, userPrompt + auditSuffix, {
      isPro: input.isPro,
      // Monthly depth is light + time-bound — Flash tier keeps it inside its timeout.
      preferFlash: true,
      maxTokens: 1400,
      temperature: attempt === 0 ? 0.85 : 0.6,
      thinkingLevel: input.isPro ? 'MEDIUM' : 'MINIMAL',
      metricLabel: `report-monthly${attempt > 0 ? ':retry' : ''}`,
      locale: input.locale,
      jsonMode: true,
      responseSchema: toJsonSchema(monthlyDepthOutputSchema),
    })

    const jsonStr = extractJson(raw)
    if (!jsonStr) {
      lastIssue = 'extract'
      console.error('[report-monthly] failed to extract JSON', raw.slice(0, 500))
      continue
    }
    let parsedRaw: unknown
    try {
      parsedRaw = JSON.parse(jsonStr)
    } catch (err) {
      lastIssue = 'parse'
      console.error('[report-monthly] JSON.parse failed', err, jsonStr.slice(0, 500))
      continue
    }
    const result = monthlyDepthOutputSchema.safeParse(parsedRaw)
    if (!result.success) {
      lastIssue = 'shape'
      console.error('[report-monthly] schema validation failed', result.error.issues)
      continue
    }
    const audit = auditGeneratedOutput(JSON.stringify(result.data))
    if (audit.hits.length > 0) {
      lastIssue = 'forbidden'
      lastIssueDetail = audit.rewriteSuffix ?? ''
      console.warn('[report-monthly] forbidden phrases', audit.hits)
      continue
    }
    parsed = result.data
  }

  if (!parsed) {
    throw new HTTPException(500, { message: `Invalid monthly response (${lastIssue})` })
  }

  return c.json(parsed)
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

function getStylePresetInstruction(preset: z.infer<typeof stylePresetEnum>): string {
  if (preset === 'direct') {
    return '直白结论优先：先给判断，再给依据；句子更短，行动建议更明确。'
  }
  if (preset === 'coach') {
    return '教练陪伴语气：强调可执行步骤、节奏感与反馈点，避免命令式措辞。'
  }
  return '温和抚慰语气：措辞柔和、强调稳定与自我关照，不夸大风险。'
}
