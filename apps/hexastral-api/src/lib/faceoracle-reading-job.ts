/**
 * FaceOracle / Xingqi reading interpretation runner (queue consumer).
 * Paywall consumed at enqueue; refunds on fail-closed paths.
 */

import { callWithFallback } from '@zhop/ai-vision'
import {
  calculateDaYun,
  getDaYunAtYear,
  getLiuNian,
  type Gender,
} from '@zhop/astro-core/dayun'
import { getFourPillars } from '@zhop/astro-core/ganzhi'
import {
  auditHardForbiddenHits,
  auditSoftForbiddenHits,
  buildComplianceInstructionBlock,
  buildForbiddenRewriteSuffix,
} from '@zhop/portfolio-voice'
import { and, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import {
  faceoracleJobs,
  faceoraclePushSubs,
  physiognomyEvents,
  portfolioReadings,
  userPhysiognomyFeatures,
} from '../db/schema'
import type { AppDb, CloudflareBindings } from '../infra-types'
import type { CreditSource } from '../services/credits'
import { refundCredit } from '../services/credits'
import { refundFaceoraclePhotoSlots, refundFaceoracleReportRegen } from '../services/quota'
import { sendExpoPushMessages } from './expo-push'
import {
  buildFaceOraclePrompt,
  faceoracleDensityGaps,
  type FaceOracleChapterKind,
} from './prompts/faceoracle'
import { faceoracleBodyLooksWrongLocale } from './prompts/faceoracle-locale'

const CHAPTER_KINDS: FaceOracleChapterKind[] = [
  'overview',
  'face',
  'palms',
  'natal',
  'period',
  'advice',
]

type JobRow = typeof faceoracleJobs.$inferSelect

type ChapterCitation = { locus: string; note: string }

type ChapterPayload = {
  kind: FaceOracleChapterKind
  goldenLine: string
  evidence: string
  dynamic: string
  reef: string | null
  remedy: string | null
  counterpoint: string | null
  citations: ChapterCitation[]
}

function parseCitations(raw: unknown): ChapterCitation[] {
  if (!Array.isArray(raw)) return []
  const out: ChapterCitation[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const locus = asNonEmptyString(o.locus)
    const note = asNonEmptyString(o.note)
    if (locus && note) out.push({ locus, note })
  }
  return out
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
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1)) as T
      } catch {
        return null
      }
    }
    return null
  }
}

async function loadFeatureJson(
  db: AppDb,
  userId: string,
  id: string
): Promise<Record<string, string> | null> {
  const row = await db
    .select({ featuresJson: userPhysiognomyFeatures.featuresJson })
    .from(userPhysiognomyFeatures)
    .where(and(eq(userPhysiognomyFeatures.id, id), eq(userPhysiognomyFeatures.userId, userId)))
    .get()
  if (!row) return null
  try {
    return JSON.parse(row.featuresJson) as Record<string, string>
  } catch {
    return null
  }
}

function compactFeatures(features: Record<string, string>): string {
  return Object.entries(features)
    .filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
    .map(([k, v]) => `${k}=${v.trim().slice(0, 160)}`)
    .join('; ')
}

function asNonEmptyString(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length > 0 ? t : null
}

function chapterFromFlat(
  kind: FaceOracleChapterKind,
  body: string | null,
  locale: string
): ChapterPayload | null {
  if (!body || body.trim().length < 12) return null
  const zh = locale.startsWith('zh')
  const hant =
    locale.startsWith('zh-Hant') || locale === 'zh-TW' || locale === 'zh-HK'
  const first = body.trim().split(/[。.!?\n]/)[0]?.trim() ?? body.trim().slice(0, 48)
  const counterpoint = !zh
    ? 'Cultural study framing — not deterministic fate.'
    : hant
      ? '文化研習參考，不作命運斷語。'
      : '文化研习参考，不作命运断语。'
  return {
    kind,
    goldenLine: first.slice(0, 80),
    evidence: body.trim(),
    dynamic: '',
    reef: null,
    remedy: null,
    counterpoint,
    citations: [],
  }
}

