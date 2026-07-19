/**
 * FaceOracle / Xingqi reading interpretation runner (queue consumer).
 * Paywall consumed at enqueue; refunds on fail-closed paths.
 */

import { callWithFallback } from '@zhop/ai-vision'
import { getFourPillars } from '@zhop/astro-core/ganzhi'
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

type ChapterPayload = {
  kind: FaceOracleChapterKind
  goldenLine: string
  evidence: string
  dynamic: string
  reef: string | null
  remedy: string | null
  counterpoint: string | null
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
  const first = body.trim().split(/[。.!?\n]/)[0]?.trim() ?? body.trim().slice(0, 48)
  return {
    kind,
    goldenLine: first.slice(0, 80),
    evidence: body.trim(),
    dynamic: '',
    reef: null,
    remedy: null,
    counterpoint: zh
      ? '文化研习参考，不作命运断语。'
      : 'Cultural study framing — not deterministic fate.',
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
): Promise<{ parsed: Record<string, unknown> | null; rawText: string }> {
  const systemPrompt = [
    'You are a careful East-Asian physiognomy + BaZi cultural interpreter.',
    'Reply with ONE JSON object only. No markdown fences. No prose outside JSON.',
  ].join(' ')

  try {
    const rawText = (
      await callWithFallback(env, systemPrompt, prompt, {
        tier: 'flagship',
        locale,
        maxTokens: 4500,
        temperature: 0.35,
        jsonMode: true,
        metricLabel: 'faceoracle_reading',
        // Queue consumer — allow full flagship cascade under Workers queue budget.
        totalBudgetMs: 90_000,
        perModelTimeoutMs: 45_000,
      })
    ).trim()
    const parsed = safeJsonParse<Record<string, unknown>>(rawText)
    return { parsed, rawText }
  } catch (err) {
    console.warn('[faceoracle-job/ai] flagship failed', err)
    return { parsed: null, rawText: '' }
  }
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
  const zh = locale.startsWith('zh')
  const title = opts.ok
    ? zh
      ? '形气解读已完成'
      : 'Your reading is ready'
    : zh
      ? '解读未能完成'
      : 'Reading did not finish'
  const body = opts.ok
    ? zh
      ? '点按查看本期形气。'
      : 'Tap to open your reading.'
    : zh
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
  try {
    const dt = parseSolarDate(job.solarDate, job.timeIndex)
    const pillars = getFourPillars(dt)
    natalSummary = `solar=${job.solarDate}; timeIndex=${job.timeIndex}; gender=${job.gender}; pillars=${JSON.stringify(pillars)}; city=${job.city ?? ''}`
  } catch {
    // keep simple natalSummary
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

  const ai = await callReadingAi(env, promptTemplate, job.locale)
  if (!ai.parsed) {
    await failJob(db, job, 'ai_failed', true)
    return
  }
  let normalized = normalizeFaceoracleInterpretation(ai.parsed, job.locale)
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
    const retry = await callReadingAi(env, retryPrompt, job.locale)
    if (retry.parsed) {
      const again = normalizeFaceoracleInterpretation(retry.parsed, job.locale)
      if (again && interpretationHasBody(again)) {
        normalized = again
      }
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
