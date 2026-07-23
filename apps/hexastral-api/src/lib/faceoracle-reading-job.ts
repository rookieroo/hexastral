/**
 * FaceOracle / Xingqi reading interpretation runner (queue consumer).
 * Paywall consumed at enqueue; refunds on fail-closed paths.
 */

import { callWithFallback } from '@zhop/ai-vision'
import { calculateDaYun, type Gender, getDaYunAtYear, getLiuNian } from '@zhop/astro-core/dayun'
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
  buildLocusIndex,
  buildLocusIndexFromLoci,
  type LocusCitation,
  type LocusPart,
  parseLandmarksJson,
  type ReadingLandmarks,
} from './faceoracle-landmarks'
import {
  assessLociCoverage,
  buildSuggestedLoci,
  formatSuggestedLociBlock,
} from './faceoracle-suggested-loci'
import {
  buildFaceOracleChaptersPrompt,
  buildFaceOracleLociPrompt,
  type FaceOracleChapterKind,
  faceoracleCautionObservations,
  faceoracleDensityGaps,
  faceoracleSoftObservations,
} from './prompts/faceoracle'
import {
  buildFaceoracleLanguageReminder,
  faceoracleBodyLooksWrongLocale,
  faceoracleFieldsLookWrongLocale,
  faceoracleZhLooksEnglishLeaky,
} from './prompts/faceoracle-locale'

const CHAPTER_KINDS: FaceOracleChapterKind[] = ['overview', 'face', 'palms', 'natal', 'horizon']

/** Legacy kinds still accepted when remapping old model output / stored drafts. */
const LEGACY_CHAPTER_KINDS = new Set(['period', 'advice'])

type JobRow = typeof faceoracleJobs.$inferSelect

type ChapterCitation = LocusCitation

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

const LOCUS_PARTS = new Set<LocusPart>(['face', 'palm_l', 'palm_r'])

function inferPartFromChapter(kind: FaceOracleChapterKind, featureKey: string): LocusPart {
  if (kind === 'face') return 'face'
  const palmKeys = new Set([
    'handShape',
    'lifeLine',
    'headLine',
    'heartLine',
    'fateLine',
    'mounts',
    'mountJupiter',
    'mountSaturn',
    'mountApollo',
    'mountMercury',
    'mountVenus',
    'mountMoon',
    'mountMars',
    'specialMarks',
  ])
  if (palmKeys.has(featureKey) || kind === 'palms') return 'palm_l'
  return 'face'
}

type LocusPayload = {
  featureKey: string
  part: LocusPart
  locus: string
  reading: string
}

