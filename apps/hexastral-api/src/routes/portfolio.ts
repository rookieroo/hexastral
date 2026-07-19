import type { ExecutionContext } from '@cloudflare/workers-types/2023-07-01'
import { getFourPillars } from '@zhop/astro-core/ganzhi'
import { calculateHeHun } from '@zhop/astro-core/hehun'
import { and, desc, eq, gte, isNull, lt, or, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { nanoid } from 'nanoid'
import { z } from 'zod/v4'
import type { CreditType } from '../config/products'
import {
  chapterUnlockInvitations,
  physiognomyEvents,
  portfolioReadings,
  userPhysiognomyFeatures,
  users,
} from '../db/schema'
import type { CloudflareBindings, ContextVariables } from '../infra-types'
import { upsellProductFor } from '../lib/access/capabilities'
import { userHasCapability } from '../lib/access/entitlement-access'
import {
  decideEpisodicQuota,
  EPISODIC_FREE_READINGS_PER_MONTH,
  resolveEpisodicAccess,
} from '../lib/access/episodic'
import { callAstro } from '../lib/astro-client'
import { requireUserId } from '../lib/auth'
import { BIOMETRIC_CONSENT_VERSION, hasBiometricConsent } from '../lib/biometric-consent'
import { hasActiveEntitlement } from '../services/entitlements'
import {
  checkAndConsumeFaceoraclePhotoSlots,
} from '../services/quota'
import { assertBirthEditQuota, type BirthEditInput } from '../lib/birth-edit-quota'
import { CHAPTER_UNLOCK_CAP } from '../lib/chapter-access'
import { rebuildUserCharts } from '../lib/chart-skeleton'
import { castMeihua } from '../lib/meihua'
import {
  buildCoincastMemoryDocument,
  buildDreamMemoryDocument,
  buildNumerologyMemoryDocument,
  deletePortfolioReadingMemory,
  indexPortfolioReadingMemory,
  searchPortfolioReadingMemory,
} from '../lib/portfolio-memory'
import {
  buildCoincastPrompt,
  buildDreamPrompt,
  buildEightPillarsPrompt,
  buildFaceOraclePrompt,
  buildSoulMatchPrompt,
  buildStarPalacePrompt,
} from '../lib/prompts'
import { mailerClient } from '../lib/service-clients'
import {
  type CreditSource,
  consumeCredit,
  getCreditBalance,
  refundCredit,
} from '../services/credits'
import {
  checkDivinationGuard,
  type GuardReason,
  recordDivinationSuccess,
} from '../services/shared/divination-guard'

const portfolioTargetSchema = z.enum([
  'faceoracle',
  'starpalace',
  'soulmatch',
  'fengshui',
  'dreamoracle',
  'eightpillars',
  'coincast',
  'numerology',
])

const questionTypeSchema = z.enum(['relationship', 'home_office', 'career_wealth', 'self_daily'])

const previewBodySchema = z.object({
  input: z.record(z.string(), z.unknown()),
  ddlToken: z.string().max(80).optional(),
  locale: z.string().max(16).optional(),
  questionType: questionTypeSchema.optional(),
})

const linkedBodySchema = z.object({
  input: z.record(z.string(), z.unknown()),
  locale: z.string().max(16).optional(),
  questionType: questionTypeSchema.optional(),
})

type FlagshipKey = 'kindred' | 'feng' | 'hexastral'
type QuestionType = z.infer<typeof questionTypeSchema>
type PortfolioTargetKey = z.infer<typeof portfolioTargetSchema>

const QUESTION_TO_FLAGSHIP: Record<QuestionType, FlagshipKey> = {
  relationship: 'kindred',
  home_office: 'feng',
  career_wealth: 'hexastral',
  self_daily: 'hexastral',
}

const TARGET_DEFAULT_FLAGSHIP: Record<PortfolioTargetKey, FlagshipKey> = {
  faceoracle: 'hexastral',
  starpalace: 'hexastral',
  soulmatch: 'kindred',
  fengshui: 'feng',
  dreamoracle: 'hexastral',
  eightpillars: 'hexastral',
  coincast: 'hexastral',
  numerology: 'hexastral',
}

function suggestFlagship(
  target: PortfolioTargetKey,
  questionType: QuestionType | undefined
): FlagshipKey {
  if (questionType) return QUESTION_TO_FLAGSHIP[questionType]
  return TARGET_DEFAULT_FLAGSHIP[target]
}

const portfolioMemoryPreferenceSchema = z
  .object({
    enabled: z.boolean().optional(),
    crossAppEnabled: z.boolean().optional(),
  })
  .refine((v) => v.enabled !== undefined || v.crossAppEnabled !== undefined, {
    message: 'At least one of enabled / crossAppEnabled is required',
  })

const readingsQuerySchema = z.object({
  cursor: z.string().max(128).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
})

const eightPillarsDailyQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dayMaster: z.string().max(24).optional(),
})

const portfolioBirthInfoSchema = z.object({
  birthSolarDate: z.string().regex(/^\d{4}-\d{1,2}-\d{1,2}$/),
  birthTimeIndex: z.coerce.number().int().min(0).max(12),
  gender: z.enum(['男', '女']).optional(),
  birthCity: z.string().max(80).optional(),
  birthLatitude: z.string().max(32).optional(),
  birthLongitude: z.string().max(32).optional(),
  birthTimezoneId: z.string().max(80).optional(),
  /** Precise birth clock — minutes since midnight 0..1439. null = 时辰-only. */
  birthClockMinutes: z.coerce.number().int().min(0).max(1439).nullish(),
  /** 真太阳时 calibration toggle for the precise clock; default-on, false = off. */
  birthSolarCalibrate: z.boolean().nullish(),
  /** Original 农历 round-trip — calendar choice + raw lunar input + 闰月 flag. */
  birthCalendarType: z.enum(['solar', 'lunar']).optional(),
  birthLunarInput: z
    .string()
    .regex(/^\d{4}-\d{1,2}-\d{1,2}$/)
    .optional(),
  birthLunarIsLeap: z.boolean().optional(),
})

const coincastInputSchema = z.object({
  question: z.string().min(2).max(500),
  entropy: z.string().min(8).max(256).optional(),
  yaoValues: z
    .array(z.union([z.literal(6), z.literal(7), z.literal(8), z.literal(9)]))
    .length(6)
    .optional(),
})

const dreamInputSchema = z.object({
  dreamText: z.string().min(8).max(2000),
})

const personSchema = z.object({
  solarDate: z.string().regex(/^\d{4}-\d{1,2}-\d{1,2}$/),
  timeIndex: z.int().min(0).max(12),
  gender: z.enum(['男', '女']).optional().default('女'),
  name: z.string().max(40).optional(),
})

const soulMatchInputSchema = z.object({
  personA: personSchema,
  personB: personSchema,
})

const baziInputSchema = z.object({
  solarDate: z.string().regex(/^\d{4}-\d{1,2}-\d{1,2}$/),
  timeIndex: z.int().min(0).max(12),
  gender: z.enum(['男', '女']).optional().default('女'),
})

/** ADR-0028: three feature sources + birth required for paid reading. */
const faceInputSchema = z.object({
  /** Legacy single-image path (teaser / migrate). Prefer feature IDs. */
  imageUrl: z.string().min(1).optional(),
  imageBase64: z.string().min(32).optional(),
  mode: z.enum(['face', 'palm']).optional().default('face'),
  faceFeatureId: z.string().min(1).optional(),
  palmLeftFeatureId: z.string().min(1).optional(),
  palmRightFeatureId: z.string().min(1).optional(),
  /** Inline base64 for each part when feature IDs not yet created (ephemeral). */
  faceImageBase64: z.string().min(32).optional(),
  palmLeftImageBase64: z.string().min(32).optional(),
  palmRightImageBase64: z.string().min(32).optional(),
  solarDate: z
    .string()
    .regex(/^\d{4}-\d{1,2}-\d{1,2}$/)
    .optional(),
  timeIndex: z.int().min(0).max(12).optional(),
  gender: z.enum(['男', '女']).optional(),
  city: z.string().max(80).optional(),
  horizonMonths: z.union([z.literal(3), z.literal(6)]).optional().default(3),
  outputKind: z.enum(['oneshot', 'period_brief', 'deep']).optional().default('oneshot'),
  updateKind: z.enum(['full', 'partial']).optional().default('full'),
  partialParts: z.array(z.enum(['face', 'palm_l', 'palm_r'])).optional(),
  previousFeaturesJson: z.string().max(50_000).optional(),
})

const starPalaceInputSchema = z.object({
  solarDate: z.string().regex(/^\d{4}-\d{1,2}-\d{1,2}$/),
  timeIndex: z.int().min(0).max(12),
  gender: z.enum(['男', '女']).optional().default('女'),
  city: z.string().max(80).optional(),
})

const fengShuiInputSchema = z.object({
  roomType: z.string().min(2).max(40).optional().default('bedroom'),
  concern: z.string().min(2).max(160).optional().default('sleep quality'),
})

/**
 * Meihua (梅花易数) input — replaces Western numerology per Phase K pivot.
 * Pure-CN engine: cast a hexagram from current time + an optional "observed
 * number" (邵雍先天数法). Keeps the satellite name `numerology` for ASO/brand
 * continuity (Eastern numerology framing).
 */
const numerologyInputSchema = z.object({
  /** Optional user question — improves interpretation context. */
  question: z.string().max(160).optional(),
  /** Optional observed number (1-9999). Server uses time-only cast if absent. */
  observedNumber: z.int().min(0).max(9999).optional(),
})

export const portfolioRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: ContextVariables
}>()

