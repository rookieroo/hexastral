/**
 * POST /api/auspice/timeline — Auspice's "Life Timeline" Pro payload (Sprint 4 backend).
 *
 * Deterministic by design (ADR-0020):
 *   大运 (10-year cycles) · 流年 (yearly ±5) · 流月 (this year's 12 lunar months) — ALL
 *   derived from the Four Pillars (八字). No LLM, no narration. The Pro AI elaboration
 *   layer is intentionally deferred — this endpoint is the engine the UI hangs off.
 *
 * Reproducibility contract:
 *   `(birthDate, birthHour, gender, locale, TIMELINE_CACHE_VERSION)` →
 *   sha256 contextKey → 30-day D1 cache. Same key returns the **exact byte-for-byte**
 *   payload on the next call (the cycle-app gates its hand-off animations on this).
 *   Bump `TIMELINE_CACHE_VERSION` in `db/schema.ts` to invalidate all cached payloads
 *   at once (e.g. shape change, astro-core algorithm fix).
 *
 * Anonymous-capable: the handler NEVER reads `userId` — the request body fully
 * determines both the cache key (`computeContextKey`) and the deterministic payload,
 * so the same handler answers Auspice (anonymous, birth held on-device) and a future
 * signed Fate-flagship caller alike. Originally HMAC-gated, dropped 2026-06 because
 * Auspice is a Tier-3 satellite with no sign-in path — anonymous users couldn't reach
 * the 四柱八字 glossary section at all. Protected by the same cycle:IP rate-limiter
 * the rest of `/api/auspice/*` uses (index.ts).
 *
 * Compute path (cache miss):
 *   1. `getFourPillars` for the 4 pillars (year/month/day/hour — hour=null when birthHour=-1).
 *   2. `calculateDaYun` for 8 大运 steps + the `isCurrent` index.
 *   3. `getLiuNianRange` for ±5 流年 around the current Gregorian year + the `isCurrent` index.
 *   4. Derive the 12 流月 of the current year from `yearGanZhi` + `monthGanZhi` (五虎遁 — the
 *      year-stem + lunar-month-branch table that astro-core already exposes).
 *
 * The shape is the `TimelinePayload` interface the cycle-app's timeline tab consumes;
 * keep this in lock-step with `apps/auspice-app/lib/api.ts` `TimelinePayload` (Agent D).
 */

import {
  calculateDaYun,
  EARTHLY_BRANCHES,
  type EarthlyBranch,
  getFourPillars,
  getLiuNianRange,
  HEAVENLY_STEMS,
  type HeavenlyStem,
  monthGanZhi,
  type PersonalAlmanacSubject,
  type PersonalFit,
  type PersonalReasonCode,
  personalAlmanacOverlay,
  STEM_WUXING,
  timeIndexFromHour,
  type WuXing,
  yearGanZhi,
  type ZiweiTimingSummary,
  type ZiweiTone,
  ziweiSelfMonthSignal,
  ziweiSelfYearSignal,
} from '@zhop/astro-core'
import { and, eq, gt } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import {
  auspicePushSubs,
  lifeTimelineCache,
  TIMELINE_CACHE_VERSION,
  timelineReadings,
} from '../db/schema'
import type { AppDb, AppEnv } from '../infra-types'
import { jsonOk } from '../lib/api-response'
import { astroClient } from '../lib/service-clients'
import {
  evaluateLlmGuard,
  type LlmGuardConfig,
  recordLlmGuardGrant,
  resolveLlmGuardSubject,
} from '../services/shared/llm-guard'

export const auspiceTimelineRoutes = new Hono<AppEnv>()

// ── Public shape ────────────────────────────────────────────────
// Single source of truth for both the route response and the Drizzle cache JSON
// blob. The cycle-app's `TimelinePayload` interface mirrors this exactly; bumping
// `schemaVersion` + `TIMELINE_CACHE_VERSION` together is how we invalidate
// older cached payloads when the shape changes.

interface PillarUnit {
  stem: string
  branch: string
  element: WuXing
}

/** Personal verdict for a period, from `personalAlmanacOverlay` — the SAME engine
 *  that powers the daily 黄历 「对你而言」, applied to the period pillar (流月/流年/大运)
 *  instead of the day pillar. Subject = 日主 + 本命支 (matches the daily overlay). */
interface PeriodFit {
  fit: PersonalFit
  reasons: PersonalReasonCode[]
  /** 紫微 second-system corroboration for this period (present only when the user
   *  has a birth hour + the 流年/流月四化 lights a life palace). The 八字 verdict above
   *  stays authoritative; 紫微 only breaks a 平 tie (see `applyZiweiToTimeline`). */
  ziwei?: { tone: ZiweiTone }
}