function parseChapter(raw: unknown): ChapterPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const kind = o.kind
  if (typeof kind !== 'string' || !CHAPTER_KINDS.includes(kind as FaceOracleChapterKind)) {
    return null
  }
  const goldenLine = asNonEmptyString(o.goldenLine)
  const evidence = asNonEmptyString(o.evidence)
  if (!goldenLine && !evidence) return null
  return {
    kind: kind as FaceOracleChapterKind,
    goldenLine: goldenLine ?? (evidence ?? '').slice(0, 80),
    evidence: evidence ?? goldenLine ?? '',
    dynamic: asNonEmptyString(o.dynamic) ?? '',
    reef: asNonEmptyString(o.reef),
    remedy: asNonEmptyString(o.remedy),
    counterpoint: asNonEmptyString(o.counterpoint),
    citations: parseCitations(o.citations),
  }
}

/** Normalize AI JSON → chapters[] + flat mirrors. */
export function normalizeFaceoracleInterpretation(
  parsed: Record<string, unknown>,
  locale: string
): {
  chapters: ChapterPayload[]
  flat: Record<string, unknown>
} | null {
  const byKind = new Map<FaceOracleChapterKind, ChapterPayload>()
  if (Array.isArray(parsed.chapters)) {
    for (const item of parsed.chapters) {
      const ch = parseChapter(item)
      if (ch) byKind.set(ch.kind, ch)
    }
  }

  const flatOverview = asNonEmptyString(parsed.overview)
  const flatFace = asNonEmptyString(parsed.faceSection)
  const flatLeft = asNonEmptyString(parsed.palmLeftSection)
  const flatRight = asNonEmptyString(parsed.palmRightSection)
  const flatNatal = asNonEmptyString(parsed.natalContrast)
  const flatPeriod = asNonEmptyString(parsed.periodDiff)
  const flatAdvice = asNonEmptyString(parsed.advice)

  if (!byKind.has('overview')) {
    const ch = chapterFromFlat('overview', flatOverview, locale)
    if (ch) byKind.set('overview', ch)
  }
  if (!byKind.has('face')) {
    const ch = chapterFromFlat('face', flatFace, locale)
    if (ch) byKind.set('face', ch)
  }
  if (!byKind.has('palms')) {
    const palms = [flatLeft, flatRight].filter(Boolean).join('\n\n')
    const ch = chapterFromFlat('palms', palms || null, locale)
    if (ch) byKind.set('palms', ch)
  }
  if (!byKind.has('natal')) {
    const ch = chapterFromFlat('natal', flatNatal, locale)
    if (ch) byKind.set('natal', ch)
  }
  if (!byKind.has('period')) {
    const ch = chapterFromFlat('period', flatPeriod, locale)
    if (ch) byKind.set('period', ch)
  }
  if (!byKind.has('advice')) {
    const ch = chapterFromFlat('advice', flatAdvice, locale)
    if (ch) byKind.set('advice', ch)
  }

  const chapters = CHAPTER_KINDS.map((k) => byKind.get(k)).filter(
    (c): c is ChapterPayload => Boolean(c)
  )
  // Require core body: overview + at least one of face/palms/natal/advice
  const hasCore =
    byKind.has('overview') &&
    (byKind.has('face') || byKind.has('palms') || byKind.has('natal') || byKind.has('advice'))
  if (!hasCore || chapters.length < 2) return null

  const overview = byKind.get('overview')
  const face = byKind.get('face')
  const palms = byKind.get('palms')
  const natal = byKind.get('natal')
  const period = byKind.get('period')
  const advice = byKind.get('advice')

  const flat: Record<string, unknown> = {
    overview: flatOverview ?? overview?.evidence ?? overview?.goldenLine ?? '',
    faceSection: flatFace ?? face?.evidence ?? '',
    palmLeftSection: flatLeft ?? '',
    palmRightSection: flatRight ?? '',
    natalContrast: flatNatal ?? natal?.evidence ?? '',
    periodDiff: flatPeriod ?? period?.evidence ?? null,
    advice: flatAdvice ?? advice?.evidence ?? '',
    chapters,
    events: Array.isArray(parsed.events) ? parsed.events : [],
  }
  if (palms && !flatLeft && !flatRight) {
    flat.palmLeftSection = palms.evidence
  }
  return { chapters, flat }
}

