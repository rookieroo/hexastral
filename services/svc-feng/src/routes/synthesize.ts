/**
 * POST /synthesize
 *
 * Lean final chapters from compact briefing (+ optional formLiNotes).
 * No full vision/compute JSON dump.
 */

import { callWithFallback, withZodRetry } from '@zhop/ai-vision'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { auditSynthesisFactsHard } from '../lib/form-li-notes-audit'
import { fengChaptersLocaleOk } from '../lib/locale-gate'
import { logger } from '../lib/logger'
import { auditGeneratedOutput } from '../lib/output-audit'
import {
  briefingContainsRawChartDump,
  buildSynthesisBriefing,
  serializeSynthesisBriefing,
} from '../lib/synthesis-briefing'
import { auditSynthesisAgainstCompute } from '../lib/synthesis-compute-audit'
import {
  buildSynthesisSystemPrompt,
  buildSynthesisUserPrompt,
  SYNTHESIS_RESPONSE_SCHEMA,
} from '../prompts/synthesis'

const VisionInputSchema = z.object({
  形煞: z.array(z.unknown()),
  砂: z.array(z.unknown()),
  水: z.array(z.unknown()),
  朝案: z.array(z.unknown()),
  notes: z.string().optional(),
})

const ComputeInputSchema = z.object({
  flyingStars: z.unknown(),
  baZhai: z.unknown(),
  auspiciousPalaces: z.array(z.string()),
  inauspiciousPalaces: z.array(z.string()),
  patterns: z.array(z.unknown()).optional(),
  combinations: z.array(z.unknown()).optional(),
  formLi: z.unknown().optional(),
  macroTerrain: z.unknown().optional(),
  overlayHints: z.unknown().optional(),
  monthlyStars: z.unknown().optional(),
  roomFindings: z.array(z.unknown()).optional(),
  interiorSha: z.array(z.unknown()).optional(),
  interiorQueJiao: z.array(z.unknown()).optional(),
  summary: z.unknown().optional(),
  annualChart: z.unknown().optional(),
})

const SynthesizeRequestSchema = z.object({
  vision: VisionInputSchema,
  compute: ComputeInputSchema,
  userProfile: z.object({
    birthDate: z.string(),
    gender: z.enum(['男', '女']),
    locale: z.enum(['en', 'zh', 'zh-Hant', 'ja']),
  }),
  memoryContext: z.string().max(8_000).optional(),
  dataQuality: z
    .object({
      hasExactBuildYear: z.boolean().optional(),
      flyingStarsConfidence: z.string(),
      notes: z.array(z.string()),
      inputScore: z.number().int().min(0).max(100).optional(),
    })
    .optional(),
  mustSoften: z
    .array(
      z.object({
        type: z.string(),
        direction: z.string(),
        geometrySupport: z.enum(['weak', 'none', 'inferred-only']),
      })
    )
    .optional(),
  formLiNotes: z.unknown().nullable().optional(),
})

const CHAPTER_KINDS = [
  'external_landform',
  'personal_fit',
  'flying_stars',
  'annual_directions',
  'remediation',
  'auspicious_objects',
] as const

const SynthesisResultSchema = z.object({
  chapters: z
    .array(
      z.object({
        kind: z.enum(CHAPTER_KINDS),
        title: z.string().min(1),
        goldenLine: z.string().min(1),
        body: z.string().min(1),
      })
    )
    .min(4)
    .max(6),
})

const MODEL_VERSION = 'cf-kimi-synth-v2'
const MAX_TOKENS = 8192

export const synthesizeRouter = new Hono<{ Bindings: Env }>()