interface DayunRow extends PeriodFit {
  index: number
  pillar: PillarUnit
  startYear: number
  endYear: number
  startAge: number
  endAge: number
  isCurrent: boolean
  /** The 大运's own 流年 commits (every year of the decade), so the client can
   *  draw each 大运 as a real git-graph branch (BT git-graph redesign). */
  liunian: LiunianRow[]
}

interface LiunianRow extends PeriodFit {
  year: number
  pillar: PillarUnit
  age: number
  isCurrent: boolean
}

interface LiuyueRow extends PeriodFit {
  /** Gregorian year of this 流月 (the window rolls across the year boundary). */
  year: number
  /** Gregorian month 1..12 (≈ lunar month; 节气-accurate boundaries are a TODO). */
  month: number
  pillar: PillarUnit
  isCurrent: boolean
}

export interface TimelinePayload {
  schemaVersion: 2
  computedAt: string
  birth: { date: string; hour: number; gender: 'M' | 'F' }
  pillars: {
    year: PillarUnit
    month: PillarUnit
    day: PillarUnit
    hour: PillarUnit | null
  }
  dayun: DayunRow[]
  currentDayunIndex: number
  liunian: LiunianRow[]
  currentLiunianIndex: number
  /** Rolling 12-month 流月 window from the current Gregorian month (spans the year
   *  boundary). Renamed from `thisYearLiuyue` when it became rolling (Phase 2). */
  liuyue: LiuyueRow[]
}

// ── Request validation ──────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const requestSchema = z.object({
  birthDate: z.string().regex(DATE_RE, 'birthDate must be YYYY-MM-DD'),
  /** 0..23 for a known hour; -1 when the user opted out of providing one. */
  birthHour: z.number().int().min(-1).max(23),
  gender: z.enum(['M', 'F']),
  locale: z.enum(['zh-Hans', 'zh-Hant', 'ja', 'en']),
})

type RequestBody = z.infer<typeof requestSchema>

// ── Pure compute (separated for direct unit-testing without a DB) ─────

/**
 * Hash the cache-key inputs. Web Crypto in Workers; falls back to Node's
 * `crypto.subtle` in `bun:test`. The version string is concatenated last so an
 * algorithm/shape change just flips a constant in `schema.ts`.
 */