function interpretationHasBody(normalized: {
  chapters: ChapterPayload[]
  flat: Record<string, unknown>
}): boolean {
  if (normalized.chapters.length >= 2) {
    const text = normalized.chapters
      .map((c) => `${c.goldenLine}${c.evidence}${c.dynamic}`)
      .join('')
    return text.trim().length > 40
  }
  const keys = ['overview', 'faceSection', 'advice'] as const
  return keys.some(
    (k) => typeof normalized.flat[k] === 'string' && (normalized.flat[k] as string).trim().length > 12
  )
}

async function callReadingAi(
  env: CloudflareBindings,
  prompt: string,
  locale: string
): Promise<{ parsed: Record<string, unknown> | null; rawText: string; error?: string }> {
  const systemPrompt = [
    'You are a careful East-Asian physiognomy + BaZi cultural interpreter.',
    'Reply with ONE JSON object only. No markdown fences. No prose outside JSON.',
    buildComplianceInstructionBlock(locale),
  ].join('\n')

  try {
    // Cap at 4096 — several CF Workers AI models reject higher max_tokens and
    // the whole flagship cascade then fails as ai_failed.
    const rawText = (
      await callWithFallback(env, systemPrompt, prompt, {
        tier: 'flagship',
        locale,
        maxTokens: 4096,
        temperature: 0.35,
        jsonMode: true,
        // Qwen soft-switch + Kimi chat_template_kwargs.thinking:false (router).
        noThink: true,
        metricLabel: 'faceoracle_reading',
        // 6-chapter dense JSON — keep under queue wall-clock; equal-split cascade
        // needs ~40s/model headroom so Kimi can finish before GLM is starved.
        totalBudgetMs: 120_000,
        perModelTimeoutMs: 55_000,
      })
    ).trim()
    const parsed = safeJsonParse<Record<string, unknown>>(rawText)
    if (!parsed) {
      return {
        parsed: null,
        rawText,
        error: `json_parse_failed:${rawText.slice(0, 120)}`,
      }
    }
    return { parsed, rawText }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[faceoracle-job/ai] flagship failed', message)
    return { parsed: null, rawText: '', error: message.slice(0, 400) }
  }
}

function proseFromNormalized(normalized: {
  chapters: ChapterPayload[]
  flat: Record<string, unknown>
}): string {
  const chapterText = normalized.chapters
    .map(
      (c) =>
        `${c.goldenLine}\n${c.evidence}\n${c.dynamic}\n${c.reef ?? ''}\n${c.remedy ?? ''}\n${c.counterpoint ?? ''}\n${c.citations.map((x) => `${x.locus} ${x.note}`).join('\n')}`
    )
    .join('\n')
  const events = Array.isArray(normalized.flat.events) ? normalized.flat.events : []
  const eventText = events
    .map((ev) => {
      if (!ev || typeof ev !== 'object') return ''
      const e = ev as Record<string, unknown>
      return `${asNonEmptyString(e.theme) ?? ''} ${asNonEmptyString(e.note) ?? ''}`
    })
    .join('\n')
  return `${chapterText}\n${eventText}`
}

async function setJobStage(
  db: AppDb,
  jobId: string,
  stage: 'queued' | 'interpreting' | 'done' | 'failed',
  progress: number,
  extras?: { readingId?: string; errorMessage?: string; finishedAt?: string }
): Promise<void> {
  await db
    .update(faceoracleJobs)
    .set({
      stage,
      progress,
      ...(extras?.readingId !== undefined ? { readingId: extras.readingId } : {}),
      ...(extras?.errorMessage !== undefined ? { errorMessage: extras.errorMessage } : {}),
      ...(extras?.finishedAt !== undefined ? { finishedAt: extras.finishedAt } : {}),
    })
    .where(eq(faceoracleJobs.id, jobId))
}