const COINCAST_FREE_READINGS_PER_MONTH = 3
/** Guest / anonymous installs: full readings per UTC calendar day before requiring Apple sign-in. */
const COINCAST_FREE_GUEST_READINGS_PER_DAY = 3

/** Consecutive LLM refusals (三不占) before client warning copy. */
const COINCAST_VIOLATION_WARN_THRESHOLD = 3
/** Consecutive refusals that trigger a temporary CoinCast pause. */
const COINCAST_VIOLATION_BAN_THRESHOLD = 5
const COINCAST_BAN_DURATION_MS = 24 * 60 * 60 * 1000

type CoincastInterpretationMode = 'classical' | 'ai'

async function resolveCoincastInterpretationMode(
  db: ContextVariables['db'],
  opts: { userId: string; consumeCredit: boolean }
): Promise<{ mode: CoincastInterpretationMode; isPro: boolean }> {
  const nowIso = new Date().toISOString()
  const user = await db
    .select({ proUntil: users.coincastProExpiresAt })
    .from(users)
    .where(eq(users.id, opts.userId))
    .get()

  const isPro = Boolean(user?.proUntil && user.proUntil > nowIso)
  if (isPro || opts.consumeCredit) {
    return { mode: 'ai', isPro }
  }
  return { mode: 'classical', isPro: false }
}