async function computeContextKey(body: RequestBody): Promise<string> {
  const raw = `${body.birthDate}:${body.birthHour}:${body.gender}:${body.locale}:${TIMELINE_CACHE_VERSION}`
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function pillarFrom(stem: HeavenlyStem, branch: EarthlyBranch): PillarUnit {
  return { stem, branch, element: STEM_WUXING[stem] }
}

/**
 * Build the deterministic timeline payload from raw birth inputs + a fixed
 * "today" anchor. Pure function — no IO. Exported so tests can drive it with a
 * fixed clock for cache-determinism assertions.
 */
export function buildTimelinePayload(body: RequestBody, now: Date): TimelinePayload {
  const [year, month, day] = body.birthDate.split('-').map((n) => Number.parseInt(n, 10)) as [
    number,
    number,
    number,
  ]
  const hasHour = body.birthHour >= 0
  const hourForPillars = hasHour ? body.birthHour : 0
  // astro-core's Gender enum is the CJK literal; map at the boundary.
  const astroGender = body.gender === 'M' ? '男' : '女'

  // 1) Four Pillars (Gregorian → 八字).
  const pillars = getFourPillars({ year, month, day, hour: hourForPillars })
  const yearP = pillarFrom(pillars.year.stem, pillars.year.branch)
  const monthP = pillarFrom(pillars.month.stem, pillars.month.branch)
  const dayP = pillarFrom(pillars.day.stem, pillars.day.branch)
  const hourP = hasHour ? pillarFrom(pillars.hour.stem, pillars.hour.branch) : null

  // Personal overlay — the SAME engine as the daily 黄历 「对你而言」, applied to each
  // period pillar. Subject = 日主 + 本命支 (no 用神, matching the daily auspice overlay)
  // so the timeline verdict and the daily verdict are computed identically — the
  // timeline just answers 流月/流年/大运 instead of 流日.
  const subject: PersonalAlmanacSubject = {
    dayMasterStem: pillars.day.stem,
    birthBranch: pillars.year.branch,
  }
  const periodFit = (stem: HeavenlyStem, branch: EarthlyBranch): PeriodFit => {
    const o = personalAlmanacOverlay(subject, { dayElement: STEM_WUXING[stem], dayBranch: branch })
    return { fit: o.fit, reasons: o.reasons }
  }

  // 2) 大运 — 8 steps (covers ~80 years; covers a normal lifespan with margin).
  const daYun = calculateDaYun({ year, month, day, hour: hourForPillars }, astroGender, 8)
  // Current year drives the "where am I" indices. Use Gregorian year (not 立春-aware) — the
  // timeline rows track Gregorian boundaries, so a January user landing pre-立春 still
  // sees their current row correctly bracketed.
  const todayYear = now.getUTCFullYear()
  // Build each 大运's own 流年 commits (the full decade) so the client can draw
  // every 大运 as a real branch with nodes that merge back — not a bare bump.
  const liunianForDayun = (startYear: number, endYear: number): LiunianRow[] =>
    getLiuNianRange(year, startYear, endYear).map((ln) => ({
      year: ln.year,
      pillar: pillarFrom(ln.ganZhi.stem, ln.ganZhi.branch),
      age: ln.age,
      isCurrent: ln.year === todayYear,
      ...periodFit(ln.ganZhi.stem, ln.ganZhi.branch),
    }))
  const dayunRows: DayunRow[] = daYun.steps.map((s) => ({
    index: s.index,
    pillar: pillarFrom(s.ganZhi.stem, s.ganZhi.branch),
    startYear: s.startYear,
    endYear: s.endYear,
    startAge: s.startAge,
    endAge: s.endAge,
    isCurrent: todayYear >= s.startYear && todayYear <= s.endYear,
    liunian: liunianForDayun(s.startYear, s.endYear),
    ...periodFit(s.ganZhi.stem, s.ganZhi.branch),
  }))
  const currentDayunIndex = dayunRows.findIndex((r) => r.isCurrent)

  // 3) 流年 — ±5 years around the current year. astro-core's `getLiuNianRange` returns
  //    虚岁 (Chinese age) consistent with 大运 startAge; we keep that convention so
  //    UI age math doesn't drift between rows.
  const liunianFrom = todayYear - 5
  const liunianTo = todayYear + 5
  const liunianRaw = getLiuNianRange(year, liunianFrom, liunianTo)
  const liunianRows: LiunianRow[] = liunianRaw.map((ln) => ({
    year: ln.year,
    pillar: pillarFrom(ln.ganZhi.stem, ln.ganZhi.branch),
    age: ln.age,
    isCurrent: ln.year === todayYear,
    ...periodFit(ln.ganZhi.stem, ln.ganZhi.branch),
  }))
  const currentLiunianIndex = liunianRows.findIndex((r) => r.isCurrent)

  // 4) 流月 — a ROLLING 12-month window from the current Gregorian month (spans the
  //    year boundary so the cycle-app's "next N months" preview + the node reminders
  //    don't truncate in December). Each month uses its OWN Gregorian year's 年干 for
  //    the 五虎遁 月干 derivation. 月支 enumerates from 寅 (正月) → branchIdx (m+1) mod 12.
  //    Gregorian month ≈ lunar month (节气-accurate boundaries remain a TODO, as before).
  const liuyueRows: LiuyueRow[] = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(todayYear, now.getUTCMonth() + i, 1))
    const gYear = d.getUTCFullYear()
    const gMonth = d.getUTCMonth() + 1
    const yearStemIdx = HEAVENLY_STEMS.indexOf(yearGanZhi(gYear).stem)
    const gz = monthGanZhi(yearStemIdx, (gMonth + 1) % 12)
    liuyueRows.push({
      year: gYear,
      month: gMonth,
      pillar: pillarFrom(gz.stem, gz.branch),
      isCurrent: i === 0,
      ...periodFit(gz.stem, gz.branch),
    })
  }
  // EARTHLY_BRANCHES is imported only for type-checking the branch domain — no runtime use.
  void EARTHLY_BRANCHES

  return {
    schemaVersion: 2,
    computedAt: now.toISOString(),
    birth: { date: body.birthDate, hour: body.birthHour, gender: body.gender },
    pillars: { year: yearP, month: monthP, day: dayP, hour: hourP },
    dayun: dayunRows,
    currentDayunIndex,
    liunian: liunianRows,
    currentLiunianIndex,
    liuyue: liuyueRows,
  }
}

