/**
 * Auspice (黄历) API client — calls the anonymous, deterministic endpoints
 * `GET /api/auspice/day` and `GET /api/auspice/search` (C.1, hexastral-api). These
 * are plain public endpoints (no HMAC/DDL), so we fetch directly off the base
 * URL rather than going through the portfolio `runAuto` pipeline.
 *
 * Response envelope is the Phase-F shape `{ ok, data }`; we unwrap `data`.
 */

import { resolvePortfolioApiUrl } from '@zhop/satellite-runtime'

// ── Domain types (mirror the C.1 route output) ────────────────────────────

export type DayOfficer =
  | '建'
  | '除'
  | '满'
  | '平'
  | '定'
  | '执'
  | '破'
  | '危'
  | '成'
  | '收'
  | '开'
  | '闭'

export interface TwentyEightMansion {
  name: string
  /** 七曜值日 (日/月/火/水/木/金/土) */
  luminary: string
  animal: string
  /** 四象 (青龙/玄武/白虎/朱雀) */
  quadrant: string
  /** 黄历分类: classical 二十八宿 marked 吉 (auspicious) vs 凶 (avoid).
   *  Renamed from `lucky` for App Store anti-spam compliance. */
  auspicious: boolean
  index: number
}

export interface DayClash {
  branch: string
  /** 干支冲: the Chinese 12-shengxiao animal whose earthly branch clashes with today.
   *  Renamed from `zodiac` (Western astrology term) — this is the 生肖 lookup, not Western zodiac. */
  clashAnimal: string
}

export interface AuspiceHour {
  name: string
  branch: string
  startHour: number
  endHour: number
  ganZhi: string
}

/** 立春-aware year pillar (Sprint 2 Tier-1 audit #5). */
export interface YearGanZhi {
  /** 年柱天干, e.g. '丙'. */
  stem: string
  /** 年柱地支, e.g. '午'. */
  branch: string
  /** 生肖, e.g. '马'. Derived from `branch` server-side so the 立春 boundary is honored. */
  animal: string
}

/** 农历 — Sprint 2 Tier-1 audit #8 (农历初一/十五 + 闰月 indicator). */
export interface LunarDateInfo {
  /** 农历 year, e.g. 2026. */
  year: number
  /** 农历 month index 1-12 (does NOT distinguish leap month — use `isLeap`). */
  month: number
  /** 农历 day-of-month 1-30. */
  day: number
  /** True when the month is a 闰月 (e.g. 2025 闰六月). */
  isLeap: boolean
  /** Localized month name; already prefixed with "闰" when `isLeap`, e.g. "五月" or "闰六月". */
  monthName: string
  /** Localized day name, e.g. "初一" / "十五" / "廿七". */
  dayName: string
  /** Glance-significant flag: 农历 day-of-month is 1 (初一 / new moon). */
  isFirst: boolean
  /** Glance-significant flag: 农历 day-of-month is 15 (十五 / full moon). */
  isFifteenth: boolean
}

export interface AuspiceDay {
  ganZhi: string
  element: string
  dayOfficer: DayOfficer
  mansion: TwentyEightMansion
  goodFor: string[]
  avoid: string[]
  clash: DayClash
  evilDirection: string
  /** 黄历吉色 — color the day's pillar favors. Renamed from `luckyColor`. */
  auspiciousColor: string
  /** 黄历吉方 — direction the day's pillar favors. Renamed from `luckyDirection`. */
  auspiciousDirection: string
  dos: string[]
  donts: string[]
  overallRating: 1 | 2 | 3 | 4 | 5
  /** Year pillar (干支 + 生肖). Sprint 2 Tier-1 audit #5: drives the hero 生肖年 chip. */
  yearGanZhi: YearGanZhi
  /** 农历. Sprint 2 Tier-1 audit #8: drives 农历 inline label + 初一/十五 emphasis on the hero. */
  lunarDate: LunarDateInfo
  /** Sprint 3 chunk 3 — set when today's date matches one of the 8 festivals. Drives the accent chip + tap to /festival/[id] on Today. */
  festivalToday: { id: string; name: string } | null
  /** Sprint 3 chunk 3 — set when today IS the gregorian day a 节气 falls on. Display-only when also a festival day (the festival chip already names it). */
  solarTermToday: { name: string } | null
  solarTerm: {
    /**
     * `instant` is the second-level UTC ISO timestamp (C.1.8 VSOP87); render
     * in local time. `date` is the UTC calendar day (back-compat).
     */
    prev: { name: string; date: string; instant: string }
    next: { name: string; date: string; instant: string }
  }
  hours: AuspiceHour[]
}