async function evaluateCoincastUpgradeAccess(
  db: ContextVariables['db'],
  userId: string
): Promise<{ granted: boolean; consumeCredit: boolean; isPro: boolean }> {
  const nowIso = new Date().toISOString()
  const user = await db
    .select({
      credits: users.coincastCreditsRemaining,
      proUntil: users.coincastProExpiresAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get()

  if (!user) throw new HTTPException(404, { message: 'User not found' })

  const isPro = Boolean(user.proUntil && user.proUntil > nowIso)
  if (isPro) return { granted: true, consumeCredit: false, isPro: true }
  if (user.credits > 0) return { granted: true, consumeCredit: true, isPro: false }

  return { granted: false, consumeCredit: false, isPro: false }
}

function parsePortfolioResultJson(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    /* fall through */
  }
  return {}
}

function guardRefusalReason(reason: GuardReason): string {
  const messages: Partial<Record<GuardReason, string>> = {
    sensitive: 'This question touches topics that traditional divination does not address.',
    other_destiny: "Please ask about your own path, not someone else's fate chart.",
    too_short: 'Please phrase a sincere question in at least a few words.',
    insincere: 'Please ask with sincere intent, not as a test or joke.',
    duplicate_exact: 'You already asked this question recently. One matter, one cast.',
    duplicate_semantic:
      'This seems very similar to a recent question. Clarify or wait before asking again.',
    daily_limit: "You have reached today's divination limit. Rest and return tomorrow.",
  }
  return (
    messages[reason] ?? 'This question is not suited to divination under traditional principles.'
  )
}

async function applyCoincastRefusalPenalty(
  db: ContextVariables['db'],
  userId: string
): Promise<{ violationCount: number; showViolationWarning: boolean; bannedUntil: string | null }> {
  const row = await db
    .select({ v: users.coincastConsecutiveViolations })
    .from(users)
    .where(eq(users.id, userId))
    .get()
  const next = Number(row?.v ?? 0) + 1
  const bannedUntil =
    next >= COINCAST_VIOLATION_BAN_THRESHOLD
      ? new Date(Date.now() + COINCAST_BAN_DURATION_MS).toISOString()
      : null

  const patch: {
    coincastConsecutiveViolations: number
    updatedAt: string
    coincastBannedUntil?: string
  } = {
    coincastConsecutiveViolations: next,
    updatedAt: new Date().toISOString(),
  }
  if (bannedUntil) {
    patch.coincastBannedUntil = bannedUntil
  }
  await db.update(users).set(patch).where(eq(users.id, userId))

  return {
    violationCount: next,
    showViolationWarning: next >= COINCAST_VIOLATION_WARN_THRESHOLD,
    bannedUntil,
  }
}

function coincastMonthStartUtc(): string {
  return `${new Date().toISOString().slice(0, 7)}-01T00:00:00.000Z`
}

function coincastUtcDayStartIso(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}T00:00:00.000Z`
}

/**
 * CoinCast quota:
 * - Guest (anonymous install): 3 full readings per UTC calendar day; then sign in required (linked path).
 * - Linked user: 3 free full readings per calendar month (UTC), then consumable credits / Pro.
 */
async function evaluateCoincastQuota(
  db: ContextVariables['db'],
  opts: { userId: string | null; anonymousId: string | null }
): Promise<{ consumeCredit: boolean }> {
  const monthStart = coincastMonthStartUtc()
  const nowIso = new Date().toISOString()

  if (opts.userId) {
    const user = await db
      .select({
        credits: users.coincastCreditsRemaining,
        proUntil: users.coincastProExpiresAt,
      })
      .from(users)
      .where(eq(users.id, opts.userId))
      .get()

    if (!user) throw new HTTPException(404, { message: 'User not found' })

    if (user.proUntil && user.proUntil > nowIso) {
      return { consumeCredit: false }
    }

    const countRow = await db
      .select({ c: sql<number>`count(*)` })
      .from(portfolioReadings)
      .where(
        and(
          eq(portfolioReadings.targetApp, 'coincast'),
          eq(portfolioReadings.userId, opts.userId),
          gte(portfolioReadings.createdAt, monthStart)
        )
      )
      .get()

    const monthCount = Number(countRow?.c ?? 0)
    if (monthCount < COINCAST_FREE_READINGS_PER_MONTH) return { consumeCredit: false }
    if (user.credits > 0) return { consumeCredit: true }

    throw new HTTPException(402, { message: 'CoinCast monthly free limit reached' })
  }

  const anon = opts.anonymousId?.trim()
  if (!anon || anon.length < 8) {
    throw new HTTPException(422, { message: 'anonymous_id required for CoinCast preview' })
  }

  const dayStart = coincastUtcDayStartIso()
  const countRow = await db
    .select({ c: sql<number>`count(*)` })
    .from(portfolioReadings)
    .where(
      and(
        eq(portfolioReadings.targetApp, 'coincast'),
        isNull(portfolioReadings.userId),
        gte(portfolioReadings.createdAt, dayStart),
        sql`json_extract(${portfolioReadings.inputJson}, '$.anonymous_id') = ${anon}`
      )
    )
    .get()

  const dayCount = Number(countRow?.c ?? 0)
  if (dayCount >= COINCAST_FREE_GUEST_READINGS_PER_DAY) {
    throw new HTTPException(402, {
      message: 'CoinCast daily guest limit reached — sign in with Apple to continue',
    })
  }
  return { consumeCredit: false }
}

function stableHash(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) % 1_000_000
  }
  return Math.abs(h)
}

function timeIndexToHour(timeIndex: number): number {
  if (timeIndex === 0) return 0
  if (timeIndex === 12) return 23
  return timeIndex * 2 - 1
}

function parseSolarDate(date: string, timeIndex: number) {
  const [yearStr, monthStr, dayStr] = date.split('-')
  return {
    year: Number.parseInt(yearStr ?? '2000', 10),
    month: Number.parseInt(monthStr ?? '1', 10),
    day: Number.parseInt(dayStr ?? '1', 10),
    hour: timeIndexToHour(timeIndex),
  }
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function extractAiText(aiResponse: unknown): string {
  if (typeof aiResponse === 'string') return aiResponse
  if (!aiResponse || typeof aiResponse !== 'object') return ''
  const maybe = aiResponse as Record<string, unknown>
  const response = maybe.response
  if (typeof response === 'string') return response
  const text = maybe.text
  if (typeof text === 'string') return text
  const result = maybe.result
  if (typeof result === 'string') return result
  return ''
}

async function selectPortfolioMemoryEnabled(
  db: ContextVariables['db'],
  userId: string | undefined
): Promise<boolean> {
  if (!userId) return false
  const row = await db
    .select({ portfolioMemoryEnabled: users.portfolioMemoryEnabled })
    .from(users)
    .where(eq(users.id, userId))
    .get()
  return Boolean(row?.portfolioMemoryEnabled)
}

async function callPortfolioAI<T extends Record<string, unknown>>(
  c: {
    env: CloudflareBindings
  },
  prompt: string,
  fallback: T
): Promise<{ parsed: T; rawText: string }> {
  try {
    const aiRaw = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: [
        prompt,
        '',
        'Return STRICT JSON object only. No markdown, no prose outside JSON.',
      ].join('\n'),
      max_tokens: 700,
    })
    const rawText = extractAiText(aiRaw).trim()
    const parsed = safeJsonParse<T>(rawText)
    if (!parsed) return { parsed: fallback, rawText }
    return { parsed: { ...fallback, ...parsed }, rawText }
  } catch (err) {
    console.warn('[portfolio/ai] fallback due to AI error', err)
    return { parsed: fallback, rawText: '' }
  }
}

async function runTargetPipeline(
  c: {
    env: CloudflareBindings
    get: (key: 'db') => ContextVariables['db']
  },
  target: z.infer<typeof portfolioTargetSchema>,
  input: Record<string, unknown>,
  locale: string,
  userId?: string,
  requestId?: string,
  opts?: {
    faceVlmAuthorized?: boolean
    coincastMode?: CoincastInterpretationMode
    coincastIsPro?: boolean
  }
): Promise<{ readingType: string; output: Record<string, unknown> }> {
  switch (target) {
    case 'coincast': {
      const parsed = coincastInputSchema.parse(input)
      const entropy = parsed.entropy ?? `${Date.now()}_${Math.random()}`
      const promptTemplate = buildCoincastPrompt({ question: parsed.question, locale })
      const interpretationMode = opts?.coincastMode ?? 'classical'
      const coincastIsPro = opts?.coincastIsPro ?? false
      const db = c.get('db')
      const memoryOn =
        interpretationMode === 'ai' && userId
          ? await selectPortfolioMemoryEnabled(db, userId)
          : false
      let memoryContext = ''
      let memoryHitCount = 0
      if (memoryOn && userId) {
        const mem = await searchPortfolioReadingMemory(c.env, {
          userId,
          targetApp: 'coincast',
          query: parsed.question,
          requestId,
          locale,
        })
        memoryContext = mem.context
        memoryHitCount = mem.hitCount
      }
      const astro = await callAstro<{
        refused?: boolean
        refusal_reason?: string
        interpretationMode?: CoincastInterpretationMode
        classical?: Record<string, unknown>
        hexagram: { number: number; name: string; changingLines: number[] }
        interpretation: string
        advice: string
        summary: string
        fortune: string
      }>(c.env.SVC_ASTRO, '/yiching/cast', {
        question: parsed.question,
        entropy,
        userId: userId ?? `preview_${target}`,
        language: locale,
        method: 'liuyao',
        isPro: coincastIsPro,
        interpretationMode,
        yaoValues: parsed.yaoValues,
        memoryContext: memoryContext.length > 0 ? memoryContext : undefined,
      })
      if (astro.refused === true) {
        if (requestId) {
          console.log(
            JSON.stringify({
              event: 'portfolio_coincast_refused',
              requestId,
            })
          )
        }
        return {
          readingType: 'coincast_refused',
          output: {
            refusal_reason: typeof astro.refusal_reason === 'string' ? astro.refusal_reason : '',
            promptTemplate,
          },
        }
      }
      if (requestId) {
        console.log(
          JSON.stringify({
            event: 'portfolio_coincast_completed',
            requestId,
            interpretation_mode: astro.interpretationMode ?? interpretationMode,
            memory_hit_count: memoryHitCount,
            memory_enabled: memoryOn,
          })
        )
      }
      return {
        readingType: 'coincast',
        output: {
          ...astro,
          interpretationMode: astro.interpretationMode ?? interpretationMode,
          promptTemplate,
          ...(interpretationMode === 'ai'
            ? { portfolio_memory: { search_hits: memoryHitCount, enabled: memoryOn } }
            : {}),
        },
      }
    }
    case 'dreamoracle': {
      const parsed = dreamInputSchema.parse(input)
      const db = c.get('db')
      const memoryOn = await selectPortfolioMemoryEnabled(db, userId)
      let memoryContext = ''
      let memoryHitCount = 0
      if (memoryOn && userId) {
        const mem = await searchPortfolioReadingMemory(c.env, {
          userId,
          targetApp: 'dreamoracle',
          query: parsed.dreamText,
          requestId,
          locale,
        })
        memoryContext = mem.context
        memoryHitCount = mem.hitCount
      }
      const promptTemplate = buildDreamPrompt({
        dreamText: parsed.dreamText,
        locale,
        memoryContext: memoryContext.length > 0 ? memoryContext : undefined,
      })
      const ai = await callPortfolioAI(c, promptTemplate, {
        folk_lead: '',
        daoist_inner: '',
        yi_balance: '',
        action_72h: '',
        interpretation: '',
      } as Record<string, unknown>)
      const mergedInterpretation =
        typeof ai.parsed.interpretation === 'string' && ai.parsed.interpretation.trim().length > 0
          ? ai.parsed.interpretation.trim()
          : [
              String(ai.parsed.folk_lead ?? '').trim(),
              String(ai.parsed.daoist_inner ?? '').trim(),
              String(ai.parsed.yi_balance ?? '').trim(),
              String(ai.parsed.action_72h ?? '').trim(),
            ]
              .filter((s) => s.length > 0)
              .join('\n\n')
      if (requestId) {
        console.log(
          JSON.stringify({
            event: 'portfolio_dream_completed',
            requestId,
            memory_hit_count: memoryHitCount,
            memory_enabled: memoryOn,
          })
        )
      }
      return {
        readingType: 'dream',
        output: {
          ...ai.parsed,
          interpretation: mergedInterpretation,
          model: 'workers-ai',
          source: 'workers_ai_prompt',
          rawAiText: ai.rawText,
          promptTemplate,
          portfolio_memory: { search_hits: memoryHitCount, enabled: memoryOn },
        },
      }
    }
    case 'eightpillars': {
      const parsed = baziInputSchema.parse(input)
      const dt = parseSolarDate(parsed.solarDate, parsed.timeIndex)
      const pillars = getFourPillars(dt)
      const stems = ['wood', 'fire', 'earth', 'metal', 'water'] as const
      const dayMaster =
        stems[Math.abs(stableHash(`${parsed.solarDate}:${parsed.timeIndex}`)) % stems.length] ??
        'wood'
      const promptTemplate = buildEightPillarsPrompt({
        dayMaster,
        pillarsText: JSON.stringify(pillars),
        locale,
      })
      const ai = await callPortfolioAI(c, promptTemplate, {
        personality: `Your Day Master trends toward ${dayMaster}, favoring clarity over noise.`,
        strengths: [],
        challenges: [],
        actionable: '',
      } as Record<string, unknown>)
      return {
        readingType: 'eightpillars',
        output: {
          dayMaster,
          pillars,
          ...ai.parsed,
          personality: String(
            ai.parsed.personality ??
              `Your Day Master trends toward ${dayMaster}, favoring clarity over noise.`
          ),
          rawAiText: ai.rawText,
          promptTemplate,
        },
      }
    }
    case 'faceoracle': {
      const parsed = faceInputSchema.parse(input)
      const entitled = opts?.faceVlmAuthorized === true
      const db = c.get('db')

      const teaserFace: Record<string, string> = {
        overallAssessment: 'Balanced facial structure — preview only.',
        forehead: 'Strategic and long-horizon.',
        eyes: 'Sensitive to social atmosphere.',
        nose: 'Material instincts are stable.',
        mouth: 'Direct communication style.',
        chin: 'Late-stage persistence is strong.',
      }
      const teaserPalm: Record<string, string> = {
        overallAssessment: 'Palm lines preview — unlock for real extract.',
        lifeLine: 'Steady arc.',
        headLine: 'Clear path.',
        heartLine: 'Even curve.',
      }

      let faceFeatures = teaserFace
      let palmLeftFeatures = teaserPalm
      let palmRightFeatures = { ...teaserPalm }
      let visionMode: 'real' | 'teaser' = 'teaser'

      const loadFeature = async (id: string | undefined) => {
        if (!id || !userId) return null
        const row = await db
          .select({ featuresJson: userPhysiognomyFeatures.featuresJson })
          .from(userPhysiognomyFeatures)
          .where(
            and(eq(userPhysiognomyFeatures.id, id), eq(userPhysiognomyFeatures.userId, userId))
          )
          .get()
        if (!row) return null
        try {
          return JSON.parse(row.featuresJson) as Record<string, string>
        } catch {
          return null
        }
      }

      const extractPart = async (
        path: '/physiognomy/extract-features' | '/physiognomy/extract-palm-features',
        b64: string | undefined
      ) => {
        if (!b64) return null
        try {
          const extracted = await callAstro<{ features: Record<string, string> }>(
            c.env.SVC_ASTRO,
            path,
            { imageBase64: b64, mimeType: 'image/jpeg' },
            120_000
          )
          return extracted?.features ?? null
        } catch {
          return null
        }
      }

      if (entitled) {
        const fromIds = await Promise.all([
          loadFeature(parsed.faceFeatureId),
          loadFeature(parsed.palmLeftFeatureId),
          loadFeature(parsed.palmRightFeatureId),
        ])
        const fromVlm = await Promise.all([
          fromIds[0]
            ? fromIds[0]
            : extractPart(
                '/physiognomy/extract-features',
                parsed.faceImageBase64 ??
                  (parsed.mode === 'face' ? parsed.imageBase64 : undefined)
              ),
          fromIds[1]
            ? fromIds[1]
            : extractPart('/physiognomy/extract-palm-features', parsed.palmLeftImageBase64),
          fromIds[2]
            ? fromIds[2]
            : extractPart('/physiognomy/extract-palm-features', parsed.palmRightImageBase64),
        ])

        if (fromVlm[0] && fromVlm[1] && fromVlm[2]) {
          faceFeatures = fromVlm[0]
          palmLeftFeatures = fromVlm[1]
          palmRightFeatures = fromVlm[2]
          visionMode = 'real'
        }
      }

      const natalSummary =
        parsed.solarDate != null && parsed.timeIndex != null
          ? (() => {
              try {
                const dt = parseSolarDate(parsed.solarDate, parsed.timeIndex)
                const pillars = getFourPillars(dt)
                return `solar=${parsed.solarDate}; timeIndex=${parsed.timeIndex}; gender=${parsed.gender ?? '女'}; pillars=${JSON.stringify(pillars)}; city=${parsed.city ?? ''}`
              } catch {
                return `solar=${parsed.solarDate}; timeIndex=${parsed.timeIndex}; gender=${parsed.gender ?? '女'}`
              }
            })()
          : 'birth_missing'

      const promptTemplate = buildFaceOraclePrompt({
        faceFeatures: JSON.stringify(faceFeatures),
        palmLeftFeatures: JSON.stringify(palmLeftFeatures),
        palmRightFeatures: JSON.stringify(palmRightFeatures),
        natalSummary,
        locale,
        horizonMonths: parsed.horizonMonths ?? 3,
        outputKind: parsed.outputKind ?? 'oneshot',
        previousFeaturesJson: parsed.previousFeaturesJson,
        partialUpdate: parsed.partialParts,
      })
      const ai = await callPortfolioAI(c, promptTemplate, {
        overview: '',
        faceSection: '',
        palmLeftSection: '',
        palmRightSection: '',
        natalContrast: '',
        periodDiff: null,
        advice: '',
        events: [],
      } as Record<string, unknown>)

      // Never persist raw images (ADR-0028 privacy).
      return {
        readingType: 'faceoracle',
        output: {
          mode: 'face_palm',
          faceFeatureId: parsed.faceFeatureId ?? null,
          palmLeftFeatureId: parsed.palmLeftFeatureId ?? null,
          palmRightFeatureId: parsed.palmRightFeatureId ?? null,
          features: {
            face: faceFeatures,
            palmLeft: palmLeftFeatures,
            palmRight: palmRightFeatures,
          },
          birth: {
            solarDate: parsed.solarDate ?? null,
            timeIndex: parsed.timeIndex ?? null,
            gender: parsed.gender ?? null,
            city: parsed.city ?? null,
          },
          horizonMonths: parsed.horizonMonths ?? 3,
          outputKind: parsed.outputKind ?? 'oneshot',
          updateKind: parsed.updateKind ?? 'full',
          partialParts: parsed.partialParts ?? null,
          visionMode,
          aiInterpretation: ai.parsed,
          events: Array.isArray(ai.parsed.events) ? ai.parsed.events : [],
          rawAiText: ai.rawText,
          promptTemplate,
        },
      }
    }
    case 'soulmatch': {
      const parsed = soulMatchInputSchema.parse(input)
      const dtA = parseSolarDate(parsed.personA.solarDate, parsed.personA.timeIndex)
      const dtB = parseSolarDate(parsed.personB.solarDate, parsed.personB.timeIndex)
      const result = calculateHeHun(getFourPillars(dtA), getFourPillars(dtB))
      const promptTemplate = buildSoulMatchPrompt({
        gradeLabel: typeof result.grade === 'string' ? result.grade : undefined,
        locale,
      })
      const ai = await callPortfolioAI(c, promptTemplate, {
        summary: '',
        dimensions: [],
        advice: '',
        outlook: '',
      } as Record<string, unknown>)
      return {
        readingType: 'soulmatch',
        output: {
          ...(result as unknown as Record<string, unknown>),
          ...ai.parsed,
          rawAiText: ai.rawText,
          promptTemplate,
        },
      }
    }
    case 'starpalace': {
      const parsed = starPalaceInputSchema.parse(input)
      const palaceSeed = stableHash(`${parsed.solarDate}:${parsed.timeIndex}:${parsed.city ?? ''}`)
      const palaces = Array.from({ length: 12 }).map((_, idx) => ({
        palace: idx + 1,
        score: (palaceSeed + idx * 7) % 100,
      }))
      const promptTemplate = buildStarPalacePrompt({
        palaces: JSON.stringify(palaces),
        locale,
      })
      const ai = await callPortfolioAI(c, promptTemplate, {
        headline: 'Zi Wei chart generated for exploratory preview mode.',
        palaceInterpretations: [],
        dailySignal: ((palaceSeed % 5) + 1).toString(),
      } as Record<string, unknown>)
      return {
        readingType: 'starpalace',
        output: {
          birth: parsed,
          headline: String(
            ai.parsed.headline ?? 'Zi Wei chart generated for exploratory preview mode.'
          ),
          palaces,
          palaceInterpretations: ai.parsed.palaceInterpretations,
          dailySignal: String(ai.parsed.dailySignal ?? ((palaceSeed % 5) + 1).toString()),
          rawAiText: ai.rawText,
          promptTemplate,
        },
      }
    }
    case 'fengshui': {
      const parsed = fengShuiInputSchema.parse(input)
      return {
        readingType: 'fengshui',
        output: {
          roomType: parsed.roomType,
          concern: parsed.concern,
          recommendations: [
            'Open the room for 10-minute airflow every morning.',
            'Keep the main path clear of stacked objects.',
            'Anchor one stable light source in the focus corner.',
          ],
        },
      }
    }
    case 'numerology': {
      // 梅花易数 deterministic cast — based on current server time + optional
      // user-supplied observed number (邵雍先天数法). Pure compute, no LLM.
      // v1.5 will layer AI-narrated interpretation on top of these fields.
      const parsed = numerologyInputSchema.parse(input)
      const reading = castMeihua({
        observedNumber: parsed.observedNumber,
      })
      return {
        readingType: 'numerology',
        output: {
          ...(reading as unknown as Record<string, unknown>),
          question: parsed.question ?? null,
          castAt: new Date().toISOString(),
          interpretation: null,
        },
      }
    }
    default:
      throw new HTTPException(404, { message: 'Unknown portfolio target' })
  }
}

/**
 * Public preview endpoint for portfolio landing/tools traffic.
 * Turnstile check is applied by app-level middleware for callers that send
 * `x-client-platform: web` (same pattern as pair-preview public routes).
 */
portfolioRoutes.post('/preview/:target', async (c) => {
  const targetParsed = portfolioTargetSchema.safeParse(c.req.param('target'))
  if (!targetParsed.success) {
    throw new HTTPException(404, { message: 'Unknown portfolio target' })
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw new HTTPException(422, { message: 'Expected JSON body' })
  }
  const parsed = previewBodySchema.safeParse(body)
  if (!parsed.success) {
    throw new HTTPException(422, { message: 'Invalid preview payload' })
  }

  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const anonId =
    typeof parsed.data.input.anonymous_id === 'string' ? parsed.data.input.anonymous_id : undefined
  const { success } = await c.env.RATE_LIMITER.limit({
    key: `portfolio_preview:${targetParsed.data}:${anonId ?? `ip:${ip}`}`,
  })
  if (!success) throw new HTTPException(429, { message: 'Rate limited' })

  const db = c.get('db')
  let coincastPreviewOpts: { coincastMode: CoincastInterpretationMode; coincastIsPro: boolean } | undefined
  if (targetParsed.data === 'coincast') {
    await evaluateCoincastQuota(db, { userId: null, anonymousId: anonId ?? null })

    const question =
      typeof parsed.data.input.question === 'string' ? parsed.data.input.question.trim() : ''
    const guardUserId = anonId ? `anon:${anonId}` : `ip:${ip}`
    const guard = await checkDivinationGuard(question, guardUserId, {
      GUARD_KV: c.env.GUARD_KV,
      AI: c.env.AI,
    }, { skipSemantic: true })
    if (!guard.allowed) {
      return c.json({
        mode: 'refused',
        target: targetParsed.data,
        reason: guardRefusalReason(guard.reason),
        violationCount: 0,
        showViolationWarning: false,
      })
    }
    coincastPreviewOpts = { coincastMode: 'classical', coincastIsPro: false }
  }

  const locale = parsed.data.locale ?? 'en'
  const requestId = c.get('requestId')
  const pipeline = await runTargetPipeline(
    c,
    targetParsed.data,
    parsed.data.input,
    locale,
    undefined,
    requestId,
    coincastPreviewOpts
  )
  if (pipeline.readingType === 'coincast_refused') {
    const reason =
      typeof pipeline.output.refusal_reason === 'string' ? pipeline.output.refusal_reason : ''
    return c.json({
      mode: 'refused',
      target: targetParsed.data,
      reason,
      violationCount: 0,
      showViolationWarning: false,
    })
  }

  const readingId = nanoid()
  await db.insert(portfolioReadings).values({
    id: readingId,
    targetApp: targetParsed.data,
    readingType: pipeline.readingType,
    inputJson: JSON.stringify(parsed.data.input),
    resultJson: JSON.stringify(pipeline.output),
    ddlToken: parsed.data.ddlToken,
    locale,
  })

  if (targetParsed.data === 'coincast') {
    const question =
      typeof parsed.data.input.question === 'string' ? parsed.data.input.question.trim() : ''
    if (question.length > 0) {
      const guardUserId = anonId ? `anon:${anonId}` : `ip:${ip}`
      c.executionCtx.waitUntil(
        recordDivinationSuccess(question, guardUserId, {
          GUARD_KV: c.env.GUARD_KV,
          AI: c.env.AI,
        })
      )
    }
  }

  return c.json({
    mode: 'preview',
    target: targetParsed.data,
    readingId,
    output: pipeline.output,
    suggestedFlagship: suggestFlagship(targetParsed.data, parsed.data.questionType),
  })
})

/**
 * Signed endpoint for native clients with device secret (HMAC middleware).
 * This is where linked users should write durable readings once per target app.
 */
portfolioRoutes.post('/linked/:target', async (c) => {
  const targetParsed = portfolioTargetSchema.safeParse(c.req.param('target'))
  if (!targetParsed.success) {
    throw new HTTPException(404, { message: 'Unknown portfolio target' })
  }

  const userId = requireUserId(c)
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw new HTTPException(422, { message: 'Expected JSON body' })
  }
  const parsed = linkedBodySchema.safeParse(body)
  if (!parsed.success) {
    throw new HTTPException(422, { message: 'Invalid linked payload' })
  }

  const db = c.get('db')
  const user = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).get()
  if (!user) throw new HTTPException(404, { message: 'User not found' })

  // FaceOracle (ADR-0028): biometric consent + birth + three sources; pay via
  // faceoracle_pro (photo slots) OR one `face` credit (faceoracle_reading / universe).
  let faceVlmAuthorized = false
  let faceCreditSource: CreditSource | null = null
  if (targetParsed.data === 'faceoracle') {
    if (!(await hasBiometricConsent(db, userId))) {
      return c.json(
        { error: 'biometric_consent_required', consentVersion: BIOMETRIC_CONSENT_VERSION },
        403
      )
    }
    const faceIn = faceInputSchema.safeParse(parsed.data.input)
    if (!faceIn.success) {
      throw new HTTPException(422, { message: 'Invalid faceoracle payload' })
    }
    const fi = faceIn.data
    if (fi.solarDate == null || fi.timeIndex == null || fi.gender == null) {
      return c.json({ error: 'birth_required' }, 422)
    }
    const hasThree =
      (Boolean(fi.faceFeatureId) || Boolean(fi.faceImageBase64) || Boolean(fi.imageBase64)) &&
      (Boolean(fi.palmLeftFeatureId) || Boolean(fi.palmLeftImageBase64)) &&
      (Boolean(fi.palmRightFeatureId) || Boolean(fi.palmRightImageBase64))
    if (!hasThree) {
      return c.json({ error: 'three_photos_required' }, 422)
    }

    const isFacePro =
      (await hasActiveEntitlement(db, userId, 'faceoracle_pro')) ||
      (await hasActiveEntitlement(db, userId, 'universe_pro'))
    if (isFacePro) {
      const slots =
        fi.updateKind === 'partial' ? Math.max(1, fi.partialParts?.length ?? 1) : 3
      const slot = await checkAndConsumeFaceoraclePhotoSlots(db, userId, slots)
      if (!slot.granted) {
        return c.json(
          {
            error: 'photo_slot_exhausted',
            used: slot.used,
            limit: slot.limit,
            upsell: 'faceoracle_reading',
          },
          402
        )
      }
      faceVlmAuthorized = true
    } else {
      const access = await resolveEpisodicAccess(db, userId, 'face')
      if (!access.granted) {
        return c.json(
          {
            error: 'purchase_required',
            capability: 'face',
            upsell: access.upsellProductId,
          },
          402
        )
      }
      faceVlmAuthorized = true
      faceCreditSource = access.via
    }
  }

  if (targetParsed.data === 'coincast') {
    const banRow = await db
      .select({ until: users.coincastBannedUntil })
      .from(users)
      .where(eq(users.id, userId))
      .get()
    const nowIso = new Date().toISOString()
    if (banRow?.until && banRow.until > nowIso) {
      return c.json(
        {
          error: 'CoinCast temporarily paused',
          banned_until: banRow.until,
        },
        403
      )
    }
  }

  let coincastConsumeCredit = false
  let coincastMode: CoincastInterpretationMode = 'classical'
  let coincastIsPro = false
  if (targetParsed.data === 'coincast') {
    const q = await evaluateCoincastQuota(db, { userId, anonymousId: null })
    coincastConsumeCredit = q.consumeCredit
    const resolved = await resolveCoincastInterpretationMode(db, {
      userId,
      consumeCredit: coincastConsumeCredit,
    })
    coincastMode = resolved.mode
    coincastIsPro = resolved.isPro

    const question =
      typeof parsed.data.input.question === 'string' ? parsed.data.input.question.trim() : ''
    const guard = await checkDivinationGuard(question, userId, {
      GUARD_KV: c.env.GUARD_KV,
      AI: c.env.AI,
    }, { skipSemantic: coincastMode === 'classical' })
    if (!guard.allowed) {
      const penalty = await applyCoincastRefusalPenalty(db, userId)
      return c.json({
        mode: 'refused',
        target: targetParsed.data,
        userId,
        reason: guardRefusalReason(guard.reason),
        violationCount: penalty.violationCount,
        showViolationWarning: penalty.showViolationWarning,
        bannedUntil: penalty.bannedUntil,
      })
    }
  }

  // Low-band episodic apps (dream / numerology): EPISODIC_FREE_READINGS_PER_MONTH
  // free readings per month (counted from saved readings), then a ledger pack
  // credit; otherwise the in-app paywall (ADR-0013 P2.3). The credit is consumed
  // after a successful reading (below), mirroring CoinCast.
  let episodicConsume: CreditType | null = null
  if (targetParsed.data === 'dreamoracle' || targetParsed.data === 'numerology') {
    const creditType: CreditType = targetParsed.data === 'dreamoracle' ? 'dream' : 'numerology'
    const monthStart = coincastMonthStartUtc()
    const countRow = await db
      .select({ c: sql<number>`count(*)` })
      .from(portfolioReadings)
      .where(
        and(
          eq(portfolioReadings.targetApp, targetParsed.data),
          eq(portfolioReadings.userId, userId),
          gte(portfolioReadings.createdAt, monthStart)
        )
      )
      .get()
    const decision = decideEpisodicQuota(
      Number(countRow?.c ?? 0),
      EPISODIC_FREE_READINGS_PER_MONTH,
      await getCreditBalance(db, userId, creditType)
    )
    if (decision === 'paywall') {
      return c.json(
        {
          error: 'purchase_required',
          capability: creditType,
          upsell: upsellProductFor(creditType),
        },
        402
      )
    }
    if (decision === 'credit') episodicConsume = creditType
  }

  const locale = parsed.data.locale ?? 'en'
  const requestId = c.get('requestId')
  const pipeline = await runTargetPipeline(
    c,
    targetParsed.data,
    parsed.data.input,
    locale,
    userId,
    requestId,
    {
      faceVlmAuthorized,
      ...(targetParsed.data === 'coincast'
        ? { coincastMode, coincastIsPro }
        : {}),
    }
  )

  // Face refund-on-failure (ADR-0013 P3): the `face` credit was consumed up front; if the
  // real VLM didn't run (degraded to teaser), refund it to its source so the user isn't
  // charged for a teaser result. `faceCreditSource` is non-null only for faceoracle.
  if (faceCreditSource && (pipeline.output as { visionMode?: string }).visionMode !== 'real') {
    await refundCredit(db, userId, 'face', faceCreditSource)
  }

  if (pipeline.readingType === 'coincast_refused') {
    const penalty = await applyCoincastRefusalPenalty(db, userId)
    const reason =
      typeof pipeline.output.refusal_reason === 'string' ? pipeline.output.refusal_reason : ''
    return c.json({
      mode: 'refused',
      target: targetParsed.data,
      userId,
      reason,
      violationCount: penalty.violationCount,
      showViolationWarning: penalty.showViolationWarning,
      bannedUntil: penalty.bannedUntil,
    })
  }

  const readingId = nanoid()
  // Strip any accidental image payloads from stored input (ADR-0028).
  const storedInput =
    targetParsed.data === 'faceoracle'
      ? (() => {
          const raw = { ...parsed.data.input } as Record<string, unknown>
          for (const k of [
            'imageBase64',
            'faceImageBase64',
            'palmLeftImageBase64',
            'palmRightImageBase64',
          ]) {
            delete raw[k]
          }
          return raw
        })()
      : parsed.data.input

  await db.insert(portfolioReadings).values({
    id: readingId,
    userId,
    targetApp: targetParsed.data,
    readingType: pipeline.readingType,
    inputJson: JSON.stringify(storedInput),
    resultJson: JSON.stringify(pipeline.output),
    locale,
  })

  if (targetParsed.data === 'faceoracle' && (pipeline.output as { visionMode?: string }).visionMode === 'real') {
    const events = (pipeline.output as { events?: unknown }).events
    const horizon =
      typeof (pipeline.output as { horizonMonths?: number }).horizonMonths === 'number'
        ? (pipeline.output as { horizonMonths: number }).horizonMonths
        : 3
    const now = new Date().toISOString()
    await db
      .insert(physiognomyEvents)
      .values({
        id: nanoid(),
        userId,
        readingId,
        horizonMonths: horizon,
        eventsJson: JSON.stringify(Array.isArray(events) ? events : []),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: physiognomyEvents.userId,
        set: {
          readingId,
          horizonMonths: horizon,
          eventsJson: JSON.stringify(Array.isArray(events) ? events : []),
          updatedAt: now,
        },
      })
  }

  const memoryEnabledRow = await db
    .select({ portfolioMemoryEnabled: users.portfolioMemoryEnabled })
    .from(users)
    .where(eq(users.id, userId))
    .get()

  if (
    memoryEnabledRow?.portfolioMemoryEnabled &&
    (targetParsed.data === 'dreamoracle' ||
      targetParsed.data === 'numerology' ||
      targetParsed.data === 'coincast')
  ) {
    let bodyMarkdown: string | null = null
    let memTarget: 'dreamoracle' | 'numerology' | 'coincast' = 'dreamoracle'
    if (targetParsed.data === 'coincast') {
      const out = pipeline.output as Record<string, unknown>
      if (out.interpretationMode === 'ai') {
        const pin = coincastInputSchema.safeParse(parsed.data.input)
        const hex = (out.hexagram ?? {}) as { number?: number; name?: string }
        if (pin.success && typeof hex.number === 'number') {
          memTarget = 'coincast'
          bodyMarkdown = buildCoincastMemoryDocument({
            readingId,
            question: pin.data.question,
            summary: String(out.summary ?? ''),
            interpretation: String(out.interpretation ?? ''),
            hexName: typeof hex.name === 'string' ? hex.name : '',
            hexNumber: hex.number,
          })
        }
      }
    } else if (targetParsed.data === 'dreamoracle') {
      const pin = dreamInputSchema.safeParse(parsed.data.input)
      const out = pipeline.output as Record<string, unknown>
      if (pin.success) {
        memTarget = 'dreamoracle'
        bodyMarkdown = buildDreamMemoryDocument({
          readingId,
          dreamText: pin.data.dreamText,
          interpretation: String(out.interpretation ?? ''),
        })
      }
    } else {
      // numerology — meihua hexagram cast (Phase K pivot, replaces Western numerology).
      const pin = numerologyInputSchema.safeParse(parsed.data.input)
      const out = pipeline.output as Record<string, unknown>
      if (pin.success) {
        memTarget = 'numerology'
        const nuclear = (out.nuclearHexagram ?? {}) as Record<string, unknown>
        bodyMarkdown = buildNumerologyMemoryDocument({
          readingId,
          question: pin.data.question ?? null,
          observedNumber: Number(pin.data.observedNumber ?? 0),
          upperNumber: Number(out.upperNumber ?? 0),
          lowerNumber: Number(out.lowerNumber ?? 0),
          changingLineNumber: Number(out.changingLineNumber ?? 0),
          bodyTrigramNumber: Number(out.bodyTrigramNumber ?? 0),
          useTrigramNumber: Number(out.useTrigramNumber ?? 0),
          nuclearUpperNumber: Number(nuclear.upperNumber ?? 0),
          nuclearLowerNumber: Number(nuclear.lowerNumber ?? 0),
          castAt: String(out.castAt ?? new Date().toISOString()),
        })
      }
    }
    if (bodyMarkdown) {
      const ctx = c as { executionCtx?: ExecutionContext }
      ctx.executionCtx?.waitUntil(
        indexPortfolioReadingMemory(c.env, {
          userId,
          readingId,
          targetApp: memTarget,
          locale,
          bodyMarkdown,
        })
      )
    }
  }

  if (targetParsed.data === 'coincast') {
    await db
      .update(users)
      .set({
        coincastConsecutiveViolations: 0,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId))

    const question =
      typeof parsed.data.input.question === 'string' ? parsed.data.input.question.trim() : ''
    if (question.length > 0) {
      c.executionCtx.waitUntil(
        recordDivinationSuccess(question, userId, {
          GUARD_KV: c.env.GUARD_KV,
          AI: c.env.AI,
        })
      )
    }
  }

  if (targetParsed.data === 'coincast' && coincastConsumeCredit) {
    await db
      .update(users)
      .set({
        coincastCreditsRemaining: sql`coincast_credits_remaining - 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(users.id, userId), sql`coincast_credits_remaining > 0`))
  }

  // dream / numerology: spend the ledger pack credit only after a successful reading.
  if (episodicConsume) {
    await consumeCredit(db, userId, episodicConsume)
  }

  return c.json({
    mode: 'linked',
    target: targetParsed.data,
    userId,
    readingId,
    output: pipeline.output,
    suggestedFlagship: suggestFlagship(targetParsed.data, parsed.data.questionType),
  })
})