// ── 紫微 second-system fold (auspice solo, ADR-0014 P5) ──────────────────────────
//
// The 八字 payload above is the deterministic spine. When the user has a birth hour
// (紫微 命宫 needs it) we fetch their star→palace summary once (svc-astro, on cache
// miss) and fold a 流年/流月四化 corroboration into each period: record the 紫微 tone,
// and let 紫微 BREAK A 平 TIE only (harmony→吉, tension→凶). A 八字 吉/凶 is never
// overridden — 紫微 raises confidence / informs the neutral, it doesn't outvote 八字.

/** Apply a year's 紫微 signal to a 流年 row (and never override a 八字 吉/凶). */
function foldYearZiwei<T extends PeriodFit & { year: number }>(
  row: T,
  summary: ZiweiTimingSummary
): T {
  const sig = ziweiSelfYearSignal(summary, row.year)
  if (!sig.significant) return row
  return { ...row, fit: tieBreak(row.fit, sig.tone), ziwei: { tone: sig.tone } }
}

/** Apply a month's 紫微 signal to a 流月 row. */
function foldMonthZiwei<T extends PeriodFit & { pillar: PillarUnit }>(
  row: T,
  summary: ZiweiTimingSummary
): T {
  const sig = ziweiSelfMonthSignal(summary, row.pillar.stem as HeavenlyStem)
  if (!sig.significant) return row
  return { ...row, fit: tieBreak(row.fit, sig.tone), ziwei: { tone: sig.tone } }
}

/** 紫微 only decides a 平 (neutral) verdict; 吉/凶 from 八字 are kept as-is. */
export function tieBreak(fit: PersonalFit, tone: ZiweiTone): PersonalFit {
  if (fit !== '平') return fit
  if (tone === 'harmony') return '吉'
  if (tone === 'tension') return '凶'
  return '平'
}

/** Fold the solo 紫微 signal into every 流年 + 流月 row (top-level + per-大运). Pure. */
export function applyZiweiToTimeline(
  payload: TimelinePayload,
  summary: ZiweiTimingSummary
): TimelinePayload {
  return {
    ...payload,
    dayun: payload.dayun.map((d) => ({
      ...d,
      liunian: d.liunian.map((ln) => foldYearZiwei(ln, summary)),
    })),
    liunian: payload.liunian.map((ln) => foldYearZiwei(ln, summary)),
    liuyue: payload.liuyue.map((ly) => foldMonthZiwei(ly, summary)),
  }
}

// ── Cache adapter (D1 + Drizzle) ────────────────────────────────

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

async function readCached(db: AppDb, contextKey: string, nowIso: string): Promise<string | null> {
  const row = await db
    .select({ contentJson: lifeTimelineCache.contentJson })
    .from(lifeTimelineCache)
    .where(
      and(eq(lifeTimelineCache.contextKey, contextKey), gt(lifeTimelineCache.expiresAt, nowIso))
    )
    .limit(1)
    .get()
  return row?.contentJson ?? null
}

async function writeCached(
  db: AppDb,
  contextKey: string,
  contentJson: string,
  now: Date
): Promise<void> {
  const expiresAt = new Date(now.getTime() + CACHE_TTL_MS).toISOString()
  await db
    .insert(lifeTimelineCache)
    .values({
      id: crypto.randomUUID(),
      contextKey,
      contentJson,
      expiresAt,
      createdAt: now.toISOString(),
    })
    // Same context key → overwrite the row; lets us bump payloads when a user re-saves
    // their birth (e.g. fixing a typo) without leaving stale JSON around.
    .onConflictDoUpdate({
      target: lifeTimelineCache.contextKey,
      set: { contentJson, expiresAt, createdAt: now.toISOString() },
    })
}

// ── Route ───────────────────────────────────────────────────────