export type PersonalFit = '吉' | '平' | '凶'

export type PersonalReasonCode =
  | 'day_generates_self'
  | 'day_controls_self'
  | 'self_generates_day'
  | 'self_controls_day'
  | 'day_same_as_self'
  | 'favorable_element_present'
  | 'unfavorable_element_present'
  | 'personal_clash'

/** Deterministic "对你而言" overlay (C.3) — present only when birthDate was supplied. */
export interface AuspicePersonalization {
  dayMaster: string
  dayMasterElement: string
  relation: string
  fit: PersonalFit
  favorsToday: boolean | null
  harmsToday: boolean | null
  personalClash: boolean
  reasons: PersonalReasonCode[]
  /** Sprint 2 Tier-1 audit #10: true when the user's birth-year branch matches the current 年柱 branch (e.g. 属马 user in 丙午年). */
  benming: boolean
}

export interface AuspiceDayPayload {
  date: string
  day: AuspiceDay
  /** C.3 deterministic overlay — non-null when `birthDate` was passed to the endpoint. */
  personalization: AuspicePersonalization | null
  /** Filled by C.4 (Pro AI explanation) once requested. */
  explanation: null
}

// ── 节庆 year overview (Sprint 3 chunk 1) ─────────────────────────────────

/** One entry in the 24 节气 timeline returned by `/year-overview`. */
export interface AuspiceSolarTermEntry {
  /** 0..23 — 立春 is 0, 大寒 is 23. Stable across years. */
  index: number
  /** Localized term name in CJK, e.g. "立春". */
  name: string
  /** Gregorian date (UTC+8 calendar day) the term falls on, YYYY-MM-DD. */
  date: string
  /** Second-level UTC ISO instant; `null` only if astro-core had no entry. */
  instant: string | null
}

/** One of the 8 major Chinese festivals returned by `/year-overview`. */
export interface AuspiceFestival {
  /** Stable id; route into the future `/festival/[id]` detail page. */
  id: string
  /** Display name in CJK, e.g. "春节". */
  name: string
  /**
   * `lunar` — anchored to a fixed 农历 date (e.g. 中秋 = 八月十五).
   * `solar-term` — anchored to a 节气 (清明 / 冬至).
   */
  kind: 'lunar' | 'solar-term'
  /** Gregorian YYYY-MM-DD the festival lands on in the requested year. */
  solarDate: string
  /** "正月初一" etc. — `null` for solar-term-anchored festivals. */
  lunarLabel: string | null
}

/** Batch response for the `/festivals` drill-in's two list sections. */
export interface AuspiceYearOverviewPayload {
  year: number
  /** 24 entries, ordered by `index` (= calendar order). */
  solarTerms: AuspiceSolarTermEntry[]
  /** 8 festivals, sorted by `solarDate` (calendar order). */
  festivals: AuspiceFestival[]
}

export function fetchAuspiceYearOverview(year: number): Promise<AuspiceYearOverviewPayload> {
  return getJson<AuspiceYearOverviewPayload>(`/api/auspice/year-overview?year=${year}`)
}

// ── Month grid (Sprint 2 deliverable #2) ───────────────────────────────────

/** One day's cell data on the month grid. */
export interface AuspiceMonthDay {
  /** Gregorian day-of-month (1..31). */
  day: number
  /** ISO YYYY-MM-DD for the day. Drives the drill-in `/day/[date]` route. */
  date: string
  /** 农历 day-of-month numeric (1..30). */
  lunarDay: number
  /** Localized 农历 day name, e.g. "初一" / "十五" / "廿七". */
  lunarDayName: string
  /** Glance flag: 农历 day === 1 (new moon). */
  isLunarFirst: boolean
  /** Glance flag: 农历 day === 15 (full moon). */
  isLunarFifteenth: boolean
  /** True when this day's 农历 month is a 闰月. */
  isLeapMonth: boolean
  /** Non-null only on the gregorian day a 节气 falls on (UTC+8). */
  solarTermName: string | null
  /** Localized public-holiday name (Sprint 3 chunk 4) — non-null when the day matches a holiday in the requested locale. */
  publicHoliday: string | null
  /** Deterministic 1-5 rating from `calculateDailyAlmanac`. */
  overallRating: 1 | 2 | 3 | 4 | 5
  /** 流日 五行 of the day's 干支 — drives the cell's element-color dot. */
  dayElement: '木' | '火' | '土' | '金' | '水'
}

