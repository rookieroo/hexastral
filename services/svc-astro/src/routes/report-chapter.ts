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
import { buildChapterFacts, CHAPTER_PROMPT_BUILDERS } from '../prompts/chapters'
import {
  ch4TimelineOutputSchema,
  ch5HiddenOutputSchema,
  ch6ActionOutputSchema,
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

  const systemPrompt = builder(ctx, langLabel)
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

  const userPrompt = `${factsBlock}${perspectiveClause}${stylePresetClause}${styleSeedClause}\n\n${chapterSchemaHints[input.slug]}\n请基于以上事实生成严格 JSON，禁止输出额外字段。`

  const timeBoundSlugs = new Set(['ch4_timeline', 'ch5_hidden', 'ch6_action'])

  const raw = await callWithFallback(c.env, systemPrompt, userPrompt, {
    isPro: input.isPro,
    preferFlash: timeBoundSlugs.has(input.slug),
    // Trimmed from 2400 → fits a flagship generation inside its per-model timeout
    // (router PER_MODEL_TIMEOUT_MS) so a slow Kimi falls back instead of 504-ing.
    maxTokens: 2000,
    temperature: 0.85,
    thinkingLevel: input.isPro ? 'MEDIUM' : 'MINIMAL',
    metricLabel: `report-chapter:${input.slug}`,
    locale: input.locale,
    jsonMode: true,
    responseSchema: toJsonSchema(outputSchema),
  })

  const jsonStr = extractJson(raw)
  if (!jsonStr) {
    console.error('[report-chapter] failed to extract JSON', input.slug, raw.slice(0, 500))
    throw new HTTPException(500, { message: 'Failed to parse chapter response' })
  }

  let parsedRaw: unknown
  try {
    parsedRaw = JSON.parse(jsonStr)
  } catch (err) {
    console.error('[report-chapter] JSON.parse failed', input.slug, err, jsonStr.slice(0, 500))
    throw new HTTPException(500, { message: 'Invalid chapter response structure' })
  }

  const result = outputSchema.safeParse(parsedRaw)
  if (!result.success) {
    console.error(
      '[report-chapter] schema validation failed',
      input.slug,
      result.error.issues,
      jsonStr.slice(0, 500)
    )
    throw new HTTPException(500, { message: 'Invalid chapter response shape' })
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

function getStylePresetInstruction(preset: z.infer<typeof stylePresetEnum>): string {
  if (preset === 'direct') {
    return '直白结论优先：先给判断，再给依据；句子更短，行动建议更明确。'
  }
  if (preset === 'coach') {
    return '教练陪伴语气：强调可执行步骤、节奏感与反馈点，避免命令式措辞。'
  }
  return '温和抚慰语气：措辞柔和、强调稳定与自我关照，不夸大风险。'
}