auspiceTimelineRoutes.post('/', async (c) => {
  const parsed = requestSchema.safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) {
    throw new HTTPException(400, { message: 'invalid timeline request body' })
  }
  const body = parsed.data
  const now = new Date()
  const contextKey = await computeContextKey(body)

  const db = c.get('db')

  // Cache hit → return byte-identical JSON. We `JSON.parse` so the envelope
  // shape stays consistent (`jsonOk` re-serializes); the byte-for-byte
  // contract is on the **input → output** mapping, not on whitespace.
  const cached = db ? await readCached(db, contextKey, now.toISOString()).catch(() => null) : null
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as TimelinePayload
      return jsonOk(c, parsed)
    } catch {
      // Corrupt blob — fall through to recompute + overwrite.
    }
  }

  let payload = buildTimelinePayload(body, now)

  // 紫微 second-system fold — best-effort, only on this (cache-miss) path so the
  // svc-astro hop is amortised by the birth-hash cache (≈once per unique birth).
  // Needs a birth hour (命宫 depends on it); any failure degrades to 八字-only.
  if (body.birthHour >= 0) {
    try {
      const { summary } = await astroClient.post<{
        summary: { starToPalace: Record<string, string> } | null
      }>(c.env.SVC_ASTRO, '/stellar/ziwei-summary', {
        solarDate: body.birthDate,
        timeIndex: timeIndexFromHour(body.birthHour),
        gender: body.gender === 'M' ? '男' : '女',
      })
      if (summary?.starToPalace) payload = applyZiweiToTimeline(payload, summary)
    } catch (err) {
      console.warn('[auspice.timeline] 紫微 fold skipped', err)
    }
  }

  const contentJson = JSON.stringify(payload)
  if (db) {
    // Cache writes are best-effort; a D1 hiccup must not bork the response.
    try {
      await writeCached(db, contextKey, contentJson, now)
    } catch (err) {
      console.warn('[auspice.timeline] cache write failed', err)
    }
  }
  return jsonOk(c, payload)
})

// ── POST /explain — per-node LLM deep-read, persisted (落库). ──────────────────
//
// The Pro depth layer over the deterministic timeline: a rich reading for ONE
// 大运/流年/流月 node, generated on demand and PERSISTED to `timeline_readings`
// so re-views AND the cron push (流月/流年/大运 node notifications — the #1 paid
// hook) reuse the SAME row. Deterministic inputs → a reading never changes →
// cached FOREVER (no TTL), bounding LLM spend to "nodes actually surfaced".
// Free / guard-exhausted → `reading: null`; the client renders its own
// deterministic `resolveNodeDetail`. Mirrors fate `/api/timeline/explain` + the
// make-if 落库 pattern. See docs/timeline-deep-read-plan.md.
//
// DEPLOY DEPENDENCIES (not exercised in CI): svc-astro `/timeline/explain` must
// accept this body (nodeType incl. 流月 + element/fit/reasons), and the D1
// migration for `timeline_readings` must be generated + applied.

const EXPLAIN_GUARD = {
  app: 'auspice-timeline',
  dailyLimitAnon: 1,
  dailyLimitSigned: 5,
  lifetimePeakPass: 1,
  globalDailyBudget: 5000,
  noRollover: true,
  noPeriodicRefill: true,
} as const satisfies LlmGuardConfig

const explainSchema = z.object({
  deviceId: z.string().max(128).optional(),
  userId: z.string().max(128).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthHour: z.number().int().min(-1).max(23),
  gender: z.enum(['M', 'F']),
  nodeType: z.enum(['大运', '流年', '流月']),
  year: z.number().int().min(1900).max(2200),
  /** 1-12 for 流月; 0 (default) for 流年/大运. */
  month: z.number().int().min(0).max(12).default(0),
  locale: z.string().max(16).default('en'),
})

/** Tiny non-crypto hash so raw IPs never land in guard keys (mirrors timeline.ts). */
function hashIp(ip: string): string {
  let h = 2_166_136_261
  for (let i = 0; i < ip.length; i++) {
    h ^= ip.charCodeAt(i)
    h = Math.imul(h, 16_777_619)
  }
  return (h >>> 0).toString(36)
}

interface NodeFacts {
  ganZhi: string
  element: WuXing
  fit: PersonalFit
  reasons: PersonalReasonCode[]
  year: number
  month: number
  startAge?: number
  endAge?: number
  age?: number
}

/** Deterministic facts for ONE timeline node — the LLM prompt inputs (the engine
 *  computes them; the client never sends an authoritative reading). Reuses the
 *  SAME `personalAlmanacOverlay` 对你而言 engine as buildTimelinePayload. */