export async function refundFaceoracleJobAccess(db: AppDb, job: JobRow): Promise<void> {
  if (job.refunded) return
  try {
    if (job.accessVia === 'face_credit' && job.creditSource) {
      const source = job.creditSource as CreditSource
      if (source === 'purchased' || source === 'allowance') {
        await refundCredit(db, job.userId, 'face', source)
      }
    } else if (job.accessVia === 'pro_slots' && job.slotsCharged > 0) {
      await refundFaceoraclePhotoSlots(db, job.userId, job.slotsCharged)
    } else if (job.accessVia === 'pro_report_regen') {
      await refundFaceoracleReportRegen(db, job.userId)
    }
  } catch (err) {
    console.error('[faceoracle-job] refund failed', job.id, err)
  }
  await db.update(faceoracleJobs).set({ refunded: true }).where(eq(faceoracleJobs.id, job.id))
}

async function notifyReadingReady(
  db: AppDb,
  opts: {
    userId: string
    locale: string
    readingId: string
    jobId: string
    ok: boolean
  }
): Promise<void> {
  const sub = await db
    .select({ token: faceoraclePushSubs.token, locale: faceoraclePushSubs.locale })
    .from(faceoraclePushSubs)
    .where(eq(faceoraclePushSubs.userId, opts.userId))
    .get()
  if (!sub?.token) return

  const locale = sub.locale || opts.locale
  const hant =
    locale.startsWith('zh-Hant') ||
    locale === 'zh-TW' ||
    locale === 'zh-HK' ||
    locale.toLowerCase().startsWith('zh-hant') ||
    locale.toLowerCase().startsWith('zh-tw') ||
    locale.toLowerCase().startsWith('zh-hk')
  const hans = !hant && locale.startsWith('zh')
  const title = opts.ok
    ? hant
      ? '形氣解讀已完成'
      : hans
        ? '形气解读已完成'
        : 'Your reading is ready'
    : hant
      ? '解讀未能完成'
      : hans
        ? '解读未能完成'
        : 'Reading did not finish'
  const body = opts.ok
    ? hant
      ? '點按查看本期形氣。'
      : hans
        ? '点按查看本期形气。'
        : 'Tap to open your reading.'
    : hant
      ? '請打開應用重試或查看詳情。'
      : hans
        ? '请打开应用重试或查看详情。'
        : 'Open the app to see details or retry.'

  const { invalidTokens } = await sendExpoPushMessages([
    {
      to: sub.token,
      title,
      body,
      data: {
        kind: opts.ok ? 'reading_ready' : 'reading_failed',
        readingId: opts.readingId,
        jobId: opts.jobId,
        targetApp: 'faceoracle',
      },
    },
  ])
  if (invalidTokens.length > 0) {
    const bad = invalidTokens[0]
    if (bad) {
      await db.delete(faceoraclePushSubs).where(eq(faceoraclePushSubs.token, bad))
    }
  }
}

async function failJob(
  db: AppDb,
  job: JobRow,
  errorMessage: string,
  notify: boolean
): Promise<void> {
  await refundFaceoracleJobAccess(db, job)
  await setJobStage(db, job.id, 'failed', 100, {
    errorMessage: errorMessage.slice(0, 480),
    finishedAt: new Date().toISOString(),
  })
  if (notify && job.notifyOnComplete) {
    await notifyReadingReady(db, {
      userId: job.userId,
      locale: job.locale,
      readingId: job.readingId ?? '',
      jobId: job.id,
      ok: false,
    })
  }
}

const STALE_JOB_MS = 15 * 60 * 1000

/** Mark stuck queued/interpreting jobs failed + refund. */
export async function sweepStaleFaceoracleJobs(db: AppDb, userId: string): Promise<number> {
  const rows = await db
    .select()
    .from(faceoracleJobs)
    .where(and(eq(faceoracleJobs.userId, userId)))
  const now = Date.now()
  let n = 0
  for (const job of rows) {
    if (job.stage !== 'queued' && job.stage !== 'interpreting') continue
    const started = Date.parse(job.startedAt || job.createdAt)
    if (!Number.isFinite(started) || now - started < STALE_JOB_MS) continue
    await failJob(db, job, 'stale_timeout', true)
    n += 1
  }
  return n
}

