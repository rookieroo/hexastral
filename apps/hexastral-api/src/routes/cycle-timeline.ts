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
import { lifeTimelineCache, TIMELINE_CACHE_VERSION } from '../db/schema'
import type { AppDb, AppEnv } from '../infra-types'
import { jsonOk } from '../lib/api-response'

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
  schemaVersion: 1
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
  const dayunRows: DayunRow[] = daYun.steps.map((s) => ({
    index: s.index,
    pillar: pillarFrom(s.ganZhi.stem, s.ganZhi.branch),
    startYear: s.startYear,
    endYear: s.endYear,
    startAge: s.startAge,
    endAge: s.endAge,
    isCurrent: todayYear >= s.startYear && todayYear <= s.endYear,
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
    schemaVersion: 1,
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

// Re-export for callers that need the deterministic computer (Agent D's iOS
// timeline preview screen + jest tests in cycle-app).
export { computeContextKey }

// Reject anything other than POST on the sub-path with a clean 405.
auspiceTimelineRoutes.all('/', (c) => {
  throw new HTTPException(405, { message: 'method not allowed' })
})