function resolveNodeFacts(
  birthDate: string,
  birthHour: number,
  gender: 'M' | 'F',
  nodeType: '大运' | '流年' | '流月',
  targetYear: number,
  month: number
): NodeFacts | null {
  const [by, bm, bd] = birthDate.split('-').map((n) => Number.parseInt(n, 10)) as [
    number,
    number,
    number,
  ]
  const hourForPillars = birthHour >= 0 ? birthHour : 0
  const pillars = getFourPillars({ year: by, month: bm, day: bd, hour: hourForPillars })
  const subject: PersonalAlmanacSubject = {
    dayMasterStem: pillars.day.stem,
    birthBranch: pillars.year.branch,
  }
  const fitOf = (stem: HeavenlyStem, branch: EarthlyBranch): PeriodFit => {
    const o = personalAlmanacOverlay(subject, { dayElement: STEM_WUXING[stem], dayBranch: branch })
    return { fit: o.fit, reasons: o.reasons }
  }

  if (nodeType === '流年') {
    const ln = getLiuNianRange(by, targetYear, targetYear)[0]
    if (!ln) return null
    return {
      ganZhi: `${ln.ganZhi.stem}${ln.ganZhi.branch}`,
      element: STEM_WUXING[ln.ganZhi.stem],
      year: targetYear,
      month: 0,
      age: ln.age,
      ...fitOf(ln.ganZhi.stem, ln.ganZhi.branch),
    }
  }
  if (nodeType === '流月') {
    const yStemIdx = HEAVENLY_STEMS.indexOf(yearGanZhi(targetYear).stem)
    const gz = monthGanZhi(yStemIdx, (month + 1) % 12)
    return {
      ganZhi: `${gz.stem}${gz.branch}`,
      element: STEM_WUXING[gz.stem],
      year: targetYear,
      month,
      ...fitOf(gz.stem, gz.branch),
    }
  }
  // 大运 — the step covering targetYear.
  const astroGender = gender === 'M' ? '男' : '女'
  const steps = calculateDaYun(
    { year: by, month: bm, day: bd, hour: hourForPillars },
    astroGender,
    8
  ).steps
  const step = steps.find((s) => targetYear >= s.startYear && targetYear <= s.endYear)
  if (!step) return null
  return {
    ganZhi: `${step.ganZhi.stem}${step.ganZhi.branch}`,
    element: STEM_WUXING[step.ganZhi.stem],
    year: step.startYear,
    month: 0,
    startAge: step.startAge,
    endAge: step.endAge,
    ...fitOf(step.ganZhi.stem, step.ganZhi.branch),
  }
}

auspiceTimelineRoutes.post('/explain', async (c) => {
  const body = explainSchema.parse(await c.req.json().catch(() => ({})))
  const facts = resolveNodeFacts(
    body.birthDate,
    body.birthHour,
    body.gender,
    body.nodeType,
    body.year,
    body.month
  )
  if (!facts) return jsonOk(c, { reading: null, source: 'none' })

  const owner = body.userId ? `user:${body.userId}` : `device:${body.deviceId ?? 'anon'}`
  // Include the cache version so a prompt/language fix invalidates stale readings
  // (e.g. en-keyed rows that the old prompt wrote in Chinese — see svc-astro/timeline).
  const id = `${body.nodeType}:${body.year}:${body.month}:${body.locale}:${TIMELINE_CACHE_VERSION}`
  const db = c.get('db')

  // 1. 落库 hit — instant, no LLM spend (the generate-once substrate the push shares).
  if (db) {
    try {
      const hit = await db
        .select()
        .from(timelineReadings)
        .where(
          and(
            eq(timelineReadings.owner, owner),
            eq(timelineReadings.id, id),
            eq(timelineReadings.birthDate, body.birthDate),
            eq(timelineReadings.birthHour, body.birthHour),
            eq(timelineReadings.gender, body.gender)
          )
        )
        .limit(1)
      if (hit[0]) return jsonOk(c, { reading: hit[0].reading, source: 'cache' })
    } catch (err) {
      console.warn('[auspice.timeline.explain] 落库 read failed', err)
    }
  }

  // 2. Guard (subject userId > deviceId > ipHash). No subject / exhausted → null
  //    reading; the client renders its own deterministic resolveNodeDetail.
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const subject = resolveLlmGuardSubject({
    userId: body.userId,
    deviceId: body.deviceId,
    ipHash: hashIp(ip),
  })
  if (!subject) return jsonOk(c, { reading: null, source: 'template' })
  const guard = await evaluateLlmGuard(c.env, { subject, config: EXPLAIN_GUARD })

  if (guard.decision === 'allow_llm') {
    try {
      const resp = await astroClient.post<{ explanation: string }>(
        c.env.SVC_ASTRO,
        '/timeline/explain',
        {
          nodeType: body.nodeType,
          year: facts.year,
          month: body.month,
          ganZhi: facts.ganZhi,
          element: facts.element,
          fit: facts.fit,
          reasons: facts.reasons,
          locale: body.locale,
          isPro: guard.tier === 'deep',
        }
      )
      const reading = (resp.explanation ?? '').trim()
      if (reading) {
        // 落库 — generate-ONCE, no TTL: deterministic input → stable reading, so
        // re-views + the cron push all reuse this row. Best-effort write.
        if (db) {
          try {
            await db
              .insert(timelineReadings)
              .values({
                owner,
                id,
                birthDate: body.birthDate,
                birthHour: body.birthHour,
                gender: body.gender,
                nodeType: body.nodeType,
                year: facts.year,
                month: body.month,
                reading,
                tier: guard.tier === 'deep' ? 'deep' : 'standard',
                locale: body.locale,
                createdAt: new Date().toISOString(),
              })
              .onConflictDoUpdate({
                target: [timelineReadings.owner, timelineReadings.id],
                set: {
                  reading,
                  tier: guard.tier === 'deep' ? 'deep' : 'standard',
                  birthDate: body.birthDate,
                  birthHour: body.birthHour,
                  gender: body.gender,
                },
              })
          } catch (err) {
            console.warn('[auspice.timeline.explain] 落库 write failed', err)
          }
        }
        await recordLlmGuardGrant(c.env, {
          subject,
          config: EXPLAIN_GUARD,
          consumesPeakPass: guard.consumesPeakPass,
        })
        return jsonOk(c, { reading, source: 'llm', tier: guard.tier })
      }
    } catch (err) {
      console.error('[auspice.timeline.explain] svc-astro failed', err)
    }
    return jsonOk(c, { reading: null, source: 'template' })
  }

  return jsonOk(c, { reading: null, source: 'template', upsell: guard.upsellAfterExhaust })
})