/**
 * Run interpretation for a queued job. Throws on hard failure (caller retries).
 */
export async function runFaceoracleReadingJob(
  env: CloudflareBindings,
  db: AppDb,
  jobId: string
): Promise<void> {
  const job = await db.select().from(faceoracleJobs).where(eq(faceoracleJobs.id, jobId)).get()
  if (!job) return
  if (job.stage === 'done' || job.stage === 'failed') return
  // Idempotent: already persisted a reading
  if (job.readingId) {
    await setJobStage(db, jobId, 'done', 100, {
      readingId: job.readingId,
      finishedAt: job.finishedAt ?? new Date().toISOString(),
    })
    return
  }

  await setJobStage(db, jobId, 'interpreting', 20)

  const [face, palmL, palmR] = await Promise.all([
    loadFeatureJson(db, job.userId, job.faceFeatureId),
    loadFeatureJson(db, job.userId, job.palmLeftFeatureId),
    loadFeatureJson(db, job.userId, job.palmRightFeatureId),
  ])
  if (!face || !palmL || !palmR) {
    await failJob(db, job, 'features_missing', true)
    return
  }

  let natalSummary = `solar=${job.solarDate}; timeIndex=${job.timeIndex}; gender=${job.gender}`
  let natalFacts: Record<string, string> | null = null
  try {
    const dt = parseSolarDate(job.solarDate, job.timeIndex)
    const pillars = getFourPillars(dt)
    const gender: Gender = job.gender === '女' ? '女' : '男'
    const nowYear = new Date().getUTCFullYear()
    const dayun = calculateDaYun(dt, gender)
    const currentStep = getDaYunAtYear(dayun, nowYear)
    const liunian = getLiuNian(nowYear)
    const nextLiunian = getLiuNian(nowYear + 1)
    const dayunLine = currentStep
      ? `currentDaYun=${currentStep.ganZhi.label} ages=${currentStep.startAge}-${currentStep.endAge} years=${currentStep.startYear}-${currentStep.endYear}`
      : `dayunStartAge=${dayun.startAge.rounded}`
    natalSummary = [
      `solar=${job.solarDate}`,
      `timeIndex=${job.timeIndex}`,
      `gender=${job.gender}`,
      `city=${job.city ?? ''}`,
      `pillars=${JSON.stringify(pillars)}`,
      `dayunDirection=${dayun.direction}`,
      dayunLine,
      `liuNian=${nowYear}:${liunian.label}`,
      `nextLiuNian=${nowYear + 1}:${nextLiunian.label}`,
    ].join('; ')
    natalFacts = {
      solarDate: job.solarDate,
      gender: job.gender,
      dayMaster: pillars.day.stem,
      dayPillar: pillars.day.label,
      dayun: currentStep?.ganZhi.label ?? '',
      dayunYears: currentStep
        ? `${currentStep.startYear}-${currentStep.endYear}`
        : '',
      liuNian: `${nowYear} ${liunian.label}`,
      nextLiuNian: `${nowYear + 1} ${nextLiunian.label}`,
    }
    console.info('[faceoracle-job] natalFacts', { jobId, natalFacts })
  } catch (err) {
    console.warn('[faceoracle-job] natal inject failed', {
      jobId,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  const outputKind =
    job.outputKind === 'period_brief' || job.outputKind === 'deep' || job.outputKind === 'oneshot'
      ? job.outputKind
      : 'oneshot'
  const horizonMonths = job.horizonMonths === 6 ? 6 : 3

  const promptTemplate = buildFaceOraclePrompt({
    faceFeatures: compactFeatures(face),
    palmLeftFeatures: compactFeatures(palmL),
    palmRightFeatures: compactFeatures(palmR),
    natalSummary,
    locale: job.locale,
    horizonMonths,
    outputKind,
  })

  await setJobStage(db, jobId, 'interpreting', 50)

  let normalized: ReturnType<typeof normalizeFaceoracleInterpretation> = null
  const ai = await callReadingAi(env, promptTemplate, job.locale)
  if (ai.parsed) {
    normalized = normalizeFaceoracleInterpretation(ai.parsed, job.locale)
  } else {
    console.warn('[faceoracle-job] primary AI miss — compact retry', {
      jobId,
      error: ai.error,
    })
    const compactPrompt = [
      promptTemplate,
      '',
      'COMPACT RETRY: Keep every chapter field, but tighten prose slightly so the',
      'full JSON fits. Output ONLY valid JSON.',
    ].join('\n')
    const retry = await callReadingAi(env, compactPrompt, job.locale)
    if (!retry.parsed) {
      await failJob(
        db,
        job,
        `ai_failed:${(retry.error ?? ai.error ?? 'unknown').slice(0, 200)}`,
        true
      )
      return
    }
    normalized = normalizeFaceoracleInterpretation(retry.parsed, job.locale)
  }
  if (!normalized || !interpretationHasBody(normalized)) {
    await failJob(db, job, 'ai_empty', true)
    return
  }

  // Locale drift guard (en/ja): one retry with stronger language lead if CJK-heavy.
  const proseSample = normalized.chapters
    .map((c) => `${c.goldenLine}\n${c.evidence}\n${c.dynamic}\n${c.reef ?? ''}\n${c.remedy ?? ''}`)
    .join('\n')
  if (faceoracleBodyLooksWrongLocale(job.locale, proseSample)) {
    console.warn('[faceoracle-job] locale drift — retrying', { jobId, locale: job.locale })
    const retryPrompt = [
      promptTemplate,
      '',
      'CRITICAL RETRY: Previous draft violated the output language. Rewrite the ENTIRE JSON',
      'so every user-facing string is in the required language. No Chinese sentences.',
    ].join('\n')
    const langRetry = await callReadingAi(env, retryPrompt, job.locale)
    if (langRetry.parsed) {
      const again = normalizeFaceoracleInterpretation(langRetry.parsed, job.locale)
      if (again && interpretationHasBody(again)) {
        normalized = again
      }
    }
  }

  // Density floors (citations + three axes): one soft retry, then accept best draft.
  const densitySource = {
    chapters: normalized.chapters,
    events: normalized.flat.events,
  }
  let densityGaps = faceoracleDensityGaps(densitySource, normalized.chapters)
  if (densityGaps.length > 0) {
    console.warn('[faceoracle-job] density gaps — retrying', { jobId, gaps: densityGaps })
    const densityPrompt = [
      promptTemplate,
      '',
      'DENSITY RETRY: Previous draft failed floors:',
      densityGaps.join(', '),
      'Rewrite the ENTIRE JSON. Require face≥3 citations, palms≥3, natal≥2,',
      'events≥3 covering axis career+love+health, and advice actions for all three axes.',
      'Keep 警示/预告 voice. Output ONLY valid JSON.',
    ].join('\n')
    const densRetry = await callReadingAi(env, densityPrompt, job.locale)
    if (densRetry.parsed) {
      const densAgain = normalizeFaceoracleInterpretation(densRetry.parsed, job.locale)
      if (densAgain && interpretationHasBody(densAgain)) {
        const againGaps = faceoracleDensityGaps(
          { chapters: densAgain.chapters, events: densAgain.flat.events },
          densAgain.chapters
        )
        if (againGaps.length <= densityGaps.length) {
          normalized = densAgain
          densityGaps = againGaps
        }
      }
    }
    if (densityGaps.length > 0) {
      console.warn('[faceoracle-job] density still soft-short', { jobId, gaps: densityGaps })
    }
  }

  // ADR-0003: hard forbidden substring audit — one rewrite, then accept (no stub fail).
  const auditText = proseFromNormalized(normalized)
  const softHits = auditSoftForbiddenHits(auditText)
  if (softHits.length > 0) {
    console.warn('[faceoracle-job] soft forbidden hits', {
      jobId,
      patterns: softHits.map((h) => h.pattern),
    })
  }
  let hardHits = auditHardForbiddenHits(auditText)
  if (hardHits.length > 0) {
    console.warn('[faceoracle-job] hard forbidden — rewriting', {
      jobId,
      patterns: hardHits.map((h) => h.pattern),
    })
    const forbidPrompt = [
      promptTemplate,
      '',
      buildForbiddenRewriteSuffix(hardHits),
      'Keep classical loci, citations, dated windows, and three-axis coverage.',
      'Do not replace specificity with empty positivity. Output ONLY valid JSON.',
    ].join('\n')
    const forbidRetry = await callReadingAi(env, forbidPrompt, job.locale)
    if (forbidRetry.parsed) {
      const forbidAgain = normalizeFaceoracleInterpretation(forbidRetry.parsed, job.locale)
      if (forbidAgain && interpretationHasBody(forbidAgain)) {
        normalized = forbidAgain
        hardHits = auditHardForbiddenHits(proseFromNormalized(normalized))
      }
    }
    if (hardHits.length > 0) {
      console.warn('[faceoracle-job] hard forbidden still present after rewrite', {
        jobId,
        patterns: hardHits.map((h) => h.pattern),
      })
    }
  }

  const interpretation = normalized.flat
  const events = Array.isArray(interpretation.events) ? interpretation.events : []

  const readingId = nanoid()
  const output: Record<string, unknown> = {
    mode: 'face_palm',
    faceFeatureId: job.faceFeatureId,
    palmLeftFeatureId: job.palmLeftFeatureId,
    palmRightFeatureId: job.palmRightFeatureId,
    features: { face, palmLeft: palmL, palmRight: palmR },
    birth: {
      solarDate: job.solarDate,
      timeIndex: job.timeIndex,
      gender: job.gender,
      city: job.city ?? null,
    },
    natalFacts,
    horizonMonths,
    outputKind,
    updateKind: 'full',
    partialParts: null,
    visionMode: 'real',
    aiInterpretation: interpretation,
    chapters: normalized.chapters,
    events,
    rawAiText: ai.rawText,
    promptTemplate,
  }

  const storedInput = {
    faceFeatureId: job.faceFeatureId,
    palmLeftFeatureId: job.palmLeftFeatureId,
    palmRightFeatureId: job.palmRightFeatureId,
    solarDate: job.solarDate,
    timeIndex: job.timeIndex,
    gender: job.gender,
    city: job.city ?? undefined,
    horizonMonths,
    outputKind,
    updateKind: 'full',
  }

  const finishedAt = new Date().toISOString()
  const evNow = finishedAt

  // Atomic-ish: reading + events + job done in one D1 batch
  await db.batch([
    db.insert(portfolioReadings).values({
      id: readingId,
      userId: job.userId,
      targetApp: 'faceoracle',
      readingType: 'faceoracle',
      inputJson: JSON.stringify(storedInput),
      resultJson: JSON.stringify(output),
      locale: job.locale,
    }),
    db
      .insert(physiognomyEvents)
      .values({
        id: nanoid(),
        userId: job.userId,
        readingId,
        horizonMonths,
        eventsJson: JSON.stringify(events),
        createdAt: evNow,
        updatedAt: evNow,
      })
      .onConflictDoUpdate({
        target: physiognomyEvents.userId,
        set: {
          readingId,
          horizonMonths,
          eventsJson: JSON.stringify(events),
          updatedAt: evNow,
        },
      }),
    db
      .update(faceoracleJobs)
      .set({
        stage: 'done',
        progress: 100,
        readingId,
        finishedAt,
        errorMessage: null,
      })
      .where(eq(faceoracleJobs.id, jobId)),
    db
      .update(faceoraclePushSubs)
      .set({ lastReadingAt: evNow, lastActiveAt: evNow })
      .where(eq(faceoraclePushSubs.userId, job.userId)),
  ])

  if (job.notifyOnComplete) {
    await notifyReadingReady(db, {
      userId: job.userId,
      locale: job.locale,
      readingId,
      jobId,
      ok: true,
    })
  }
}

export async function markFaceoracleJobFailed(
  db: AppDb,
  jobId: string,
  message: string
): Promise<void> {
  const job = await db.select().from(faceoracleJobs).where(eq(faceoracleJobs.id, jobId)).get()
  if (!job || job.stage === 'done' || job.stage === 'failed') return
  await failJob(db, job, message, true)
}