synthesizeRouter.post('/', async (c) => {
  const json = await c.req.json().catch(() => null)
  const parsed = SynthesizeRequestSchema.safeParse(json)
  if (!parsed.success) {
    throw new HTTPException(400, { message: parsed.error.message })
  }

  const { vision, compute, userProfile, memoryContext, dataQuality, mustSoften, formLiNotes } =
    parsed.data
  const started = Date.now()
  logger.info('synthesize.start', {
    locale: userProfile.locale,
    hasMemoryContext: !!memoryContext,
    hasFormLiNotes: formLiNotes != null,
  })

  const omitFlying =
    dataQuality?.flyingStarsConfidence === 'omitted' ||
    (compute.summary &&
      typeof compute.summary === 'object' &&
      (compute.summary as { flyingStarsOmitted?: boolean }).flyingStarsOmitted === true)

  const omitFlyingStars = Boolean(omitFlying)

  const briefing = buildSynthesisBriefing({
    vision,
    compute,
    dataQuality: dataQuality || undefined,
    formLiNotes: formLiNotes ?? null,
    mustSoften: mustSoften?.length ? mustSoften : undefined,
    memoryContext: memoryContext || undefined,
    userProfile,
  })
  const briefingJson = serializeSynthesisBriefing(briefing)
  if (briefingContainsRawChartDump(briefingJson)) {
    throw new HTTPException(500, { message: 'briefing leaked raw chart dump' })
  }

  const userPrompt = buildSynthesisUserPrompt({
    briefingJson,
    userProfile,
  })
  const systemPrompt = buildSynthesisSystemPrompt(userProfile.locale)

  let usedFallback = false
  let forbiddenRetrySuffix = ''
  let computeAuditSuffix = ''
  let useLowTemperature = false
  const validated = await withZodRetry({
    label: 'synthesize',
    schema: SynthesisResultSchema,
    maxRetries: 1,
    call: async () => {
      const text = await callWithFallback(
        c.env,
        systemPrompt,
        userPrompt + forbiddenRetrySuffix + computeAuditSuffix,
        {
          tier: 'flagship',
          responseSchema: SYNTHESIS_RESPONSE_SCHEMA as unknown as Record<string, unknown>,
          maxTokens: MAX_TOKENS,
          temperature: useLowTemperature ? 0.35 : 0.45,
          metricLabel: 'feng-synthesis',
          locale: userProfile.locale,
          totalBudgetMs: 130_000,
          perModelTimeoutMs: 70_000,
        }
      )
      const parsedJson = JSON.parse(text) as unknown
      const chapterParsed = SynthesisResultSchema.safeParse(parsedJson)
      if (!chapterParsed.success) {
        throw new Error(chapterParsed.error.message)
      }
      let chapters = chapterParsed.data.chapters
      if (omitFlyingStars) {
        chapters = chapters.filter((ch) => ch.kind !== 'flying_stars')
      }
      if (chapters.length < 4) {
        throw new Error('too few chapters after flying_stars filter')
      }
      const audit = auditGeneratedOutput(JSON.stringify({ chapters }))
      if (audit.hits.length > 0) {
        forbiddenRetrySuffix = audit.rewriteSuffix ?? ''
        logger.warn('synthesize.forbidden_phrases', { hits: audit.hits })
        throw new Error('forbidden phrases in synthesis output')
      }
      const computeAudit = auditSynthesisAgainstCompute(chapters, compute)
      if (!computeAudit.ok) {
        computeAuditSuffix = computeAudit.rewriteSuffix
        useLowTemperature = true
        logger.warn('synthesize.compute_audit', { violations: computeAudit.violations })
        throw new Error('compute audit failed in synthesis output')
      }
      const hardAudit = auditSynthesisFactsHard(chapters, compute)
      if (!hardAudit.ok) {
        computeAuditSuffix = hardAudit.rewriteSuffix
        useLowTemperature = true
        logger.warn('synthesize.hard_audit', { violations: hardAudit.violations })
        throw new Error('hard fact audit failed in synthesis output')
      }
      const localeAudit = fengChaptersLocaleOk(userProfile.locale, chapters)
      if (!localeAudit.ok) {
        computeAuditSuffix = localeAudit.rewriteSuffix
        useLowTemperature = true
        logger.warn('synthesize.locale_gate', { locale: userProfile.locale })
        throw new Error('locale gate failed in synthesis output')
      }
      return { chapters }
    },
    degraded: () => {
      usedFallback = true
      return { chapters: buildFallbackChapters(userProfile.locale, omitFlyingStars) }
    },
  })

  const isFallback = usedFallback
  logger.info('synthesize.done', {
    locale: userProfile.locale,
    durationMs: Date.now() - started,
    fallback: isFallback,
    chapterCount: validated.chapters.length,
    maxTokens: MAX_TOKENS,
  })
  return c.json({
    chapters: validated.chapters,
    modelVersion: isFallback ? `${MODEL_VERSION}-fallback` : MODEL_VERSION,
  })
})

const FALLBACK_TITLES_ZH: Record<string, string> = {
  external_landform: '外巒頭概览',
  personal_fit: '个人命卦匹配',
  flying_stars: '玄空当运',
  annual_directions: '流年方位',
  remediation: '化解建议',
  auspicious_objects: '陈设参考',
}

const FALLBACK_TITLES_JA: Record<string, string> = {
  external_landform: '外巒頭の概要',
  personal_fit: '個人の命卦適合',
  flying_stars: '玄空飛星',
  annual_directions: '流年方位',
  remediation: '化解のアドバイス',
  auspicious_objects: '設え参考',
}

const FALLBACK_TITLES_EN: Record<string, string> = {
  external_landform: 'External Landform Overview',
  personal_fit: 'Personal Trigram Fit',
  flying_stars: 'Flying Stars Analysis',
  annual_directions: 'Annual Directions',
  remediation: 'Remediation Advice',
  auspicious_objects: 'Placement (study)',
}

function buildFallbackChapters(locale: 'en' | 'zh' | 'zh-Hant' | 'ja', omitFlying: boolean) {
  const isZh = locale.startsWith('zh')
  const isJa = locale === 'ja'
  const kinds = omitFlying ? CHAPTER_KINDS.filter((k) => k !== 'flying_stars') : [...CHAPTER_KINDS]

  return kinds.map((kind) => ({
    kind,
    title: isZh
      ? FALLBACK_TITLES_ZH[kind] || kind
      : isJa
        ? FALLBACK_TITLES_JA[kind] || kind
        : FALLBACK_TITLES_EN[kind] || kind,
    goldenLine: isZh
      ? '报告生成遇到困难，请稍后重试。'
      : isJa
        ? 'レポート生成に問題が発生しました。'
        : 'Report generation encountered an issue.',
    body: isZh
      ? '自动分析暂时不可用。您可以返回重新生成报告，或联系支持。您的站点数据已安全保存。'
      : isJa
        ? '自動分析が一時的に利用できません。戻ってレポートを再生成するか、サポートにお問い合わせください。'
        : 'Automated analysis is temporarily unavailable. You can go back and regenerate the report, or contact support. Your site data is safely saved.',
  }))
}