// ── GET /push/targets — 人生时间线 node push (P2, the headline Pro hook). ──────
//
// 流月 (month-start) / 流年 (year-start) / 大运 (transition year) — ONE node/day,
// most-significant first: 大运 boundary > 流年 (Jan 1) > 流月 (every month start).
// The push is a DETERMINISTIC personalized teaser (干支 + 对你 fit + a deep-link);
// the rich LLM read is generated LAZILY in-app on tap (reuses /explain + 落库), so
// the cron stays cheap (no per-user LLM). Internal-key gated; svc-notify cron calls
// it per timezone on month-starts. See docs/timeline-deep-read-plan.md §P2.

interface TimelinePushLabels {
  dayun: { title: string; tap: string }
  liunian: (y: number) => { title: string; tap: string }
  liuyue: (m: number) => { title: string; tap: string }
  forYou: string
  fit: Record<string, string>
}

const TIMELINE_PUSH_LABELS: Record<string, TimelinePushLabels> = {
  'zh-Hans': {
    dayun: { title: '新的十年大运', tap: '点开看人生新章' },
    liunian: (y) => ({ title: `${y} 年 · 新流年`, tap: '点开看这一年' }),
    liuyue: (m) => ({ title: `${m} 月 · 新流月`, tap: '点开看这个月' }),
    forYou: '对你',
    fit: { 吉: '宜把握', 平: '平稳', 凶: '宜谨慎' },
  },
  'zh-Hant': {
    dayun: { title: '新的十年大運', tap: '點開看人生新章' },
    liunian: (y) => ({ title: `${y} 年 · 新流年`, tap: '點開看這一年' }),
    liuyue: (m) => ({ title: `${m} 月 · 新流月`, tap: '點開看這個月' }),
    forYou: '對你',
    fit: { 吉: '宜把握', 平: '平穩', 凶: '宜謹慎' },
  },
  ja: {
    dayun: { title: '新しい十年の大運', tap: '人生の新章を見る' },
    liunian: (y) => ({ title: `${y} 年 · 新しい流年`, tap: 'この一年を見る' }),
    liuyue: (m) => ({ title: `${m} 月 · 新しい流月`, tap: 'この月を見る' }),
    forYou: 'あなたへ',
    fit: { 吉: '好機', 平: '平穏', 凶: '慎重に' },
  },
  en: {
    dayun: { title: 'A new 10-year chapter', tap: 'open your new chapter' },
    liunian: (y) => ({ title: `${y} · your year ahead`, tap: 'open this year' }),
    liuyue: (m) => ({ title: `Month ${m} · the month ahead`, tap: 'open this month' }),
    forYou: 'You',
    fit: { 吉: 'favorable', 平: 'steady', 凶: 'cautious' },
  },
}