portfolioRoutes.post('/linked/coincast/:readingId/upgrade-ai', async (c) => {
  const userId = requireUserId(c)
  const readingId = c.req.param('readingId')
  const db = c.get('db')
  const requestId = c.get('requestId')

  const row = await db
    .select({
      inputJson: portfolioReadings.inputJson,
      resultJson: portfolioReadings.resultJson,
      locale: portfolioReadings.locale,
    })
    .from(portfolioReadings)
    .where(
      and(
        eq(portfolioReadings.id, readingId),
        eq(portfolioReadings.userId, userId),
        eq(portfolioReadings.targetApp, 'coincast')
      )
    )
    .get()

  if (!row) throw new HTTPException(404, { message: 'Reading not found' })

  const previous = parsePortfolioResultJson(row.resultJson)
  if (previous.interpretationMode === 'ai') {
    throw new HTTPException(409, { message: 'already_upgraded' })
  }

  const access = await evaluateCoincastUpgradeAccess(db, userId)
  if (!access.granted) {
    return c.json(
      {
        error: 'purchase_required',
        upsell: 'coincast_cast_pack_1',
      },
      402
    )
  }

  let inputParsed: z.infer<typeof coincastInputSchema>
  try {
    const rawInput: unknown = JSON.parse(row.inputJson)
    inputParsed = coincastInputSchema.parse(rawInput)
  } catch {
    throw new HTTPException(422, { message: 'Invalid stored cast input' })
  }

  const locale = row.locale ?? 'en'
  const memoryOn = await selectPortfolioMemoryEnabled(db, userId)
  let memoryContext = ''
  let memoryHitCount = 0
  if (memoryOn) {
    const mem = await searchPortfolioReadingMemory(c.env, {
      userId,
      targetApp: 'coincast',
      query: inputParsed.question,
      requestId,
      locale,
    })
    memoryContext = mem.context
    memoryHitCount = mem.hitCount
  }

  const entropy = inputParsed.entropy ?? `${Date.now()}_${Math.random()}`
  const astro = await callAstro<{
    refused?: boolean
    refusal_reason?: string
    interpretationMode?: CoincastInterpretationMode
    classical?: Record<string, unknown>
    hexagram: { number: number; name: string; changingLines: number[] }
    interpretation: string
    advice: string
    summary: string
    fortune: string
  }>(c.env.SVC_ASTRO, '/yiching/cast', {
    question: inputParsed.question,
    entropy,
    userId,
    language: locale,
    method: 'liuyao',
    isPro: access.isPro,
    interpretationMode: 'ai',
    yaoValues: inputParsed.yaoValues,
    memoryContext: memoryContext.length > 0 ? memoryContext : undefined,
  })

  if (astro.refused === true) {
    console.error(
      JSON.stringify({
        event: 'portfolio_coincast_upgrade_refused',
        requestId,
        readingId,
        reason: astro.refusal_reason ?? '',
      })
    )
    throw new HTTPException(500, { message: 'Upgrade interpretation failed' })
  }

  const merged: Record<string, unknown> = {
    ...previous,
    ...astro,
    interpretationMode: 'ai',
    classical: previous.classical ?? astro.classical,
    aiUpgradedAt: new Date().toISOString(),
    portfolio_memory: { search_hits: memoryHitCount, enabled: memoryOn },
  }

  if (access.consumeCredit) {
    const debit = await db
      .update(users)
      .set({
        coincastCreditsRemaining: sql`coincast_credits_remaining - 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(users.id, userId), sql`coincast_credits_remaining > 0`))
      .returning({ id: users.id })
      .get()
    if (!debit) {
      throw new HTTPException(402, { message: 'purchase_required' })
    }
  }

  await db
    .update(portfolioReadings)
    .set({ resultJson: JSON.stringify(merged) })
    .where(eq(portfolioReadings.id, readingId))

  if (memoryOn) {
    const hex = (astro.hexagram ?? {}) as { number?: number; name?: string }
    if (typeof hex.number === 'number') {
      const bodyMarkdown = buildCoincastMemoryDocument({
        readingId,
        question: inputParsed.question,
        summary: String(astro.summary ?? ''),
        interpretation: String(astro.interpretation ?? ''),
        hexName: typeof hex.name === 'string' ? hex.name : '',
        hexNumber: hex.number,
      })
      const ctx = c as { executionCtx?: ExecutionContext }
      ctx.executionCtx?.waitUntil(
        indexPortfolioReadingMemory(c.env, {
          userId,
          readingId,
          targetApp: 'coincast',
          locale,
          bodyMarkdown,
        })
      )
    }
  }

  return c.json({
    readingId,
    output: merged,
  })
})

portfolioRoutes.get('/readings/:target/:readingId', async (c) => {
  const targetParsed = portfolioTargetSchema.safeParse(c.req.param('target'))
  if (!targetParsed.success) {
    throw new HTTPException(404, { message: 'Unknown portfolio target' })
  }

  const readingId = c.req.param('readingId')
  const userId = requireUserId(c)
  const db = c.get('db')

  const row = await db
    .select({
      id: portfolioReadings.id,
      readingType: portfolioReadings.readingType,
      inputJson: portfolioReadings.inputJson,
      resultJson: portfolioReadings.resultJson,
      locale: portfolioReadings.locale,
      createdAt: portfolioReadings.createdAt,
    })
    .from(portfolioReadings)
    .where(
      and(
        eq(portfolioReadings.id, readingId),
        eq(portfolioReadings.userId, userId),
        eq(portfolioReadings.targetApp, targetParsed.data)
      )
    )
    .get()

  if (!row) throw new HTTPException(404, { message: 'Reading not found' })
  return c.json({ reading: row })
})

portfolioRoutes.delete('/readings/:target/:readingId', async (c) => {
  const targetParsed = portfolioTargetSchema.safeParse(c.req.param('target'))
  if (!targetParsed.success) {
    throw new HTTPException(404, { message: 'Unknown portfolio target' })
  }

  const readingId = c.req.param('readingId')
  const userId = requireUserId(c)
  const db = c.get('db')

  const existing = await db
    .select({ id: portfolioReadings.id })
    .from(portfolioReadings)
    .where(
      and(
        eq(portfolioReadings.id, readingId),
        eq(portfolioReadings.userId, userId),
        eq(portfolioReadings.targetApp, targetParsed.data)
      )
    )
    .get()

  if (!existing) {
    throw new HTTPException(404, { message: 'Reading not found' })
  }

  await db
    .delete(portfolioReadings)
    .where(
      and(
        eq(portfolioReadings.id, readingId),
        eq(portfolioReadings.userId, userId),
        eq(portfolioReadings.targetApp, targetParsed.data)
      )
    )

  if (targetParsed.data === 'coincast' || targetParsed.data === 'dreamoracle') {
    const ctx = c as { executionCtx?: ExecutionContext }
    ctx.executionCtx?.waitUntil(deletePortfolioReadingMemory(c.env, userId, readingId))
  }

  return c.json({ ok: true })
})

portfolioRoutes.get('/memory-preference', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')
  const row = await db
    .select({
      portfolioMemoryEnabled: users.portfolioMemoryEnabled,
      crossAppMemoryEnabled: users.crossAppMemoryEnabled,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get()
  return c.json({
    enabled: Boolean(row?.portfolioMemoryEnabled),
    crossAppEnabled: Boolean(row?.crossAppMemoryEnabled),
  })
})

portfolioRoutes.put('/memory-preference', async (c) => {
  const userId = requireUserId(c)
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw new HTTPException(422, { message: 'Expected JSON body' })
  }
  const parsed = portfolioMemoryPreferenceSchema.safeParse(body)
  if (!parsed.success) {
    throw new HTTPException(422, { message: 'Invalid memory preference payload' })
  }
  const db = c.get('db')
  const updates: {
    updatedAt: string
    portfolioMemoryEnabled?: boolean
    crossAppMemoryEnabled?: boolean
  } = { updatedAt: new Date().toISOString() }
  if (parsed.data.enabled !== undefined) updates.portfolioMemoryEnabled = parsed.data.enabled
  if (parsed.data.crossAppEnabled !== undefined) {
    updates.crossAppMemoryEnabled = parsed.data.crossAppEnabled
  }
  await db.update(users).set(updates).where(eq(users.id, userId))

  return c.json({
    ok: true,
    ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
    ...(parsed.data.crossAppEnabled !== undefined
      ? { crossAppEnabled: parsed.data.crossAppEnabled }
      : {}),
  })
})

// ============================================================================
// Chapter-unlock invitations
// ============================================================================

const inviteChapterUnlockSchema = z.object({
  targetEmail: z.string().email().max(254),
  message: z.string().trim().max(280).optional(),
})

/**
 * Send a chapter-unlock invite to a friend's email. When the recipient
 * downloads HexAstral and confirms the same email (see user.ts email/confirm),
 * the inviter's `unlockedChapterCount` is incremented by 1, capped at
 * `CHAPTER_UNLOCK_CAP`. Requires the inviter to have a bound email — without
 * one we can't surface the inviter identity in the email and the user has no
 * incentive to be the inviter anyway.
 */
portfolioRoutes.post('/invite-chapter-unlock', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw new HTTPException(422, { message: 'Expected JSON body' })
  }
  const parsed = inviteChapterUnlockSchema.safeParse(body)
  if (!parsed.success) {
    throw new HTTPException(422, { message: 'Invalid invite payload' })
  }

  const inviter = await db
    .select({
      email: users.email,
      name: users.name,
      locale: users.locale,
      unlockedChapterCount: users.unlockedChapterCount,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get()

  if (!inviter) throw new HTTPException(404, { message: 'User not found' })
  if (!inviter.email) {
    throw new HTTPException(409, {
      message: 'Bind your own email before inviting friends.',
    })
  }
  if (inviter.unlockedChapterCount >= CHAPTER_UNLOCK_CAP) {
    throw new HTTPException(409, {
      message: 'You already hold every chapter — no more invites needed.',
    })
  }

  const targetEmail = parsed.data.targetEmail.trim().toLowerCase()
  if (targetEmail === inviter.email.toLowerCase()) {
    throw new HTTPException(422, { message: 'You cannot invite yourself.' })
  }

  // Avoid spam: one pending invite per (inviter, target) pair at a time.
  const existing = await db
    .select({ id: chapterUnlockInvitations.id })
    .from(chapterUnlockInvitations)
    .where(
      and(
        eq(chapterUnlockInvitations.inviterUserId, userId),
        eq(chapterUnlockInvitations.targetEmail, targetEmail),
        eq(chapterUnlockInvitations.status, 'pending')
      )
    )
    .get()
  if (existing) {
    throw new HTTPException(409, {
      message: 'An invite to this email is already pending.',
    })
  }

  const id = nanoid()
  const token = nanoid(32)
  const now = Date.now()
  const expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()
  await db.insert(chapterUnlockInvitations).values({
    id,
    inviterUserId: userId,
    targetEmail,
    token,
    status: 'pending',
    message: parsed.data.message ?? null,
    expiresAt,
  })

  // Send the email best-effort. Failures roll back the row so the inviter can
  // retry without seeing a phantom "pending" invite to a never-emailed person.
  //
  // Note: the URL does NOT carry the invite token. Redemption is purely
  // email-on-bind (see `claimChapterUnlocksForEmail`) — B opening the email,
  // installing the app, and confirming THIS email address is what credits
  // the inviter. No DDL / attribution token needed.
  const inviterName = inviter.name ?? 'A friend'
  const inviteUrl = 'https://apps.apple.com/app/hexastral/id6739739495'
  const html = buildChapterUnlockInviteHtml({
    inviterName,
    targetEmail,
    message: parsed.data.message,
    inviteUrl,
  })

  try {
    await mailerClient.post(c.env.SVC_MAILER, '/send', {
      to: targetEmail,
      subject: `${inviterName} invited you to HexAstral`,
      html,
      ...(inviter.email ? { replyTo: inviter.email } : {}),
    })
  } catch (err) {
    await db.delete(chapterUnlockInvitations).where(eq(chapterUnlockInvitations.id, id))
    console.error('[portfolio.invite-chapter-unlock] mailer failed', userId, err)
    throw new HTTPException(502, { message: 'Failed to send invite email — try again.' })
  }

  return c.json({ id, token, expiresAt })
})

/** A's own pending chapter-unlock invites — used by the client to render "waiting for B" UI. */
portfolioRoutes.get('/invite-chapter-unlock/pending', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')
  const rows = await db
    .select({
      id: chapterUnlockInvitations.id,
      targetEmail: chapterUnlockInvitations.targetEmail,
      createdAt: chapterUnlockInvitations.createdAt,
      expiresAt: chapterUnlockInvitations.expiresAt,
    })
    .from(chapterUnlockInvitations)
    .where(
      and(
        eq(chapterUnlockInvitations.inviterUserId, userId),
        eq(chapterUnlockInvitations.status, 'pending')
      )
    )
    .orderBy(desc(chapterUnlockInvitations.createdAt))
    .all()
  return c.json({ invites: rows })
})

portfolioRoutes.post('/soulmatch/invite', async (c) => {
  const token = crypto.randomUUID().replace(/-/g, '')
  const kvKey = `ddl:${token}`
  await c.env.DDL_KV.put(
    kvKey,
    JSON.stringify({
      meta: {
        targetApp: 'soulmatch',
      },
      createdAt: Date.now(),
    }),
    { expirationTtl: 60 * 30 }
  )
  return c.json({
    ddlToken: token,
    inviteUrl: `https://www.hexastral.com/en/lp/compatibility?ddl=${token}`,
  })
})

portfolioRoutes.put('/birth-info', async (c) => {
  const userId = requireUserId(c)
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw new HTTPException(422, { message: 'Expected JSON body' })
  }
  const parsed = portfolioBirthInfoSchema.safeParse(body)
  if (!parsed.success) throw new HTTPException(422, { message: 'Invalid birth info payload' })

  const db = c.get('db')

  // Quota gate: load prior state + Pro status, then classify the incoming PUT.
  // `assertBirthEditQuota` throws BIRTH_EDIT_QUOTA_EXHAUSTED for a free user's
  // 2nd chart-altering edit. First-add + no_change pass through untouched.
  const prior = await db
    .select({
      birthSolarDate: users.birthSolarDate,
      birthTimeIndex: users.birthTimeIndex,
      // Precise-time fields are chart-altering — include them so the quota
      // classifier counts a 真太阳时 / clock-only edit (else prior≠next on the
      // omitted field would either miss the edit or false-consume the quota).
      birthClockMinutes: users.birthClockMinutes,
      birthSolarCalibrate: users.birthSolarCalibrate,
      birthGender: users.birthGender,
      birthEditUsed: users.birthEditUsed,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get()
  if (!prior) throw new HTTPException(404, { message: 'User not found' })

  const nextInput: BirthEditInput = {
    birthSolarDate: parsed.data.birthSolarDate,
    birthTimeIndex: parsed.data.birthTimeIndex,
    birthClockMinutes: parsed.data.birthClockMinutes ?? null,
    birthSolarCalibrate: parsed.data.birthSolarCalibrate ?? null,
    gender: (parsed.data.gender ?? prior.birthGender ?? '男') as '男' | '女',
  }
  const isPro = await userHasCapability(db, userId, 'fate')
  const disposition = assertBirthEditQuota(prior, nextInput, isPro)

  await db
    .update(users)
    .set({
      birthSolarDate: parsed.data.birthSolarDate,
      birthTimeIndex: parsed.data.birthTimeIndex,
      birthGender: parsed.data.gender,
      birthCity: parsed.data.birthCity,
      birthLatitude: parsed.data.birthLatitude,
      birthLongitude: parsed.data.birthLongitude,
      birthTimezoneId: parsed.data.birthTimezoneId,
      // Precise-time disclosure (真太阳时) — clock minutes + calibration toggle.
      birthClockMinutes: parsed.data.birthClockMinutes ?? null,
      birthSolarCalibrate: parsed.data.birthSolarCalibrate ?? null,
      // 农历 round-trip so re-editing restores the user's calendar choice exactly.
      birthCalendarType: parsed.data.birthCalendarType,
      birthLunarDate: parsed.data.birthLunarInput,
      birthIsLeapMonth: parsed.data.birthLunarIsLeap ?? false,
      // Consume the lifetime correction the moment the free-tier write lands.
      ...(disposition === 'consume_quota' && !isPro ? { birthEditUsed: true } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, userId))

  // Mirrors `/api/user/:userId/birth-info`: invalidate + rebuild the natal
  // skeleton (and the report_chapters cache via the same helper) so
  // `/u/[username]/chart` and the chapter fetcher both pick up fresh data.
  c.executionCtx.waitUntil(rebuildUserCharts(db, c.env, userId))

  return c.json({ ok: true, disposition })
})

portfolioRoutes.get('/birth-info', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')
  const row = await db
    .select({
      birthSolarDate: users.birthSolarDate,
      birthTimeIndex: users.birthTimeIndex,
      gender: users.birthGender,
      birthCity: users.birthCity,
      birthLatitude: users.birthLatitude,
      birthLongitude: users.birthLongitude,
      birthTimezoneId: users.birthTimezoneId,
      birthClockMinutes: users.birthClockMinutes,
      birthSolarCalibrate: users.birthSolarCalibrate,
      birthCalendarType: users.birthCalendarType,
      birthLunarInput: users.birthLunarDate,
      birthLunarIsLeap: users.birthIsLeapMonth,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get()
  return c.json({ birthInfo: row ?? null })
})

portfolioRoutes.get('/eightpillars/daily', async (c) => {
  const parsed = eightPillarsDailyQuerySchema.safeParse(c.req.query())
  if (!parsed.success) throw new HTTPException(422, { message: 'Invalid daily query' })

  const date = parsed.data.date ?? new Date().toISOString().slice(0, 10)
  const dayMaster = parsed.data.dayMaster ?? 'wood'
  const ai = await callPortfolioAI(
    c,
    [
      'Role: Bazi daily guide assistant.',
      'Task: provide concise daily guidance.',
      `Date: ${date}`,
      `DayMaster: ${dayMaster}`,
      'Return JSON with keys: guidance, favorable, caution.',
    ].join('\n'),
    {
      guidance: `Today's ${dayMaster} rhythm favors focused execution. Finish one high-impact task before noon and avoid context switching.`,
      favorable: ['Deep work', 'Planning', 'Skill practice'],
      caution: ['Impulsive spending', 'Overcommitting'],
    } as Record<string, unknown>
  )
  return c.json({
    date,
    dayMaster,
    guidance: String(ai.parsed.guidance),
    favorable: ai.parsed.favorable,
    caution: ai.parsed.caution,
    rawAiText: ai.rawText,
  })
})

portfolioRoutes.get('/readings/:target', async (c) => {
  const targetParsed = portfolioTargetSchema.safeParse(c.req.param('target'))
  if (!targetParsed.success) {
    throw new HTTPException(404, { message: 'Unknown portfolio target' })
  }

  const queryParsed = readingsQuerySchema.safeParse(c.req.query())
  if (!queryParsed.success) {
    throw new HTTPException(422, { message: 'Invalid readings query' })
  }

  const userId = requireUserId(c)
  const db = c.get('db')
  const { cursor, limit } = queryParsed.data

  let cursorCreatedAt: string | null = null
  let cursorId: string | null = null
  if (cursor) {
    const [createdAt, id] = cursor.split('|')
    if (!createdAt || !id) {
      throw new HTTPException(422, { message: 'Invalid cursor format' })
    }
    cursorCreatedAt = createdAt
    cursorId = id
  }

  const whereExpr =
    cursorCreatedAt && cursorId
      ? and(
          eq(portfolioReadings.userId, userId),
          eq(portfolioReadings.targetApp, targetParsed.data),
          or(
            lt(portfolioReadings.createdAt, cursorCreatedAt),
            and(
              eq(portfolioReadings.createdAt, cursorCreatedAt),
              lt(portfolioReadings.id, cursorId)
            )
          )
        )
      : and(
          eq(portfolioReadings.userId, userId),
          eq(portfolioReadings.targetApp, targetParsed.data)
        )

  const rows = await db
    .select({
      id: portfolioReadings.id,
      readingType: portfolioReadings.readingType,
      inputJson: portfolioReadings.inputJson,
      resultJson: portfolioReadings.resultJson,
      locale: portfolioReadings.locale,
      createdAt: portfolioReadings.createdAt,
    })
    .from(portfolioReadings)
    .where(whereExpr)
    .orderBy(desc(portfolioReadings.createdAt), desc(portfolioReadings.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const next = hasMore ? items[items.length - 1] : null

  return c.json({
    readings: items,
    cursor: next ? `${next.createdAt}|${next.id}` : null,
  })
})

const crossTargetQuerySchema = z.object({
  cursor: z.string().max(128).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  targets: z.string().max(200).optional(),
})

portfolioRoutes.get('/readings', async (c) => {
  const queryParsed = crossTargetQuerySchema.safeParse(c.req.query())
  if (!queryParsed.success) {
    throw new HTTPException(422, { message: 'Invalid readings query' })
  }

  const userId = requireUserId(c)
  const db = c.get('db')
  const { cursor, limit, targets } = queryParsed.data

  const targetFilter = targets
    ? targets.split(',').filter((t) => portfolioTargetSchema.safeParse(t).success)
    : null

  let cursorCreatedAt: string | null = null
  let cursorId: string | null = null
  if (cursor) {
    const [createdAt, id] = cursor.split('|')
    if (!createdAt || !id) {
      throw new HTTPException(422, { message: 'Invalid cursor format' })
    }
    cursorCreatedAt = createdAt
    cursorId = id
  }

  const conditions = [eq(portfolioReadings.userId, userId)]
  if (targetFilter && targetFilter.length > 0) {
    conditions.push(
      sql`${portfolioReadings.targetApp} IN (${sql.join(
        targetFilter.map((t) => sql`${t}`),
        sql`, `
      )})`
    )
  }
  if (cursorCreatedAt && cursorId) {
    conditions.push(
      or(
        lt(portfolioReadings.createdAt, cursorCreatedAt),
        and(eq(portfolioReadings.createdAt, cursorCreatedAt), lt(portfolioReadings.id, cursorId))
      )!
    )
  }

  const rows = await db
    .select({
      id: portfolioReadings.id,
      targetApp: portfolioReadings.targetApp,
      readingType: portfolioReadings.readingType,
      inputJson: portfolioReadings.inputJson,
      resultJson: portfolioReadings.resultJson,
      createdAt: portfolioReadings.createdAt,
    })
    .from(portfolioReadings)
    .where(and(...conditions))
    .orderBy(desc(portfolioReadings.createdAt), desc(portfolioReadings.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const next = hasMore ? items[items.length - 1] : null

  return c.json({
    readings: items,
    cursor: next ? `${next.createdAt}|${next.id}` : null,
  })
})

const memoryTargetSchema = z.enum(['hexastral', 'coincast', 'dreamoracle', 'numerology'])

const memorySearchQuerySchema = z.object({
  query: z.string().min(2).max(500),
  target: memoryTargetSchema.optional(),
})

portfolioRoutes.get('/memory/search', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')

  const memoryEnabled = await selectPortfolioMemoryEnabled(db, userId)
  if (!memoryEnabled) {
    return c.json({ context: '', hitCount: 0, enabled: false })
  }

  const queryParsed = memorySearchQuerySchema.safeParse(c.req.query())
  if (!queryParsed.success) {
    throw new HTTPException(422, { message: 'Invalid memory search query' })
  }

  const targetApp = queryParsed.data.target ?? 'coincast'
  const result = await searchPortfolioReadingMemory(c.env, {
    userId,
    targetApp,
    query: queryParsed.data.query,
    requestId: c.get('requestId'),
  })

  return c.json({ ...result, enabled: true })
})

/**
 * HTML body for the chapter-unlock invite email. Mirrors the
 * `buildInvitationEmailHtml` shape in bonds.ts so the look is consistent
 * across viral surfaces — but the call to action and disclosure language are
 * tailored to the chapter-unlock semantic (no biometric / chart data exchange,
 * just "download and bind this email").
 */
function buildChapterUnlockInviteHtml(opts: {
  inviterName: string
  targetEmail: string
  message?: string | null
  inviteUrl: string
}): string {
  const { inviterName, targetEmail, message, inviteUrl } = opts
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e4e4e7;">
      <tr><td style="padding:40px 32px;text-align:center;">
        <p style="margin:0 0 8px;font-size:11px;color:#71717a;letter-spacing:4px;text-transform:uppercase;">HEXASTRAL</p>
        <h1 style="margin:0 0 24px;font-size:22px;font-weight:300;color:#09090b;letter-spacing:1px;line-height:1.4;">
          ${inviterName} invited you<br>to discover your chart
        </h1>
        ${message ? `<p style="margin:0 0 24px;font-size:13px;color:#52525b;line-height:1.6;font-style:italic;">"${message}"</p>` : ''}
        <p style="margin:0 0 28px;font-size:13px;color:#71717a;line-height:1.6;">
          Download HexAstral and confirm this email (<strong style="color:#09090b;">${targetEmail}</strong>)<br>
          to receive your own birth chart reading — and unlock one more chapter for ${inviterName}.
        </p>
        <a href="${inviteUrl}" style="display:inline-block;padding:14px 40px;background:#09090b;color:#fafafa;font-size:13px;font-weight:500;letter-spacing:2px;text-decoration:none;text-transform:uppercase;">
          Download HexAstral →
        </a>
        <p style="margin:24px 0 0;font-size:11px;color:#a1a1aa;line-height:1.6;">
          This invitation expires in 7 days. No action is needed to decline.
        </p>
        <p style="margin:16px 0 0;border-top:1px solid #f4f4f5;padding-top:16px;font-size:10px;color:#a1a1aa;line-height:1.6;">
          You received this one-time invitation because ${inviterName} entered your email.
          Your email is used only to deliver this invitation — it is not added to any mailing list, and no
          further emails are sent unless you respond.
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}