/** Batch response from `/api/auspice/month?year=&month=&locale=`. */
export interface AuspiceMonthPayload {
  year: number
  month: number
  /** The locale the server used to resolve `publicHoliday` strings. */
  locale: 'zh-Hans' | 'zh-Hant' | 'ja' | 'en'
  /** "{lunarYear}年 {monthName}", already prefixed with "闰" when applicable. */
  lunarMonthHeader: string
  days: AuspiceMonthDay[]
}

/** Reverse-择日 event taxonomy — must match the route's `EVENTS` enum. */
export const CYCLE_EVENTS = [
  'wedding',
  'business',
  'signing',
  'move',
  'move-in',
  'travel',
  'burial',
  'groundbreaking',
  'medical',
  'study',
] as const
export type AuspiceEvent = (typeof CYCLE_EVENTS)[number]

export interface AuspiceSearchResult {
  date: string
  score: number
  recommended: boolean
  reasoning: string
  day: {
    ganZhi: string
    dayOfficer: DayOfficer
    mansion: string
    goodFor: string[]
    avoid: string[]
  }
}

export interface AuspiceSearchPayload {
  event: AuspiceEvent
  range: { from: string; to: string }
  top: AuspiceSearchResult[]
}

// ── Fetch helpers ──────────────────────────────────────────────────────────

interface Envelope<T> {
  ok: boolean
  data?: T
  error?: { code: string; message: string }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${resolvePortfolioApiUrl()}${path}`, {
    headers: { accept: 'application/json' },
  })
  const body = (await res.json().catch(() => null)) as Envelope<T> | null
  if (!res.ok || !body || body.ok !== true || body.data === undefined) {
    throw new Error(body?.error?.message ?? `cycle request failed (${res.status})`)
  }
  return body.data
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(`${resolvePortfolioApiUrl()}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = (await res.json().catch(() => null)) as Envelope<T> | null
  if (!res.ok || !body || body.ok !== true || body.data === undefined) {
    throw new Error(body?.error?.message ?? `cycle request failed (${res.status})`)
  }
  return body.data
}

/**
 * Today's (or a given date's) almanac. `date` is `YYYY-MM-DD` (omit for today).
 * Pass `birthDate` (the user's locally-stored birth date) to get the deterministic
 * "对你而言" overlay — it never leaves the device except as this one query param.
 */
export function fetchAuspiceDay(date?: string, birthDate?: string): Promise<AuspiceDayPayload> {
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  if (birthDate) params.set('birthDate', birthDate)
  const q = params.toString()
  return getJson<AuspiceDayPayload>(`/api/auspice/day${q ? `?${q}` : ''}`)
}

/**
 * Batched month grid — 30/31 days of per-cell data in one request. Replaces
 * the wasteful per-cell `fetchAuspiceDay` round-trips the Sprint 1 grid would
 * have done. Backed by `GET /api/auspice/month?year=&month=&locale=`. The
 * locale drives the per-cell `publicHoliday` lookup (CN / JP / US holiday
 * tables) — pass the user's display locale.
 */
export function fetchAuspiceMonth(
  year: number,
  month: number,
  locale?: 'zh-Hans' | 'zh-Hant' | 'ja' | 'en'
): Promise<AuspiceMonthPayload> {
  const localeParam = locale ? `&locale=${encodeURIComponent(locale)}` : ''
  return getJson<AuspiceMonthPayload>(
    `/api/auspice/month?year=${year}&month=${month}${localeParam}`
  )
}

/** Reverse 择日: top-3 ranked days for an event within `[from, to]` (≤ 92 days). */
export function searchAuspiceDays(
  event: AuspiceEvent,
  from: string,
  to: string
): Promise<AuspiceSearchPayload> {
  const q = `?event=${event}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  return getJson<AuspiceSearchPayload>(`/api/auspice/search${q}`)
}

/**
 * Specialized 择日 event subset — must mirror the server routes.
 * Sprint 2 deliverable #3 (Tier-1 audit #4): 4 activity-tuned 择日 flows that
 * apply 建除十二神 officer boosts and tag reasoning with "相宜" / "相避".
 */
export type SpecializedCycleEvent = 'wedding' | 'move-in' | 'business' | 'travel'

/**
 * Activity-tuned 择日 — same response shape as `/search`, but the server applies
 * officer boosts and emits activity-tuned reasoning. One thin function per
 * route so call sites stay clean.
 */
export function fetchAuspiceSpecialized(
  event: SpecializedCycleEvent,
  from: string,
  to: string
): Promise<AuspiceSearchPayload> {
  const q = `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  return getJson<AuspiceSearchPayload>(`/api/auspice/${event}${q}`)
}