function timelinePushLabels(locale: string): TimelinePushLabels {
  const en = TIMELINE_PUSH_LABELS.en as TimelinePushLabels // 'en' always exists
  if (locale.startsWith('zh-Hant')) return TIMELINE_PUSH_LABELS['zh-Hant'] ?? en
  if (locale.startsWith('zh')) return TIMELINE_PUSH_LABELS['zh-Hans'] ?? en
  if (locale.startsWith('ja')) return TIMELINE_PUSH_LABELS.ja ?? en
  return en
}

auspiceTimelineRoutes.get('/push/targets', async (c) => {
  const key = c.req.header('X-Internal-Key')
  if (!key || key !== c.env.INTERNAL_KEY) throw new HTTPException(401, { message: 'Unauthorized' })
  const timezoneId = c.req.query('timezoneId')
  const date = c.req.query('date')
  if (!timezoneId || !date || !DATE_RE.test(date)) {
    throw new HTTPException(400, { message: 'timezoneId + date=YYYY-MM-DD required' })
  }
  const [yy, mm, dd] = date.split('-').map((n) => Number.parseInt(n, 10)) as [
    number,
    number,
    number,
  ]
  // Timeline node pushes fire on MONTH-STARTS only (the cron schedules accordingly).
  if (dd !== 1) return jsonOk(c, { messages: [], hasMore: false, nextCursor: null })

  const db = c.get('db')
  if (!db) return jsonOk(c, { messages: [], hasMore: false, nextCursor: null })
  const limit = Math.min(Number.parseInt(c.req.query('limit') ?? '200', 10) || 200, 500)
  const offset = Number.parseInt(c.req.query('cursor') ?? '0', 10)
  const page0 = await db
    .select({
      deviceId: auspicePushSubs.deviceId,
      token: auspicePushSubs.token,
      locale: auspicePushSubs.locale,
      birthDate: auspicePushSubs.birthDate,
      birthHour: auspicePushSubs.birthHour,
      gender: auspicePushSubs.gender,
      isPro: auspicePushSubs.isPro,
      timelineRemindOn: auspicePushSubs.timelineRemindOn,
    })
    .from(auspicePushSubs)
    .where(eq(auspicePushSubs.timezoneId, timezoneId))
    .limit(limit + 1)
    .offset(offset)
  const hasMore = page0.length > limit
  const page = hasMore ? page0.slice(0, limit) : page0

  const messages: Array<{
    deviceId: string
    token: string
    title: string
    body: string
    data: Record<string, string>
  }> = []

  for (const sub of page) {
    // Pro + opted-in + full birth (大运 direction needs gender).
    if (
      !sub.isPro ||
      !sub.timelineRemindOn ||
      !sub.birthDate ||
      sub.birthHour == null ||
      (sub.gender !== 'M' && sub.gender !== 'F')
    ) {
      continue
    }
    // Pick ONE node/day: 大运 boundary > 流年 (Jan 1) > 流月 (every month start).
    let nodeType: '大运' | '流年' | '流月'
    let month: number
    let facts: NodeFacts | null
    if (mm === 1) {
      const dy = resolveNodeFacts(sub.birthDate, sub.birthHour, sub.gender, '大运', yy, 0)
      if (dy && dy.year === yy) {
        nodeType = '大运'
        facts = dy
      } else {
        nodeType = '流年'
        facts = resolveNodeFacts(sub.birthDate, sub.birthHour, sub.gender, '流年', yy, 0)
      }
      month = 0
    } else {
      nodeType = '流月'
      month = mm
      facts = resolveNodeFacts(sub.birthDate, sub.birthHour, sub.gender, '流月', yy, mm)
    }
    if (!facts) continue
    const L = timelinePushLabels(sub.locale)
    const head = nodeType === '大运' ? L.dayun : nodeType === '流年' ? L.liunian(yy) : L.liuyue(mm)
    const fitLabel = L.fit[facts.fit] ?? String(facts.fit)
    messages.push({
      deviceId: sub.deviceId,
      token: sub.token,
      title: head.title,
      body: `${facts.ganZhi} · ${L.forYou} ${fitLabel} · ${head.tap}`,
      data: {
        type: 'auspice_timeline',
        route: '/timeline',
        nodeType,
        year: String(yy),
        month: String(month),
      },
    })
  }
  return jsonOk(c, { messages, hasMore, nextCursor: hasMore ? offset + limit : null })
})

// Re-export for callers that need the deterministic computer (Agent D's iOS
// timeline preview screen + jest tests in cycle-app).
export { computeContextKey }

// Reject anything other than POST on the sub-path with a clean 405.
auspiceTimelineRoutes.all('/', () => {
  throw new HTTPException(405, { message: 'method not allowed' })
})