function parseLoci(raw: unknown): LocusPayload[] {
  if (!Array.isArray(raw)) return []
  const out: LocusPayload[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const featureKey = asNonEmptyString(o.featureKey)
    const locus = asNonEmptyString(o.locus)
    const reading = asNonEmptyString(o.reading) ?? asNonEmptyString(o.note)
    const partRaw = asNonEmptyString(o.part)
    if (!featureKey || !locus || !reading) continue
    const part: LocusPart =
      partRaw && LOCUS_PARTS.has(partRaw as LocusPart)
        ? (partRaw as LocusPart)
        : inferPartFromChapter('face', featureKey)
    const dedupeKey = `${part}:${featureKey}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    out.push({ featureKey, part, locus, reading })
  }
  return out
}

function parseCitations(raw: unknown, chapterKind: FaceOracleChapterKind): ChapterCitation[] {
  if (!Array.isArray(raw)) return []
  const out: ChapterCitation[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const locus = asNonEmptyString(o.locus)
    const note = asNonEmptyString(o.note)
    const featureKey = asNonEmptyString(o.featureKey)
    const partRaw = asNonEmptyString(o.part)
    if (!locus || !note) continue
    const part =
      partRaw && LOCUS_PARTS.has(partRaw as LocusPart)
        ? (partRaw as LocusPart)
        : featureKey
          ? inferPartFromChapter(chapterKind, featureKey)
          : chapterKind === 'face'
            ? 'face'
            : chapterKind === 'palms'
              ? 'palm_l'
              : 'face'
    out.push({
      locus,
      note,
      featureKey: featureKey ?? locus,
      part,
    })
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

async function loadLandmarksJson(
  db: AppDb,
  userId: string,
  id: string
): Promise<Partial<Record<string, { x: number; y: number }>>> {
  const row = await db
    .select({ landmarksJson: userPhysiognomyFeatures.landmarksJson })
    .from(userPhysiognomyFeatures)
    .where(and(eq(userPhysiognomyFeatures.id, id), eq(userPhysiognomyFeatures.userId, userId)))
    .get()
  if (!row?.landmarksJson) return {}
  try {
    return parseLandmarksJson(JSON.parse(row.landmarksJson) as unknown)
  } catch {
    return {}
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
  const hant = locale.startsWith('zh-Hant') || locale === 'zh-TW' || locale === 'zh-HK'
  const ja = locale.startsWith('ja')
  const first =
    body
      .trim()
      .split(/[。.!?\n]/)[0]
      ?.trim() ?? body.trim().slice(0, 48)
  const counterpoint = zh
    ? hant
      ? '文化研習參考，不作命運斷語。'
      : '文化研习参考，不作命运断语。'
    : ja
      ? '文化的な考察であり、運命の断定ではありません。'
      : 'Cultural study framing — not deterministic fate.'
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
  const kindRaw = o.kind
  if (typeof kindRaw !== 'string') return null
  let kind: string = kindRaw
  // Legacy period/advice → horizon (merged near-window + actions).
  if (kind === 'period' || kind === 'advice') kind = 'horizon'
  if (!CHAPTER_KINDS.includes(kind as FaceOracleChapterKind)) {
    if (!LEGACY_CHAPTER_KINDS.has(kind)) return null
    kind = 'horizon'
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
    citations: parseCitations(o.citations, kind as FaceOracleChapterKind),
  }
}

/** Normalize AI JSON → chapters[] + flat mirrors + loci[]. */
export function normalizeFaceoracleInterpretation(
  parsed: Record<string, unknown>,
  locale: string
): {
  chapters: ChapterPayload[]
  flat: Record<string, unknown>
  loci: LocusPayload[]
} | null {
  const byKind = new Map<FaceOracleChapterKind, ChapterPayload>()
  if (Array.isArray(parsed.chapters)) {
    for (const item of parsed.chapters) {
      const ch = parseChapter(item)
      if (!ch) continue
      // Prefer first horizon; if both period+advice remapped, keep the richer body.
      const prev = byKind.get(ch.kind)
      if (!prev) {
        byKind.set(ch.kind, ch)
      } else if (ch.kind === 'horizon') {
        const prevLen = `${prev.evidence}${prev.dynamic}${prev.remedy ?? ''}`.length
        const nextLen = `${ch.evidence}${ch.dynamic}${ch.remedy ?? ''}`.length
        if (nextLen > prevLen) byKind.set(ch.kind, ch)
        else {
          // Merge remedy/reef from the thinner sibling when missing.
          if (!prev.remedy && ch.remedy) prev.remedy = ch.remedy
          if (!prev.reef && ch.reef) prev.reef = ch.reef
          if (!prev.dynamic && ch.dynamic) prev.dynamic = ch.dynamic
        }
      }
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
  if (!byKind.has('horizon')) {
    const body = [flatPeriod, flatAdvice].filter(Boolean).join('\n\n')
    const ch = chapterFromFlat('horizon', body || null, locale)
    if (ch) byKind.set('horizon', ch)
  }

  const chapters = CHAPTER_KINDS.map((k) => byKind.get(k)).filter((c): c is ChapterPayload =>
    Boolean(c)
  )
  // Require core body: overview + at least one of face/palms/natal/horizon
  const hasCore =
    byKind.has('overview') &&
    (byKind.has('face') || byKind.has('palms') || byKind.has('natal') || byKind.has('horizon'))
  if (!hasCore || chapters.length < 2) return null

  const overview = byKind.get('overview')
  const face = byKind.get('face')
  const palms = byKind.get('palms')
  const natal = byKind.get('natal')
  const horizon = byKind.get('horizon')

  const loci = parseLoci(parsed.loci)

  const flat: Record<string, unknown> = {
    overview: flatOverview ?? overview?.evidence ?? overview?.goldenLine ?? '',
    faceSection: flatFace ?? face?.evidence ?? '',
    palmLeftSection: flatLeft ?? '',
    palmRightSection: flatRight ?? '',
    natalContrast: flatNatal ?? natal?.evidence ?? '',
    periodDiff: flatPeriod ?? horizon?.evidence ?? null,
    advice: flatAdvice ?? horizon?.remedy ?? horizon?.dynamic ?? '',
    chapters,
    loci,
    events: Array.isArray(parsed.events) ? parsed.events : [],
  }
  if (palms && !flatLeft && !flatRight) {
    flat.palmLeftSection = palms.evidence
  }
  return { chapters, flat, loci }
}

function interpretationHasBody(normalized: {
  chapters: ChapterPayload[]
  flat: Record<string, unknown>
  loci?: LocusPayload[]
}): boolean {
  if (normalized.chapters.length >= 2) {
    const text = normalized.chapters.map((c) => `${c.goldenLine}${c.evidence}${c.dynamic}`).join('')
    return text.trim().length > 40
  }
  const keys = ['overview', 'faceSection', 'advice'] as const
  return keys.some(
    (k) =>
      typeof normalized.flat[k] === 'string' && (normalized.flat[k] as string).trim().length > 12
  )
}

async function callReadingAi(
  env: CloudflareBindings,
  prompt: string,
  locale: string,
  opts?: { maxTokens?: number; metricLabel?: string }
): Promise<{ parsed: Record<string, unknown> | null; rawText: string; error?: string }> {
  const systemPrompt = [
    'You are a careful East-Asian physiognomy + BaZi cultural interpreter.',
    'Reply with ONE JSON object only. No markdown fences. No prose outside JSON.',
    buildComplianceInstructionBlock(locale),
  ].join('\n')

  const userPrompt = `${prompt}${buildFaceoracleLanguageReminder(locale)}`

  try {
    const rawText = (
      await callWithFallback(env, systemPrompt, userPrompt, {
        tier: 'flagship',
        locale,
        maxTokens: opts?.maxTokens ?? 8192,
        temperature: 0.55,
        jsonMode: true,
        noThink: true,
        metricLabel: opts?.metricLabel ?? 'faceoracle_reading',
        totalBudgetMs: 210_000,
        perModelTimeoutMs: 70_000,
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
  loci?: LocusPayload[]
}): string {
  const chapterText = normalized.chapters
    .map(
      (c) =>
        `${c.goldenLine}\n${c.evidence}\n${c.dynamic}\n${c.reef ?? ''}\n${c.remedy ?? ''}\n${c.counterpoint ?? ''}\n${c.citations.map((x) => `${x.locus} ${x.note}`).join('\n')}`
    )
    .join('\n')
  const lociText = (normalized.loci ?? []).map((l) => `${l.locus} ${l.reading}`).join('\n')
  const events = Array.isArray(normalized.flat.events) ? normalized.flat.events : []
  const eventText = events
    .map((ev) => {
      if (!ev || typeof ev !== 'object') return ''
      const e = ev as Record<string, unknown>
      return `${asNonEmptyString(e.theme) ?? ''} ${asNonEmptyString(e.note) ?? ''}`
    })
    .join('\n')
  return `${chapterText}\n${lociText}\n${eventText}`
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
/** LLM can hang at progress=50 for a long time — fail sooner so the user can retry. */
const STALE_INTERPRETING_LOW_PROGRESS_MS = 14 * 60 * 1000

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
    if (!Number.isFinite(started)) continue
    const age = now - started
    const lowProgressHang =
      job.stage === 'interpreting' &&
      job.progress <= 50 &&
      age >= STALE_INTERPRETING_LOW_PROGRESS_MS
    if (!lowProgressHang && age < STALE_JOB_MS) continue
    await failJob(db, job, lowProgressHang ? 'stale_interpreting_timeout' : 'stale_timeout', true)
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

  const [face, palmL, palmR, faceLm, palmLm, palmRm] = await Promise.all([
    loadFeatureJson(db, job.userId, job.faceFeatureId),
    loadFeatureJson(db, job.userId, job.palmLeftFeatureId),
    loadFeatureJson(db, job.userId, job.palmRightFeatureId),
    loadLandmarksJson(db, job.userId, job.faceFeatureId),
    loadLandmarksJson(db, job.userId, job.palmLeftFeatureId),
    loadLandmarksJson(db, job.userId, job.palmRightFeatureId),
  ])
  if (!face || !palmL || !palmR) {
    await failJob(db, job, 'features_missing', true)
    return
  }

  await setJobStage(db, jobId, 'interpreting', 35)

  const landmarkCounts = {
    face: Object.keys(faceLm).length,
    palmLeft: Object.keys(palmLm).length,
    palmRight: Object.keys(palmRm).length,
  }
  if (landmarkCounts.face + landmarkCounts.palmLeft + landmarkCounts.palmRight === 0) {
    console.warn('[faceoracle-job] landmarks_empty', { jobId, landmarkCounts })
  }

  // Palm convention (gender-based innate/acquired) — deterministic from gender,
  // so compute outside the pillars try/catch to guarantee injection.
  const palmInnate = job.gender === '女' ? 'palm_r' : 'palm_l'
  const palmAcquired = job.gender === '女' ? 'palm_l' : 'palm_r'
  const palmConventionText =
    job.gender === '女'
      ? '女: right(palm_r)=先天/本命底色 · left(palm_l)=后天/作为近运'
      : '男: left(palm_l)=先天/本命底色 · right(palm_r)=后天/作为近运'
  // Current age anchors the acquired-hand window read (see faceoracle CORE
  // "Age anchor"). Year granularity is enough for dayun/流年 windowing.
  const birthYearMatch = /^(\d{4})/.exec(job.solarDate)
  const currentAge = birthYearMatch ? new Date().getUTCFullYear() - Number(birthYearMatch[1]) : null
  const palmLines = [
    `palmConvention=${palmConventionText}`,
    `palmInnate=${palmInnate}`,
    `palmAcquired=${palmAcquired}`,
    currentAge !== null ? `currentAge≈${currentAge}` : '',
    currentAge !== null
      ? `palmAgeHint=后天掌(${palmAcquired})读作命主${currentAge}岁的当下窗口(×当前大运)；先天掌(${palmInnate})读底色；两掌同向/对拉定此窗口顺逆`
      : '',
    currentAge !== null
      ? `palmLiunianHint=生命线弧(食指下≈幼→绕拇指球向腕≈老)、事业线(腕→中指为少至晚)；命主今${currentAge}岁落在主纹当前段——已走段作过去印证、当前段作窗口判断、下一段作下一窗口建议(扣大运干支/年龄)`
      : '',
  ].filter(Boolean)

  let natalSummary = [
    `solar=${job.solarDate}`,
    `timeIndex=${job.timeIndex}`,
    `gender=${job.gender}`,
    ...palmLines,
  ].join('; ')
  let natalFacts: Record<string, string> | null = null
  try {
    const dt = parseSolarDate(job.solarDate, job.timeIndex)
    const pillars = getFourPillars(dt)
    const gender: Gender = job.gender === '女' ? '女' : '男'
    const nowYear = new Date().getUTCFullYear()
    const dayun = calculateDaYun(dt, gender)
    const currentStep = getDaYunAtYear(dayun, nowYear)
    const currentIdx = currentStep
      ? dayun.steps.findIndex((s) => s.index === currentStep.index)
      : -1
    const stepEnc = (s: {
      ganZhi: { label: string }
      startAge: number
      endAge: number
      startYear: number
      endYear: number
    }) => `${s.ganZhi.label}@${s.startAge}-${s.endAge}y/${s.startYear}-${s.endYear}`

    // Full life ladder (all 8 steps, birth→~startAge+80) so natal can narrate
    // the whole timeline; segmented past / current / future for the model.
    const dayunFull = dayun.steps.map((s, i) => `${i + 1}:${stepEnc(s)}`).join(' | ')
    const pastSteps = currentIdx > 0 ? dayun.steps.slice(0, currentIdx) : []
    const futureSteps = currentIdx >= 0 ? dayun.steps.slice(currentIdx + 1) : dayun.steps
    const dayunPast = pastSteps.map(stepEnc).join(' | ')
    const dayunCurrent = currentStep ? stepEnc(currentStep) : ''
    const dayunFuture = futureSteps.map(stepEnc).join(' | ')

    // Near-window trail (current + next up to 4) kept for the period chapter.
    const trailStart = currentIdx >= 0 ? currentIdx : 0
    const trailSteps = dayun.steps.slice(trailStart, trailStart + 5)
    const dayunTrail = trailSteps
      .map((s, i) => `${i === 0 ? 'cur' : `+${i}`}:${stepEnc(s)}`)
      .join('|')

    const liunian = getLiuNian(nowYear)
    const nextLiunian = getLiuNian(nowYear + 1)
    const dayunLine = currentStep
      ? `currentDaYun=${currentStep.ganZhi.label} ages=${currentStep.startAge}-${currentStep.endAge} years=${currentStep.startYear}-${currentStep.endYear}`
      : `dayunStartAge=${dayun.startAge.rounded}`
    const remainYears = currentStep ? Math.max(0, currentStep.endYear - nowYear) : null
    natalSummary = [
      `solar=${job.solarDate}`,
      `timeIndex=${job.timeIndex}`,
      `gender=${job.gender}`,
      ...palmLines,
      `city=${job.city ?? ''}`,
      `pillars=${JSON.stringify(pillars)}`,
      `dayunDirection=${dayun.direction}`,
      dayunLine,
      `dayunFull=${dayunFull}`,
      dayunPast ? `dayunPast=${dayunPast}` : '',
      dayunCurrent ? `dayunCurrent=${dayunCurrent}` : '',
      dayunFuture ? `dayunFuture=${dayunFuture}` : '',
      dayunTrail ? `dayunTrail=${dayunTrail}` : '',
      remainYears !== null ? `currentDaYunRemainYears≈${remainYears}` : '',
      'lifeHorizonHint=natal=全人生 timeline + 未来主章 (past印证→current当令→future大运带至后半场, use dayunFull/dayunFuture); horizon=近窗+行动 (liuNian + current大运余年 woven with per-axis actions); deepen 2-4 scenes',
      `liuNian=${nowYear}:${liunian.label}`,
      `nextLiuNian=${nowYear + 1}:${nextLiunian.label}`,
    ]
      .filter(Boolean)
      .join('; ')
    natalFacts = {
      solarDate: job.solarDate,
      gender: job.gender,
      dayMaster: pillars.day.stem,
      dayPillar: pillars.day.label,
      dayun: currentStep?.ganZhi.label ?? '',
      dayunYears: currentStep ? `${currentStep.startYear}-${currentStep.endYear}` : '',
      dayunTrail,
      dayunFull,
      dayunFuture,
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

  const suggested = buildSuggestedLoci({
    face,
    palmLeft: palmL,
    palmRight: palmR,
    natalSummary,
    topN: 20,
  })
  const suggestedLociBlock = formatSuggestedLociBlock(suggested)
  console.info('[faceoracle-job] suggestedLoci', {
    jobId,
    count: suggested.length,
    sample: suggested.slice(0, 8).map((s) => `${s.part}/${s.featureKey}:${s.reason}`),
  })

  const promptParams = {
    faceFeatures: compactFeatures(face),
    palmLeftFeatures: compactFeatures(palmL),
    palmRightFeatures: compactFeatures(palmR),
    natalSummary,
    locale: job.locale,
    horizonMonths,
    outputKind,
    suggestedLociBlock,
  } as const

  // ── Pass 1: curated loci only ───────────────────────────────────────────
  await setJobStage(db, jobId, 'interpreting', 50)
  const lociPrompt = buildFaceOracleLociPrompt(promptParams)
  let lociParsed: Record<string, unknown> | null = null
  {
    const ai = await callReadingAi(env, lociPrompt, job.locale, {
      maxTokens: 4096,
      metricLabel: 'faceoracle_loci',
    })
    if (ai.parsed && Array.isArray(ai.parsed.loci) && ai.parsed.loci.length > 0) {
      lociParsed = ai.parsed
    } else {
      console.warn('[faceoracle-job] loci pass miss — compact retry', {
        jobId,
        error: ai.error,
      })
      await setJobStage(db, jobId, 'interpreting', 55)
      const retry = await callReadingAi(
        env,
        `${lociPrompt}\n\nCOMPACT RETRY: Output ONLY {"loci":[...]} with 16–20 deep readings (face≥5, each palm≥5, ≥2 CAUTION).`,
        job.locale,
        { maxTokens: 4096, metricLabel: 'faceoracle_loci_retry' }
      )
      if (retry.parsed && Array.isArray(retry.parsed.loci) && retry.parsed.loci.length > 0) {
        lociParsed = retry.parsed
      } else {
        await failJob(
          db,
          job,
          `ai_failed:loci:${(retry.error ?? ai.error ?? 'empty').slice(0, 180)}`,
          true
        )
        return
      }
    }
  }

  // Hard coverage floors — one more retry if thin
  {
    const parsedLoci = parseLoci(lociParsed.loci)
    const cov = assessLociCoverage(parsedLoci)
    if (!cov.ok) {
      console.warn('[faceoracle-job] loci coverage short — coverage retry', {
        jobId,
        detail: cov.detail,
      })
      await setJobStage(db, jobId, 'interpreting', 58)
      const covRetry = await callReadingAi(
        env,
        `${lociPrompt}\n\nCOVERAGE RETRY: Prior attempt was ${cov.detail}. Must return face≥5, palm_l≥5, palm_r≥5, ≥2 CAUTION-toned readings. Prefer SuggestedLoci. Output ONLY {"loci":[...]}.`,
        job.locale,
        { maxTokens: 4096, metricLabel: 'faceoracle_loci_coverage_retry' }
      )
      if (
        covRetry.parsed &&
        Array.isArray(covRetry.parsed.loci) &&
        covRetry.parsed.loci.length > 0
      ) {
        const next = parseLoci(covRetry.parsed.loci)
        const nextCov = assessLociCoverage(next)
        if (nextCov.ok || next.length >= parsedLoci.length) {
          lociParsed = covRetry.parsed
          console.info('[faceoracle-job] loci coverage retry accepted', {
            jobId,
            detail: nextCov.detail,
          })
        } else {
          console.warn('[faceoracle-job] loci coverage retry still thin — keeping first', {
            jobId,
            detail: nextCov.detail,
          })
        }
      }
    }
  }

  const lociJson = JSON.stringify(lociParsed.loci).slice(0, 24_000)

  // ── Pass 2: chapters + events from fixed loci ──────────────────────────
  await setJobStage(db, jobId, 'interpreting', 70)
  const chaptersPrompt = buildFaceOracleChaptersPrompt(promptParams, lociJson)
  let normalized: ReturnType<typeof normalizeFaceoracleInterpretation> = null
  {
    const ai = await callReadingAi(env, chaptersPrompt, job.locale, {
      maxTokens: 8192,
      metricLabel: 'faceoracle_chapters',
    })
    const merged = ai.parsed ? { ...ai.parsed, loci: lociParsed.loci } : null
    if (merged) {
      normalized = normalizeFaceoracleInterpretation(merged, job.locale)
    }
    if (!normalized || !interpretationHasBody(normalized)) {
      console.warn('[faceoracle-job] chapters pass miss — compact retry', {
        jobId,
        error: ai.error,
      })
      await setJobStage(db, jobId, 'interpreting', 80)
      const retry = await callReadingAi(
        env,
        `${chaptersPrompt}\n\nCOMPACT RETRY: Keep all 5 chapters; tighten prose. Output ONLY valid JSON.`,
        job.locale,
        { maxTokens: 8192, metricLabel: 'faceoracle_chapters_retry' }
      )
      const mergedRetry = retry.parsed ? { ...retry.parsed, loci: lociParsed.loci } : null
      if (!mergedRetry) {
        await failJob(
          db,
          job,
          `ai_failed:chapters:${(retry.error ?? ai.error ?? 'empty').slice(0, 180)}`,
          true
        )
        return
      }
      normalized = normalizeFaceoracleInterpretation(mergedRetry, job.locale)
    }
  }
  if (!normalized || !interpretationHasBody(normalized)) {
    await failJob(db, job, 'ai_empty', true)
    return
  }

  await setJobStage(db, jobId, 'interpreting', 88)

  // Locale drift guard (all locales, including zh English-leak) on chapter + loci prose.
  const proseSample = [
    ...normalized.chapters.map(
      (c) => `${c.goldenLine}\n${c.evidence}\n${c.dynamic}\n${c.reef ?? ''}\n${c.remedy ?? ''}`
    ),
    ...normalized.loci.map((l) => `${l.locus}\n${l.reading}`),
  ].join('\n')
  const fieldSamples = [
    ...normalized.chapters.flatMap((c) => [
      c.goldenLine,
      c.evidence,
      c.dynamic,
      c.reef ?? '',
      c.remedy ?? '',
      c.counterpoint ?? '',
      ...c.citations.map((x) => `${x.locus} ${x.note}`),
    ]),
    ...normalized.loci.map((l) => l.reading),
  ]
  if (
    faceoracleBodyLooksWrongLocale(job.locale, proseSample) ||
    faceoracleFieldsLookWrongLocale(job.locale, fieldSamples)
  ) {
    console.warn('[faceoracle-job] locale drift — retrying chapters', { jobId, locale: job.locale })
    const zhLeak = faceoracleZhLooksEnglishLeaky(proseSample)
    const retryPrompt = [
      chaptersPrompt,
      '',
      zhLeak
        ? 'CRITICAL RETRY: Previous draft mixed English into Chinese prose (e.g. future/tension/palm). Rewrite ALL user-facing strings in 中文; ban English words. Keep FixedLoci featureKey unchanged.'
        : 'CRITICAL RETRY: Previous draft violated the output language. Rewrite chapters/events in the required language. Keep FixedLoci as-is (do not translate featureKey).',
      'Output ONLY valid JSON.',
    ].join('\n')
    const langRetry = await callReadingAi(env, retryPrompt, job.locale, {
      maxTokens: 8192,
      metricLabel: 'faceoracle_chapters_locale',
    })
    if (langRetry.parsed) {
      const again = normalizeFaceoracleInterpretation(
        { ...langRetry.parsed, loci: lociParsed.loci },
        job.locale
      )
      if (again && interpretationHasBody(again)) {
        normalized = again
      }
    }
  }

  // Density: log-only (no structure retry checklist — depth comes from Pass 1).
  const densityGaps = faceoracleDensityGaps(
    { chapters: normalized.chapters, events: normalized.flat.events, loci: normalized.loci },
    normalized.chapters
  )
  if (densityGaps.length > 0) {
    console.warn('[faceoracle-job] density soft-short (no retry)', { jobId, gaps: densityGaps })
  }

  const softObs = faceoracleSoftObservations(
    { events: normalized.flat.events, loci: normalized.loci },
    normalized.chapters
  )
  if (softObs.length > 0) {
    console.info('[faceoracle-job] soft observations (observe only)', { jobId, obs: softObs })
  }

  const cautionObs = faceoracleCautionObservations(normalized.chapters, normalized.loci)
  if (cautionObs.length > 0) {
    console.info('[faceoracle-job] caution-word absent (observe only)', { jobId, obs: cautionObs })
  }

  // ADR-0003: hard forbidden substring audit — one rewrite on chapters, keep loci.
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
    console.warn('[faceoracle-job] hard forbidden — rewriting chapters', {
      jobId,
      patterns: hardHits.map((h) => h.pattern),
    })
    const forbidPrompt = [
      chaptersPrompt,
      '',
      buildForbiddenRewriteSuffix(hardHits),
      'Keep FixedLoci unchanged. Output ONLY valid JSON.',
    ].join('\n')
    const forbidRetry = await callReadingAi(env, forbidPrompt, job.locale, {
      maxTokens: 8192,
      metricLabel: 'faceoracle_chapters_forbid',
    })
    if (forbidRetry.parsed) {
      const forbidAgain = normalizeFaceoracleInterpretation(
        { ...forbidRetry.parsed, loci: lociParsed.loci },
        job.locale
      )
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
  const landmarks: ReadingLandmarks = {
    face: faceLm,
    palmLeft: palmLm,
    palmRight: palmRm,
  }
  const locusIndex =
    normalized.loci.length > 0
      ? buildLocusIndexFromLoci(normalized.loci)
      : buildLocusIndex(
          normalized.chapters.map((ch) => ({ kind: ch.kind, citations: ch.citations }))
        )
  const output: Record<string, unknown> = {
    mode: 'face_palm',
    faceFeatureId: job.faceFeatureId,
    palmLeftFeatureId: job.palmLeftFeatureId,
    palmRightFeatureId: job.palmRightFeatureId,
    features: { face, palmLeft: palmL, palmRight: palmR },
    landmarks,
    loci: normalized.loci,
    locusIndex,
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
    rawAiText: '',
    promptPasses: ['loci', 'chapters'],
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
