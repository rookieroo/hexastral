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
 * Anonymous identity (HMAC v2): the route requires the standard mobile signing
 * envelope but does NOT derive birth from `userId` — the body carries the birth
 * fields, so the same handler answers both Auspice (where birth is locally held on
 * device) and a future Fate-flagship caller. The wiring in `index.ts` adds the
 * `hmacVerify` middleware on `/api/auspice/timeline` only (rest of `/api/auspice/*`
 * stays anonymous, IP rate-limited).
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

interface DayunRow {
  index: number
  pillar: PillarUnit
  startYear: number
  endYear: number
  startAge: number
  endAge: number
  isCurrent: boolean
}

interface LiunianRow {
  year: number
  pillar: PillarUnit
  age: number
  isCurrent: boolean
}

interface LiuyueRow {
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
  thisYearLiuyue: LiuyueRow[]
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
  }))
  const currentLiunianIndex = liunianRows.findIndex((r) => r.isCurrent)

  // 4) 流月 — 12 lunar months of the CURRENT Gregorian year. 月支 enumerates from 寅 (= lunar 正月)
  //    so branchIdx = (lunarMonth + 1) mod 12 in astro-core's 0-based branch order
  //    (子=0..亥=11 → 寅=2). 月干 derives from 年干 via the 五虎遁 table that
  //    `monthGanZhi(yearStemIdx, monthBranchIdx)` already encodes.
  const thisYearGZ = yearGanZhi(todayYear)
  const yearStemIdx = HEAVENLY_STEMS.indexOf(thisYearGZ.stem)
  const todayMonth = now.getUTCMonth() + 1 // 1..12 — Gregorian; close-enough proxy for "current 流月".
  const liuyueRows: LiuyueRow[] = []
  for (let lunarMonth = 1; lunarMonth <= 12; lunarMonth++) {
    // 正月 → 寅 (branchIdx 2), 二月 → 卯 (3), …, 腊月 → 丑 (1).
    const branchIdx = (lunarMonth + 1) % 12
    const gz = monthGanZhi(yearStemIdx, branchIdx)
    liuyueRows.push({
      month: lunarMonth,
      pillar: pillarFrom(gz.stem, gz.branch),
      // Heuristic — Gregorian month ≈ lunar month for the "isCurrent" badge.
      // The cycle-app already shows the lunar/solar gap in copy, so an exact
      // 节气-aware switch isn't required for the visual indicator here.
      isCurrent: lunarMonth === todayMonth,
    })
  }
  // EARTHLY_BRANCHES is imported only for type-checking the branch domain — no runtime use.
  // (Bundler tree-shakes it; keeping the import documents the canonical ordering.)
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
    thisYearLiuyue: liuyueRows,
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
