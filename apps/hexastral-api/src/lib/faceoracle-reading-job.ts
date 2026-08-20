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
import { hasActiveEntitlement } from '../services/entitlements'
import { refundFaceoraclePhotoSlots, refundFaceoracleReportRegen } from '../services/quota'
import { sendExpoPushMessages } from './expo-push'
import {
  deleteEphemeralObjects,
  ephemeralKeyList,
  parseEphemeralKeysJson,
} from './faceoracle-ephemeral-keys'
import {
  extractFaceoracleFeaturesFromBytes,
  FaceoracleExtractError,
} from './faceoracle-extract-from-bytes'
import {
  buildLocusIndex,
  buildLocusIndexFromLoci,
  type LocusCitation,
  type LocusPart,
  parseLandmarksJson,
  type ReadingLandmarks,
} from './faceoracle-landmarks'
import {
  llmHarvestFacePushWindows,
  replaceFaceoraclePushFuel,
  windowsFromEvents,
} from './faceoracle-push-harvest'
import {
  assessLociCoverage,
  buildSuggestedLoci,
  formatSuggestedLociBlock,
} from './faceoracle-suggested-loci'
import {
  buildFaceOracleBriefPrompt,
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
type PartialPart = 'face' | 'palm_l' | 'palm_r'

function parsePartialMetaFromJob(job: JobRow): {
  updateKind: 'full' | 'partial'
  partialParts: PartialPart[] | null
} {
  const src = job.creditSource
  if (typeof src === 'string' && src.startsWith('partial:')) {
    const parts = src
      .slice('partial:'.length)
      .split(',')
      .map((p) => p.trim())
      .filter((p): p is PartialPart => p === 'face' || p === 'palm_l' || p === 'palm_r')
    if (parts.length > 0 && parts.length < 3) {
      return { updateKind: 'partial', partialParts: parts }
    }
  }
  return { updateKind: 'full', partialParts: null }
}

export type FaceoracleBrief = {
  title: string
  excerpt: string
  summary: string
  suggestion: string
  axis: 'career' | 'love' | 'health' | null
}

function clampChars(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max).trimEnd()}…`
}

export function parseFaceoracleBrief(raw: unknown): FaceoracleBrief | null {
  if (!raw || typeof raw !== 'object') return null
  const root = raw as Record<string, unknown>
  const b = (root.brief && typeof root.brief === 'object' ? root.brief : root) as Record<
    string,
    unknown
  >
  const title = typeof b.title === 'string' ? b.title.trim() : ''
  const excerpt = typeof b.excerpt === 'string' ? b.excerpt.trim() : ''
  const summary = typeof b.summary === 'string' ? b.summary.trim() : ''
  const suggestion = typeof b.suggestion === 'string' ? b.suggestion.trim() : ''
  if (!title || !excerpt || !summary || !suggestion) return null
  const axisRaw = typeof b.axis === 'string' ? b.axis : null
  const axis =
    axisRaw === 'career' || axisRaw === 'love' || axisRaw === 'health' ? axisRaw : null
  return {
    title: clampChars(title, 24),
    excerpt: clampChars(excerpt, 42),
    summary: clampChars(summary, 280),
    suggestion: suggestion.slice(0, 600),
    axis,
  }
}

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
  id: string | null | undefined
): Promise<Record<string, string> | null> {
  if (!id) return null
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
  id: string | null | undefined
): Promise<Partial<Record<string, { x: number; y: number }>>> {
  if (!id) return {}
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
  stage: 'extracting' | 'queued' | 'interpreting' | 'done' | 'failed',
  progress: number,
  extras?: {
    readingId?: string
    errorMessage?: string
    finishedAt?: string
    faceFeatureId?: string | null
    palmLeftFeatureId?: string | null
    palmRightFeatureId?: string | null
    ephemeralKeysJson?: string | null
  }
): Promise<void> {
  await db
    .update(faceoracleJobs)
    .set({
      stage,
      progress,
      ...(extras?.readingId !== undefined ? { readingId: extras.readingId } : {}),
      ...(extras?.errorMessage !== undefined ? { errorMessage: extras.errorMessage } : {}),
      ...(extras?.finishedAt !== undefined ? { finishedAt: extras.finishedAt } : {}),
      ...(extras?.faceFeatureId !== undefined ? { faceFeatureId: extras.faceFeatureId } : {}),
      ...(extras?.palmLeftFeatureId !== undefined
        ? { palmLeftFeatureId: extras.palmLeftFeatureId }
        : {}),
      ...(extras?.palmRightFeatureId !== undefined
        ? { palmRightFeatureId: extras.palmRightFeatureId }
        : {}),
      ...(extras?.ephemeralKeysJson !== undefined
        ? { ephemeralKeysJson: extras.ephemeralKeysJson }
        : {}),
    })
    .where(eq(faceoracleJobs.id, jobId))
}

async function cleanupJobEphemeral(
  env: CloudflareBindings | null | undefined,
  job: JobRow
): Promise<void> {
  const keys = parseEphemeralKeysJson(job.ephemeralKeysJson)
  if (!keys || !env?.FACE_EPHEMERAL_BUCKET) return
  await deleteEphemeralObjects(env.FACE_EPHEMERAL_BUCKET, ephemeralKeyList(keys))
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
  const ja = locale.startsWith('ja')
  const title = opts.ok
    ? hant
      ? '形氣解讀已完成'
      : hans
        ? '形气解读已完成'
        : ja
          ? '形気の解読が完了しました'
          : 'Your reading is ready'
    : hant
      ? '解讀未能完成'
      : hans
        ? '解读未能完成'
        : ja
          ? '解読を完了できませんでした'
          : 'Reading did not finish'
  const body = opts.ok
    ? hant
      ? '點按查看本期形氣。'
      : hans
        ? '点按查看本期形气。'
        : ja
          ? 'タップして今期の形気を見る。'
          : 'Tap to open your reading.'
    : hant
      ? '請打開應用重試或查看詳情。'
      : hans
        ? '请打开应用重试或查看详情。'
        : ja
          ? 'アプリを開いて詳細を確認するか、再試行してください。'
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
  notify: boolean,
  env?: CloudflareBindings | null
): Promise<void> {
  await cleanupJobEphemeral(env, job)
  await refundFaceoracleJobAccess(db, job)
  await setJobStage(db, job.id, 'failed', 100, {
    errorMessage: errorMessage.slice(0, 480),
    finishedAt: new Date().toISOString(),
    ephemeralKeysJson: null,
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

/** Mark stuck extracting/queued/interpreting jobs failed + refund. */
export async function sweepStaleFaceoracleJobs(
  db: AppDb,
  userId: string,
  env?: CloudflareBindings | null
): Promise<number> {
  const rows = await db
    .select()
    .from(faceoracleJobs)
    .where(and(eq(faceoracleJobs.userId, userId)))
  const now = Date.now()
  let n = 0
  for (const job of rows) {
    if (job.stage !== 'extracting' && job.stage !== 'queued' && job.stage !== 'interpreting') {
      continue
    }
    const started = Date.parse(job.startedAt || job.createdAt)
    if (!Number.isFinite(started)) continue
    const age = now - started
    const lowProgressHang =
      job.stage === 'interpreting' &&
      job.progress <= 50 &&
      age >= STALE_INTERPRETING_LOW_PROGRESS_MS
    if (!lowProgressHang && age < STALE_JOB_MS) continue
    await failJob(
      db,
      job,
      lowProgressHang ? 'stale_interpreting_timeout' : 'stale_timeout',
      true,
      env
    )
    n += 1
  }
  return n
}

type FeaturePart = 'face' | 'palm_l' | 'palm_r'

async function extractEphemeralFeaturesForJob(
  env: CloudflareBindings,
  db: AppDb,
  job: JobRow
): Promise<JobRow> {
  const keys = parseEphemeralKeysJson(job.ephemeralKeysJson)
  if (!keys) return job

  await setJobStage(db, job.id, 'extracting', 8)
  const bucket = env.FACE_EPHEMERAL_BUCKET
  if (!bucket) {
    await failJob(db, job, 'ephemeral_bucket_unavailable', true, env)
    throw new Error('ephemeral_bucket_unavailable')
  }

  const partToType: Record<FeaturePart, 'face' | 'palm_l' | 'palm_r'> = {
    face: 'face',
    palm_l: 'palm_l',
    palm_r: 'palm_r',
  }
  const updates: {
    faceFeatureId?: string
    palmLeftFeatureId?: string
    palmRightFeatureId?: string
  } = {}
  const keyEntries: Array<{ part: FeaturePart; key: string }> = []
  if (keys.face) keyEntries.push({ part: 'face', key: keys.face })
  if (keys.palm_l) keyEntries.push({ part: 'palm_l', key: keys.palm_l })
  if (keys.palm_r) keyEntries.push({ part: 'palm_r', key: keys.palm_r })

  try {
    for (let i = 0; i < keyEntries.length; i++) {
      const entry = keyEntries[i]
      if (!entry) continue
      const progress = 8 + Math.round(((i + 0.5) / keyEntries.length) * 22)
      await setJobStage(db, job.id, 'extracting', progress)

      const obj = await bucket.get(entry.key)
      if (!obj) {
        await failJob(db, job, `ephemeral_missing:${entry.part}`, true, env)
        throw new Error(`ephemeral_missing:${entry.part}`)
      }
      const buf = new Uint8Array(await obj.arrayBuffer())
      const mimeRaw = obj.httpMetadata?.contentType ?? 'image/jpeg'
      const mimeType =
        mimeRaw === 'image/png' || mimeRaw === 'image/heic' || mimeRaw === 'image/webp'
          ? mimeRaw
          : 'image/jpeg'

      try {
        const extracted = await extractFaceoracleFeaturesFromBytes(env, db, {
          userId: job.userId,
          type: partToType[entry.part],
          imageBytes: buf,
          mimeType,
          privacyConsentVersion: 'v2',
        })
        if (entry.part === 'face') updates.faceFeatureId = extracted.featureId
        else if (entry.part === 'palm_l') updates.palmLeftFeatureId = extracted.featureId
        else updates.palmRightFeatureId = extracted.featureId
      } catch (err) {
        const msg =
          err instanceof FaceoracleExtractError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'extract_failed'
        await failJob(db, job, `extract_failed:${msg}`.slice(0, 480), true, env)
        throw err
      }
    }
  } finally {
    await deleteEphemeralObjects(bucket, ephemeralKeyList(keys))
  }

  await setJobStage(db, job.id, 'queued', 32, {
    faceFeatureId: updates.faceFeatureId ?? job.faceFeatureId,
    palmLeftFeatureId: updates.palmLeftFeatureId ?? job.palmLeftFeatureId,
    palmRightFeatureId: updates.palmRightFeatureId ?? job.palmRightFeatureId,
    ephemeralKeysJson: null,
  })

  const refreshed = await db.select().from(faceoracleJobs).where(eq(faceoracleJobs.id, job.id)).get()
  return refreshed ?? job
}

/**
 * Run interpretation for a queued job. Throws on hard failure (caller retries).
 */
export async function runFaceoracleReadingJob(
  env: CloudflareBindings,
  db: AppDb,
  jobId: string
): Promise<void> {
  let job = await db.select().from(faceoracleJobs).where(eq(faceoracleJobs.id, jobId)).get()
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

  if (job.ephemeralKeysJson || job.stage === 'extracting') {
    job = await extractEphemeralFeaturesForJob(env, db, job)
    if (job.stage === 'failed') return
  }

  await setJobStage(db, jobId, 'interpreting', 35)

  const [face, palmL, palmR, faceLm, palmLm, palmRm] = await Promise.all([
    loadFeatureJson(db, job.userId, job.faceFeatureId),
    loadFeatureJson(db, job.userId, job.palmLeftFeatureId),
    loadFeatureJson(db, job.userId, job.palmRightFeatureId),
    loadLandmarksJson(db, job.userId, job.faceFeatureId),
    loadLandmarksJson(db, job.userId, job.palmLeftFeatureId),
    loadLandmarksJson(db, job.userId, job.palmRightFeatureId),
  ])
  if (!face || !palmL || !palmR) {
    await failJob(db, job, 'features_missing', true, env)
    return
  }

  await setJobStage(db, jobId, 'interpreting', 40)

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
  const { updateKind, partialParts } = parsePartialMetaFromJob(job)
  // Pass 2 switch is the job column, not a client-only convention:
  // oneshot/deep → five chapters; period_brief → short brief schema.
  const isShortBrief = outputKind === 'period_brief'
  const lociTopN = isShortBrief ? 12 : 20
  const lociFloors = isShortBrief
    ? { face: 3, palm_l: 2, palm_r: 2, caution: 1 }
    : { face: 5, palm_l: 5, palm_r: 5, caution: 2 }

  const suggested = buildSuggestedLoci({
    face,
    palmLeft: palmL,
    palmRight: palmR,
    natalSummary,
    topN: lociTopN,
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
    partialUpdate: partialParts ?? undefined,
  } as const

  // ── Pass 1: curated loci only ───────────────────────────────────────────
  await setJobStage(db, jobId, 'interpreting', 50)
  const lociPrompt = buildFaceOracleLociPrompt(promptParams)
  const lociCountHint = isShortBrief
    ? '8–12 deep readings (face≥3, each palm≥2, ≥1 CAUTION)'
    : '16–20 deep readings (face≥5, each palm≥5, ≥2 CAUTION)'
  let lociParsed: Record<string, unknown> | null = null
  {
    const ai = await callReadingAi(env, lociPrompt, job.locale, {
      maxTokens: isShortBrief ? 3072 : 4096,
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
        `${lociPrompt}\n\nCOMPACT RETRY: Output ONLY {"loci":[...]} with ${lociCountHint}.`,
        job.locale,
        { maxTokens: isShortBrief ? 3072 : 4096, metricLabel: 'faceoracle_loci_retry' }
      )
      if (retry.parsed && Array.isArray(retry.parsed.loci) && retry.parsed.loci.length > 0) {
        lociParsed = retry.parsed
      } else {
        await failJob(
          db,
          job,
          `ai_failed:loci:${(retry.error ?? ai.error ?? 'empty').slice(0, 180)}`,
          true, env
        )
        return
      }
    }
  }

  // Hard coverage floors — one more retry if thin
  {
    const parsedLoci = parseLoci(lociParsed.loci)
    const cov = assessLociCoverage(parsedLoci, lociFloors)
    if (!cov.ok) {
      console.warn('[faceoracle-job] loci coverage short — coverage retry', {
        jobId,
        detail: cov.detail,
      })
      await setJobStage(db, jobId, 'interpreting', 58)
      const covRetry = await callReadingAi(
        env,
        `${lociPrompt}\n\nCOVERAGE RETRY: Prior attempt was ${cov.detail}. Must return ${lociCountHint}. Prefer SuggestedLoci. Output ONLY {"loci":[...]}.`,
        job.locale,
        { maxTokens: isShortBrief ? 3072 : 4096, metricLabel: 'faceoracle_loci_coverage_retry' }
      )
      if (
        covRetry.parsed &&
        Array.isArray(covRetry.parsed.loci) &&
        covRetry.parsed.loci.length > 0
      ) {
        const next = parseLoci(covRetry.parsed.loci)
        const nextCov = assessLociCoverage(next, lociFloors)
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

  // ── Pass 2: chapters (seal) or short brief (period) ─────────────────────
  await setJobStage(db, jobId, 'interpreting', 70)

  let brief: FaceoracleBrief | null = null
  let normalized: ReturnType<typeof normalizeFaceoracleInterpretation> = null
  let pass2Prompt = ''

  if (isShortBrief) {
    const briefPrompt = buildFaceOracleBriefPrompt(promptParams, lociJson)
    pass2Prompt = briefPrompt
    {
      const ai = await callReadingAi(env, briefPrompt, job.locale, {
        maxTokens: 2048,
        metricLabel: 'faceoracle_brief',
      })
      brief = ai.parsed ? parseFaceoracleBrief(ai.parsed) : null
      if (!brief) {
        const retry = await callReadingAi(
          env,
          `${briefPrompt}\n\nCOMPACT RETRY: Output ONLY {"brief":{title,excerpt,summary,suggestion,axis}, "events":[]}.`,
          job.locale,
          { maxTokens: 2048, metricLabel: 'faceoracle_brief_retry' }
        )
        brief = retry.parsed ? parseFaceoracleBrief(retry.parsed) : null
        if (!brief) {
          await failJob(
            db,
            job,
            `ai_failed:brief:${(retry.error ?? ai.error ?? 'empty').slice(0, 180)}`,
            true, env
          )
          return
        }
      }
      let eventsRaw: unknown[] = []
      const briefSource = ai.parsed
      if (briefSource && typeof briefSource === 'object' && Array.isArray((briefSource as { events?: unknown }).events)) {
        eventsRaw = (briefSource as { events: unknown[] }).events
      }
      // Synthesize a thin chapter shell so legacy clients still render something.
      normalized = normalizeFaceoracleInterpretation(
        {
          loci: lociParsed.loci,
          chapters: [
            {
              kind: 'overview',
              goldenLine: brief.excerpt,
              evidence: brief.summary,
              dynamic: brief.suggestion,
              reef: null,
              remedy: brief.suggestion,
              counterpoint: null,
              citations: [],
            },
            {
              kind: 'horizon',
              goldenLine: brief.title,
              evidence: brief.summary,
              dynamic: brief.suggestion,
              reef: null,
              remedy: brief.suggestion,
              counterpoint: null,
              citations: [],
            },
          ],
          overview: brief.summary,
          advice: brief.suggestion,
          periodDiff: null,
          events: eventsRaw,
        },
        job.locale
      )
    }
  } else {
    const chaptersPrompt = buildFaceOracleChaptersPrompt(promptParams, lociJson)
    pass2Prompt = chaptersPrompt
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
            true, env
          )
          return
        }
        normalized = normalizeFaceoracleInterpretation(mergedRetry, job.locale)
      }
    }
  }
  if (!normalized || !interpretationHasBody(normalized)) {
    await failJob(db, job, 'ai_empty', true, env)
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
    console.warn('[faceoracle-job] locale drift — retrying pass2', { jobId, locale: job.locale })
    const zhLeak = faceoracleZhLooksEnglishLeaky(proseSample)
    if (isShortBrief && brief) {
      const briefPrompt = buildFaceOracleBriefPrompt(promptParams, lociJson)
      const retryPrompt = [
        briefPrompt,
        '',
        zhLeak
          ? 'CRITICAL RETRY: Previous draft mixed English into Chinese. Rewrite brief fields in 中文; ban English craft tokens.'
          : 'CRITICAL RETRY: Rewrite brief in the required language.',
        'Output ONLY valid JSON.',
      ].join('\n')
      const langRetry = await callReadingAi(env, retryPrompt, job.locale, {
        maxTokens: 2048,
        metricLabel: 'faceoracle_brief_locale',
      })
      const againBrief = langRetry.parsed ? parseFaceoracleBrief(langRetry.parsed) : null
      if (againBrief) {
        brief = againBrief
        const again = normalizeFaceoracleInterpretation(
          {
            loci: lociParsed.loci,
            chapters: [
              {
                kind: 'overview',
                goldenLine: againBrief.excerpt,
                evidence: againBrief.summary,
                dynamic: againBrief.suggestion,
                reef: null,
                remedy: againBrief.suggestion,
                counterpoint: null,
                citations: [],
              },
              {
                kind: 'horizon',
                goldenLine: againBrief.title,
                evidence: againBrief.summary,
                dynamic: againBrief.suggestion,
                reef: null,
                remedy: againBrief.suggestion,
                counterpoint: null,
                citations: [],
              },
            ],
            overview: againBrief.summary,
            advice: againBrief.suggestion,
            periodDiff: null,
            events: normalized.flat.events,
          },
          job.locale
        )
        if (again && interpretationHasBody(again)) {
          normalized = again
        }
      }
    } else {
      const chaptersPrompt = buildFaceOracleChaptersPrompt(promptParams, lociJson)
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
      pass2Prompt,
      '',
      buildForbiddenRewriteSuffix(hardHits),
      'Keep FixedLoci unchanged. Output ONLY valid JSON.',
    ].join('\n')
    const forbidRetry = await callReadingAi(env, forbidPrompt, job.locale, {
      maxTokens: isShortBrief ? 2048 : 8192,
      metricLabel: isShortBrief ? 'faceoracle_brief_forbid' : 'faceoracle_chapters_forbid',
    })
    if (forbidRetry.parsed) {
      if (isShortBrief) {
        const forbidBrief = parseFaceoracleBrief(forbidRetry.parsed)
        if (forbidBrief && normalized) {
          const forbidAgain = normalizeFaceoracleInterpretation(
            {
              loci: lociParsed.loci,
              chapters: [
                {
                  kind: 'overview',
                  goldenLine: forbidBrief.excerpt,
                  evidence: forbidBrief.summary,
                  dynamic: forbidBrief.suggestion,
                  reef: null,
                  remedy: forbidBrief.suggestion,
                  counterpoint: null,
                  citations: [],
                },
                {
                  kind: 'horizon',
                  goldenLine: forbidBrief.title,
                  evidence: forbidBrief.summary,
                  dynamic: forbidBrief.suggestion,
                  reef: null,
                  remedy: forbidBrief.suggestion,
                  counterpoint: null,
                  citations: [],
                },
              ],
              overview: forbidBrief.summary,
              advice: forbidBrief.suggestion,
              periodDiff: null,
              events: normalized.flat.events,
            },
            job.locale
          )
          if (forbidAgain && interpretationHasBody(forbidAgain)) {
            normalized = forbidAgain
            brief = forbidBrief
            hardHits = auditHardForbiddenHits(proseFromNormalized(normalized))
          }
        }
      } else {
        const forbidAgain = normalizeFaceoracleInterpretation(
          { ...forbidRetry.parsed, loci: lociParsed.loci },
          job.locale
        )
        if (forbidAgain && interpretationHasBody(forbidAgain)) {
          normalized = forbidAgain
          hardHits = auditHardForbiddenHits(proseFromNormalized(normalized))
        }
      }
    }
    if (hardHits.length > 0) {
      console.warn('[faceoracle-job] hard forbidden still present after rewrite', {
        jobId,
        patterns: hardHits.map((h) => h.pattern),
      })
    }
  }

  if (!normalized || !interpretationHasBody(normalized)) {
    await failJob(db, job, 'ai_empty', true, env)
    return
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
    updateKind,
    partialParts,
    brief: brief ?? undefined,
    visionMode: 'real',
    aiInterpretation: interpretation,
    chapters: normalized.chapters,
    events,
    rawAiText: '',
    promptPasses: isShortBrief ? ['loci', 'brief'] : ['loci', 'chapters'],
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
    updateKind,
    partialParts,
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

  // Pro: replace dated push fuel BEFORE reading_ready so the first open already
  // has retention windows (avoids notify→fuel race).
  const isProReading =
    outputKind === 'period_brief' ||
    outputKind === 'deep' ||
    (await hasActiveEntitlement(db, job.userId, 'faceoracle_pro')) ||
    (await hasActiveEntitlement(db, job.userId, 'universe_pro'))
  if (isProReading && outputKind !== 'oneshot') {
    try {
      const fromEvents = windowsFromEvents(events, job.locale)
      const fromLlm = await llmHarvestFacePushWindows(env, {
        locale: job.locale,
        events,
        chapterHints: normalized.chapters
          .slice(0, 3)
          .map((ch) => `${ch.kind}:${(ch.reef ?? ch.remedy ?? '').slice(0, 80)}`)
          .join(' | '),
      })
      await replaceFaceoraclePushFuel(db, {
        userId: job.userId,
        sourceReadingId: readingId,
        locale: job.locale,
        windows: [...fromLlm, ...fromEvents],
      })
    } catch (err) {
      console.error('[faceoracle-job] push harvest failed', jobId, err)
    }
  }

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
  message: string,
  env?: CloudflareBindings | null
): Promise<void> {
  const job = await db.select().from(faceoracleJobs).where(eq(faceoracleJobs.id, jobId)).get()
  if (!job || job.stage === 'done' || job.stage === 'failed') return
  await failJob(db, job, message, true, env)
}
