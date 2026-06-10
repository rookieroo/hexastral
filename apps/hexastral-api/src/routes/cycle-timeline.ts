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
  type WuXing,
  yearGanZhi,
} from '@zhop/astro-core'
import { and, eq, gt } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import { lifeTimelineCache, TIMELINE_CACHE_VERSION, timelineReadings } from '../db/schema'
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

  const payload = buildTimelinePayload(body, now)
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
  const id = `${body.nodeType}:${body.year}:${body.month}:${body.locale}`
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

// Re-export for callers that need the deterministic computer (Agent D's iOS
// timeline preview screen + jest tests in cycle-app).
export { computeContextKey }

// Reject anything other than POST on the sub-path with a clean 405.
auspiceTimelineRoutes.all('/', () => {
  throw new HTTPException(405, { message: 'method not allowed' })
})