// ── Life Timeline (Sprint 4 — ADR-0020) ────────────────────────────────────
//
// Pro-layer payload from `POST /api/auspice/timeline`. Pure-deterministic
// computation against the user's 八字 (Four Pillars) — 大运 (10-year cycles),
// 流年 (yearly), 流月 (monthly). LLM narration is deferred (Sprint 4 v2).
// Cached server-side for 30 days; client just re-fetches on focus.

export interface PillarUnit {
  /** 天干 (one of 甲乙丙丁戊己庚辛壬癸). */
  stem: string
  /** 地支 (one of 子丑寅卯辰巳午未申酉戌亥). */
  branch: string
  /** 五行 of the pillar's stem (the canonical attribution). */
  element: '木' | '火' | '土' | '金' | '水'
}

/** Personal 对你而言 verdict for a period — the SAME `personalAlmanacOverlay` engine
 *  as the daily 黄历, applied to the period pillar (流月/流年/大运), not the day. */
export interface PeriodFit {
  fit: PersonalFit
  reasons: PersonalReasonCode[]
}

export interface DayunRow extends PeriodFit {
  /** 1..8. */
  index: number
  pillar: PillarUnit
  /** Gregorian year this 大运 begins. */
  startYear: number
  /** Gregorian year this 大运 ends (inclusive). */
  endYear: number
  /** User's age (years lived) at startYear. */
  startAge: number
  /** User's age at endYear. */
  endAge: number
  /** Set by the route based on today's date. */
  isCurrent: boolean
}

export interface LiunianRow extends PeriodFit {
  year: number
  pillar: PillarUnit
  age: number
  isCurrent: boolean
}

export interface LiuyueRow extends PeriodFit {
  /** Gregorian year (the window rolls across the year boundary). */
  year: number
  /** 1..12 Gregorian month (≈ lunar month; 节气 boundaries TODO). */
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
    /** null when birth.hour === -1 (unknown). */
    hour: PillarUnit | null
  }
  /** Always 8 rows covering 80 years. */
  dayun: DayunRow[]
  /** 0-based index into dayun[], or -1 if outside the 80-year coverage. */
  currentDayunIndex: number
  /** ±5 years around today (typically 11 entries). */
  liunian: LiunianRow[]
  currentLiunianIndex: number
  /** Rolling 12-month 流月 window from the current Gregorian month (spans the year). */
  liuyue: LiuyueRow[]
}

/**
 * Fetch the user's life-timeline payload from `POST /api/auspice/timeline`.
 *
 * Anonymous-capable as of 2026-06 (server-side HMAC gate dropped): the route is
 * purely deterministic — same body → same payload — and Auspice has no sign-in
 * flow, so gating it with HMAC made the 四柱八字 glossary section unreachable
 * for every user. The same cycle:IP rate-limiter that covers the rest of
 * `/api/auspice/*` still applies as defense-in-depth.
 */
export function fetchTimeline(args: {
  birthDate: string
  birthHour: number
  gender: 'M' | 'F'
  locale: 'zh-Hans' | 'zh-Hant' | 'ja' | 'en'
}): Promise<TimelinePayload> {
  return postJson<TimelinePayload>('/api/auspice/timeline', args)
}

/** The Pro/lazy LLM 深度解读 (C.4). `source` tells the UI if it degraded to template. */
export interface AuspiceExplainResult {
  explanation: string
  source: 'llm' | 'cache' | 'template'
  tier?: 'default' | 'deep'
  upsell: boolean
}

/**
 * Fetch the deep reading for one 宜忌/冲 field — only ever called on user tap
 * (lazy, never pre-fetched). `dayMaster` (from the day's `personalization`) adds
 * the 对你而言 angle and improves the server cache hit rate.
 */
export function fetchAuspiceExplain(params: {
  date: string
  field: string
  dayMaster?: string
  locale: string
}): Promise<AuspiceExplainResult> {
  return postJson<AuspiceExplainResult>('/api/auspice/explain', params)
}
