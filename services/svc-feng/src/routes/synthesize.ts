/**
 * POST /synthesize
 *
 * Stage 3 of the AI pipeline. Takes Stage 1 vision JSON + Stage 2 compute
 * JSON + user profile + portfolio-memory, returns 6 chapters for the
 * Fēng report.
 *
 * Text synthesis runs on the shared CF Workers AI router (`@zhop/ai-vision/router`,
 * flagship tier = Kimi K2.6 → Qwen3 → GLM) — the same high-quality LLM base the
 * rest of the 玄学 matrix uses. Gemini is reserved for the Stage-1 VLM only.
 */

import { callWithFallback, withZodRetry } from '@zhop/ai-vision'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { auditGeneratedOutput } from '../lib/output-audit'
import { logger } from '../lib/logger'
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
  monthlyStars: z.unknown().optional(),
  // Interior (户型图) room-level join + interior 形煞. MUST be declared here or
  // Zod strips them before they reach the prompt (same trap as `summary` below).
  // Empty/omitted = exterior-only report; present = room-specific indoor advice.
  roomFindings: z.array(z.unknown()).optional(),
  interiorSha: z.array(z.unknown()).optional(),
  // Chart identity (坐山向 / 卦运 / 元运 year-ranges). The flying_stars prompt
  // OPENS with this — without it here, Zod's default object behavior would
  // silently STRIP the field and the model loses its 坐山向 opening + 旺→退 window.
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
      flyingStarsConfidence: z.string(),
      notes: z.array(z.string()),
    })
    .optional(),
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
    .length(6),
})

const MODEL_VERSION = 'cf-kimi-synth-v1'

export const synthesizeRouter = new Hono<{ Bindings: Env }>()

synthesizeRouter.post('/', async (c) => {
  const json = await c.req.json().catch(() => null)
  const parsed = SynthesizeRequestSchema.safeParse(json)
  if (!parsed.success) {
    throw new HTTPException(400, { message: parsed.error.message })
  }

  const { vision, compute, userProfile, memoryContext, dataQuality } = parsed.data
  const started = Date.now()
  logger.info('synthesize.start', {
    locale: userProfile.locale,
    hasMemoryContext: !!memoryContext,
    memoryChars: memoryContext?.length ?? 0,
  })

  const userPrompt = buildSynthesisUserPrompt({
    visionJson: JSON.stringify(vision, null, 2),
    computeJson: JSON.stringify(compute, null, 2),
    userProfile,
    memoryContext: memoryContext || undefined,
    dataQuality: dataQuality || undefined,
  })

  const systemPrompt = buildSynthesisSystemPrompt(userProfile.locale)

  let usedFallback = false
  let forbiddenRetrySuffix = ''
  const validated = await withZodRetry({
    label: 'synthesize',
    schema: SynthesisResultSchema,
    // Single attempt. The per-attempt budget (130s) already fits under feng-client's
    // 150s synthesize AbortSignal; a 2nd attempt (default maxRetries:2) would double
    // the wall-clock and blow the abort → a hard failure instead of a clean fallback.
    // Malformed JSON → fallback here, and the caller (runAnalyzeJob) marks the job
    // failed so the user can retry a fresh run.
    maxRetries: 1,
    call: async () => {
      const text = await callWithFallback(c.env, systemPrompt, userPrompt + forbiddenRetrySuffix, {
        tier: 'flagship',
        responseSchema: SYNTHESIS_RESPONSE_SCHEMA as unknown as Record<string, unknown>,
        // 6 chapters × ~300-char bodies + reasoning headroom — 8k truncated the
        // longer pro-grade bodies into fallback stubs.
        maxTokens: 16384,
        temperature: 0.7,
        metricLabel: 'feng-synthesis',
        locale: userProfile.locale,
        // This is a heavy, quality-critical, NON-interactive (queue consumer)
        // generation — 6 pro-grade chapters. The router's default 48s/24s budget
        // starves it (≈16s/model → fail-clean), and the prior 60s outer timeout
        // aborted it mid-generation (job.failed "operation was aborted due to
        // timeout"). Give it a real budget (~43s/model) that still sits UNDER
        // feng-client's synthesize AbortSignal (150s).
        totalBudgetMs: 130_000,
        perModelTimeoutMs: 70_000,
      })
      const parsedJson = JSON.parse(text) as unknown
      const audit = auditGeneratedOutput(JSON.stringify(parsedJson))
      if (audit.hits.length > 0) {
        forbiddenRetrySuffix = audit.rewriteSuffix ?? ''
        logger.warn('synthesize.forbidden_phrases', { hits: audit.hits })
        throw new Error('forbidden phrases in synthesis output')
      }
      return parsedJson
    },
    degraded: () => {
      usedFallback = true
      return { chapters: buildFallbackChapters(userProfile.locale) }
    },
  })

  // Locale-independent (was a zh-only substring match on '生成遇到困难' that stamped
  // en/ja fallback stubs as real reports → the caller consumed the paid entitlement).
  const isFallback = usedFallback
  logger.info('synthesize.done', {
    locale: userProfile.locale,
    durationMs: Date.now() - started,
    fallback: isFallback,
    chapterCount: validated.chapters.length,
  })
  return c.json({
    chapters: validated.chapters,
    modelVersion: isFallback ? `${MODEL_VERSION}-fallback` : MODEL_VERSION,
  })
})

// ── Locale-aware fallback chapters ──────────────────────────────────────────

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

function buildFallbackChapters(locale: 'en' | 'zh' | 'zh-Hant' | 'ja') {
  const isZh = locale.startsWith('zh')
  const isJa = locale === 'ja'

  return CHAPTER_KINDS.map((kind) => ({
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
