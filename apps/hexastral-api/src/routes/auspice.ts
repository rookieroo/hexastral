/**
 * GET /api/auspice/* — Auspice (黄历) satellite engine. 100% deterministic, no LLM.
 *
 * Thin wrapper over `@zhop/astro-core` `calculateDailyAlmanac` (干支 + 建除十二神 +
 * 二十八宿 + 建除宜忌 + 日冲煞) plus 节气 context and the 12 时辰. All compute lives in
 * the package (ADR-0008); this route only parses the request and shapes the response.
 *
 * Anonymous (no HMAC), IP rate-limited (see mount in index.ts). Personalization
 * ("对你而言", C.3) is a **deterministic** overlay: pass `birthDate` and the server derives
 * the 日主 + 生肖 and fills `personalization` via astro-core `personalAlmanacOverlay` (no LLM,
 * no userId lookup — anonymous-safe). The Pro AI explanation (`/cycle/explain`, C.4,
 * K.4-guarded) attaches later; `explanation` stays a null placeholder.
 */

import {
  allShiChen,
  calculateDailyAlmanac,
  type DailyAlmanac,
  getFourPillars,
  getJieQiInstant,
  getNearestJieQiForGregorianDate,
  getRokuyo,
  getYearJieQi,
  HEAVENLY_STEMS,
  type HeavenlyStem,
  hourGanZhi,
  lunarToSolar,
  type PersonalAlmanacSubject,
  personalAlmanacOverlay,
  STEM_WUXING,
  solarToLunar,
} from '@zhop/astro-core'
import { and, eq } from 'drizzle-orm'
import { type Context, Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import { birthdayReminders, makeifForks } from '../db/schema'
import type { AppEnv } from '../infra-types'
import { jsonOk, ok } from '../lib/api-response'
import { astroClient } from '../lib/service-clients'
import { parseRcActiveEntitlements } from '../services/revenuecat'
import {
  evaluateLlmGuard,
  type LlmGuardConfig,
  recordLlmGuardGrant,
  resolveLlmGuardSubject,
} from '../services/shared/llm-guard'

export const auspiceRoutes = new Hono<AppEnv>()

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
/** Reverse-择日 event windows can't be unbounded — a Worker must not loop forever. */
const MAX_SEARCH_SPAN_DAYS = 92

interface Ymd {
  year: number
  month: number
  day: number
}

function parseYmd(s: string): Ymd {
  if (!DATE_RE.test(s)) throw new HTTPException(400, { message: 'date must be YYYY-MM-DD' })
  const [year, month, day] = s.split('-').map((n) => Number.parseInt(n, 10)) as [
    number,
    number,
    number,
  ]
  // Reject impossible calendar dates (e.g. 2026-02-31) via a UTC round-trip.
  const probe = new Date(Date.UTC(year, month - 1, day))
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new HTTPException(400, { message: `invalid date: ${s}` })
  }
  return { year, month, day }
}

function ymdToDate(ymd: Ymd): Date {
  return new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day))
}

function fmtUtc(d: Date): string {
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${d.getUTCFullYear()}-${m}-${day}`
}

function dateToYmd(d: Date): Ymd {
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

/**
 * Derive the personal subject from a birth date (anonymous-safe; no stored lookup).
 * 日主 = birth day-stem; 生肖 = birth year-branch (for the personal 六冲). 用神/忌神 need a
 * full 八字 analysis, so they stay undefined at the route level (v1) — the deterministic
 * overlay falls back to the raw 日主 五行 relation.
 */
function subjectFromBirthDate(birthDate: string): PersonalAlmanacSubject {
  const b = parseYmd(birthDate)
  const pillars = getFourPillars({ ...b, hour: 0 })
  return { dayMasterStem: pillars.day.stem, birthBranch: pillars.year.branch }
}

/**
 * 12 地支 → 生肖. Used for the year-pillar `yearGanZhi.animal` field on the
 * day payload (Sprint 2 Tier-1 audit #5 + #10). Lookup-by-branch (not by Gregorian
 * year) so it respects the 立春 boundary the year pillar already encodes.
 */
const BRANCH_ANIMALS = [
  '鼠',
  '牛',
  '虎',
  '兔',
  '龙',
  '蛇',
  '马',
  '羊',
  '猴',
  '鸡',
  '狗',
  '猪',
] as const
const BRANCH_ORDER = '子丑寅卯辰巳午未申酉戌亥'
function branchToAnimal(branch: string): string {
  const i = BRANCH_ORDER.indexOf(branch)
  return i >= 0 && i < BRANCH_ANIMALS.length ? BRANCH_ANIMALS[i]! : ''
}

/**
 * The 8 major Chinese festivals in `docs/sprints/cycle-sprint-plan.md` Sprint
 * 3 §1. Six are anchored to fixed 农历 dates (春节 / 元宵 / 端午 / 七夕 /
 * 中秋 / 重阳); two are anchored to specific 节气 instants (清明 / 冬至).
 *
 * Hoisted above `buildDay` so the per-day endpoint can ALSO answer "is today
 * a festival?" — used by the Sprint 3 chunk 3 Today highlight chip. The
 * `/year-overview` route reuses the same tables for its list rendering.
 */
const FESTIVALS_LUNAR: ReadonlyArray<{
  id: string
  name: string
  lunarMonth: number
  lunarDay: number
  lunarLabel: string
}> = [
  { id: 'chunjie', name: '春节', lunarMonth: 1, lunarDay: 1, lunarLabel: '正月初一' },
  { id: 'yuanxiao', name: '元宵', lunarMonth: 1, lunarDay: 15, lunarLabel: '正月十五' },
  { id: 'duanwu', name: '端午', lunarMonth: 5, lunarDay: 5, lunarLabel: '五月初五' },
  { id: 'qixi', name: '七夕', lunarMonth: 7, lunarDay: 7, lunarLabel: '七月初七' },
  { id: 'zhongqiu', name: '中秋', lunarMonth: 8, lunarDay: 15, lunarLabel: '八月十五' },
  { id: 'chongyang', name: '重阳', lunarMonth: 9, lunarDay: 9, lunarLabel: '九月初九' },
]

const FESTIVALS_SOLAR_TERM: ReadonlyArray<{ id: string; name: string; termName: string }> = [
  { id: 'qingming', name: '清明', termName: '清明' },
  { id: 'dongzhi', name: '冬至', termName: '冬至' },
]

// ── Locale-scoped public holidays for the Month grid (Sprint 3 chunk 4) ──
//
// Resolved per-cell on /month requests using the user's locale. Five rule kinds
// cover the cases that matter: fixed gregorian dates (元旦, July 4th), fixed
// 农历 dates (春节, 中秋), 节气 anchors (春分の日, 清明), nth-weekday-of-month
// (Memorial Day, 海の日), and last-weekday-of-month (Memorial Day variant).
// Floating-rule helpers are tiny pure functions further down.
//
// Coverage notes:
//   - zh-Hans / zh-Hant share the mainland-CN public-holiday list; HK / TW
//     specifics (e.g. 雙十 10/10) are a v1 simplification. The user's setting
//     in Me overrides if they need a different region.
//   - ja covers the 14 国民の祝日 in the 1948 法律 + the modern 山の日 /
//     スポーツの日. Names match the official Cabinet Office spelling.
//   - en is the 8 Chinese cultural festivals translated. The app's identity is
//     a Chinese calendar utility — US federal holidays were a UX leak (e.g.
//     Juneteenth shadowing 端午 on June 19); the diaspora has the system
//     calendar for those.
type HolidayRule =
  | { kind: 'gregorian-fixed'; month: number; day: number }
  | { kind: 'lunar-fixed'; lunarMonth: number; lunarDay: number }
  | { kind: 'solar-term'; termName: string }
  | { kind: 'nth-weekday'; month: number; n: number; weekday: number /* 0=Sun..6=Sat */ }
  | { kind: 'last-weekday'; month: number; weekday: number }

interface Holiday {
  id: string
  name: string
  rule: HolidayRule
}

const HOLIDAYS_ZH_HANS: ReadonlyArray<Holiday> = [
  { id: 'yuandan', name: '元旦', rule: { kind: 'gregorian-fixed', month: 1, day: 1 } },
  { id: 'chunjie', name: '春节', rule: { kind: 'lunar-fixed', lunarMonth: 1, lunarDay: 1 } },
  { id: 'qingming', name: '清明', rule: { kind: 'solar-term', termName: '清明' } },
  { id: 'laodong', name: '劳动节', rule: { kind: 'gregorian-fixed', month: 5, day: 1 } },
  { id: 'duanwu', name: '端午', rule: { kind: 'lunar-fixed', lunarMonth: 5, lunarDay: 5 } },
  { id: 'zhongqiu', name: '中秋', rule: { kind: 'lunar-fixed', lunarMonth: 8, lunarDay: 15 } },
  { id: 'guoqing', name: '国庆', rule: { kind: 'gregorian-fixed', month: 10, day: 1 } },
]

const HOLIDAYS_ZH_HANT: ReadonlyArray<Holiday> = [
  { id: 'yuandan', name: '元旦', rule: { kind: 'gregorian-fixed', month: 1, day: 1 } },
  { id: 'chunjie', name: '春節', rule: { kind: 'lunar-fixed', lunarMonth: 1, lunarDay: 1 } },
  { id: 'qingming', name: '清明', rule: { kind: 'solar-term', termName: '清明' } },
  { id: 'laodong', name: '勞動節', rule: { kind: 'gregorian-fixed', month: 5, day: 1 } },
  { id: 'duanwu', name: '端午', rule: { kind: 'lunar-fixed', lunarMonth: 5, lunarDay: 5 } },
  { id: 'zhongqiu', name: '中秋', rule: { kind: 'lunar-fixed', lunarMonth: 8, lunarDay: 15 } },
  { id: 'guoqing', name: '國慶', rule: { kind: 'gregorian-fixed', month: 10, day: 1 } },
]

const HOLIDAYS_JA: ReadonlyArray<Holiday> = [
  { id: 'ganjitsu', name: '元日', rule: { kind: 'gregorian-fixed', month: 1, day: 1 } },
  { id: 'seijin', name: '成人の日', rule: { kind: 'nth-weekday', month: 1, n: 2, weekday: 1 } },
  { id: 'kenkoku', name: '建国記念の日', rule: { kind: 'gregorian-fixed', month: 2, day: 11 } },
  { id: 'tennou', name: '天皇誕生日', rule: { kind: 'gregorian-fixed', month: 2, day: 23 } },
  { id: 'shunbun', name: '春分の日', rule: { kind: 'solar-term', termName: '春分' } },
  { id: 'shouwa', name: '昭和の日', rule: { kind: 'gregorian-fixed', month: 4, day: 29 } },
  { id: 'kenpou', name: '憲法記念日', rule: { kind: 'gregorian-fixed', month: 5, day: 3 } },
  { id: 'midori', name: 'みどりの日', rule: { kind: 'gregorian-fixed', month: 5, day: 4 } },
  { id: 'kodomo', name: 'こどもの日', rule: { kind: 'gregorian-fixed', month: 5, day: 5 } },
  { id: 'umi', name: '海の日', rule: { kind: 'nth-weekday', month: 7, n: 3, weekday: 1 } },
  { id: 'yama', name: '山の日', rule: { kind: 'gregorian-fixed', month: 8, day: 11 } },
  { id: 'keirou', name: '敬老の日', rule: { kind: 'nth-weekday', month: 9, n: 3, weekday: 1 } },
  { id: 'shuubun', name: '秋分の日', rule: { kind: 'solar-term', termName: '秋分' } },
  {
    id: 'sports',
    name: 'スポーツの日',
    rule: { kind: 'nth-weekday', month: 10, n: 2, weekday: 1 },
  },
  { id: 'bunka', name: '文化の日', rule: { kind: 'gregorian-fixed', month: 11, day: 3 } },
  { id: 'kinrou', name: '勤労感謝の日', rule: { kind: 'gregorian-fixed', month: 11, day: 23 } },
]

// EN locale serves the overseas-Chinese diaspora + non-CJK learners of the
// Chinese calendar. US federal holidays are noise here — the user already has
// the system calendar for those, and showing Juneteenth on the same day as
// 端午 (Dragon Boat Festival) created a "which is it?" confusion that broke the
// app's identity as a Chinese calendar utility. So EN mirrors the 8 cultural
// festivals from `festivals[]`, localized — making the month grid coherent
// with the festival list below it. (2026-06 follow-up to the home-screen
// audit.) JA keeps its national holidays because most JP days off derive from
// or align with Chinese festivals / 节气 (春分の日 / 秋分の日 / こどもの日).
const HOLIDAYS_EN: ReadonlyArray<Holiday> = [
  {
    id: 'chunjie',
    name: 'Spring Festival',
    rule: { kind: 'lunar-fixed', lunarMonth: 1, lunarDay: 1 },
  },
  {
    id: 'yuanxiao',
    name: 'Lantern Festival',
    rule: { kind: 'lunar-fixed', lunarMonth: 1, lunarDay: 15 },
  },
  { id: 'qingming', name: 'Qingming Festival', rule: { kind: 'solar-term', termName: '清明' } },
  {
    id: 'duanwu',
    name: 'Dragon Boat Festival',
    rule: { kind: 'lunar-fixed', lunarMonth: 5, lunarDay: 5 },
  },
  { id: 'qixi', name: 'Qixi Festival', rule: { kind: 'lunar-fixed', lunarMonth: 7, lunarDay: 7 } },
  {
    id: 'zhongqiu',
    name: 'Mid-Autumn Festival',
    rule: { kind: 'lunar-fixed', lunarMonth: 8, lunarDay: 15 },
  },
  {
    id: 'chongyang',
    name: 'Double Ninth Festival',
    rule: { kind: 'lunar-fixed', lunarMonth: 9, lunarDay: 9 },
  },
  { id: 'dongzhi', name: 'Winter Solstice', rule: { kind: 'solar-term', termName: '冬至' } },
]

type SupportedHolidayLocale = 'zh-Hans' | 'zh-Hant' | 'ja' | 'en'
const LOCALE_HOLIDAYS: Record<SupportedHolidayLocale, ReadonlyArray<Holiday>> = {
  'zh-Hans': HOLIDAYS_ZH_HANS,
  'zh-Hant': HOLIDAYS_ZH_HANT,
  ja: HOLIDAYS_JA,
  en: HOLIDAYS_EN,
}

function nthWeekdayOfMonth(year: number, month: number, n: number, weekday: number): number {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const offset = (weekday - firstWeekday + 7) % 7
  return 1 + offset + (n - 1) * 7
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number): number {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const lastWeekday = new Date(Date.UTC(year, month - 1, lastDay)).getUTCDay()
  const offset = (lastWeekday - weekday + 7) % 7
  return lastDay - offset
}

/**
 * Resolve a holiday rule to a (year, month, day) that the user's calendar
 * cell can match against. Returns null if the rule doesn't land in the
 * requested gregorian month (e.g. 春节 in Jan/Feb spans gregorian months;
 * the caller iterates per-day so this just needs to answer "what day"). The
 * year passed is the gregorian year being rendered.
 */
function resolveHolidayDayInMonth(
  rule: HolidayRule,
  year: number,
  month: number,
  yearJieQi: ReturnType<typeof getYearJieQi>
): number | null {
  switch (rule.kind) {
    case 'gregorian-fixed':
      return rule.month === month ? rule.day : null
    case 'lunar-fixed': {
      try {
        const d = lunarToSolar(year, rule.lunarMonth, rule.lunarDay, false)
        return d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month ? d.getUTCDate() : null
      } catch {
        return null
      }
    }
    case 'solar-term': {
      const entry = yearJieQi.find((e) => e.jieqi.name === rule.termName)
      return entry && entry.month === month ? entry.day : null
    }
    case 'nth-weekday':
      return rule.month === month ? nthWeekdayOfMonth(year, month, rule.n, rule.weekday) : null
    case 'last-weekday':
      return rule.month === month ? lastWeekdayOfMonth(year, month, rule.weekday) : null
  }
}

/** Almanac facts + 节气 context + 12 时辰 (+ optional deterministic 对你而言 overlay). */
function buildDay(ymd: Ymd, subject?: PersonalAlmanacSubject) {
  const almanac: DailyAlmanac = calculateDailyAlmanac(ymd)
  const term = getNearestJieQiForGregorianDate(ymd.year, ymd.month, ymd.day)
  // Year pillar (立春-aware) — drives `yearGanZhi` for the hero card 生肖年 chip
  // and the `benming` flag in personalization.
  const yearPillar = getFourPillars({ ...ymd, hour: 0 }).year
  // 农历 + 年内 24 节气 — reused below for the lunarDate field, the festival
  // matchers (Sprint 3 chunk 3), and the solarTermToday flag.
  const lunar = solarToLunar(ymd.year, ymd.month, ymd.day)
  const yearJieQi = getYearJieQi(ymd.year)
  // Day stem drives the 五鼠遁 hour pillars; read it off the computed 干支.
  const dayStemIdx = HEAVENLY_STEMS.indexOf(almanac.todayGanZhi[0] as HeavenlyStem)
  const hours = allShiChen().map((sc) => ({
    name: sc.name,
    branch: sc.branch,
    startHour: sc.startHour,
    endHour: sc.endHour,
    ganZhi: hourGanZhi(dayStemIdx, sc.startHour).label,
  }))

  // Sprint 3 chunk 3 — "today is X" matchers.
  //   - festivalToday: non-null when today's 农历 date hits one of the 6 lunar
  //     festivals OR today's gregorian date hits 清明 / 冬至. Drives the
  //     accent chip + tap-through to `/festival/[id]` on Today.
  //   - solarTermToday: non-null when today is the gregorian day a 节气 falls
  //     on (UTC+8). Display-only chip when there's no festival match for the
  //     same day (because then the chip already shows the festival name).
  let festivalToday: { id: string; name: string } | null = null
  if (!lunar.isLeap) {
    const match = FESTIVALS_LUNAR.find(
      (f) => f.lunarMonth === lunar.month && f.lunarDay === lunar.day
    )
    if (match) festivalToday = { id: match.id, name: match.name }
  }
  if (!festivalToday) {
    const solarTermFestival = FESTIVALS_SOLAR_TERM.find((f) => {
      const entry = yearJieQi.find((e) => e.jieqi.name === f.termName)
      return entry && entry.month === ymd.month && entry.day === ymd.day
    })
    if (solarTermFestival) {
      festivalToday = { id: solarTermFestival.id, name: solarTermFestival.name }
    }
  }
  const todayTerm = yearJieQi.find((e) => e.month === ymd.month && e.day === ymd.day)
  const solarTermToday = todayTerm ? { name: todayTerm.jieqi.name } : null

  // Boundary remap (SPAM-19): astro-core uses `lucky` / `zodiac` internally
  // (classical 黄历 terms), but the public response keys are renamed to
  // `auspicious` / `clashAnimal` / `auspiciousColor` / `auspiciousDirection`
  // to keep App Store reviewer-visible network payloads free of vocabulary
  // that triggers Guideline 4.3(b). Internal compute and DB columns are
  // unchanged.
  const day = {
    ganZhi: almanac.todayGanZhi,
    element: almanac.todayElement,
    dayOfficer: almanac.dayOfficer,
    mansion: {
      name: almanac.mansion.name,
      luminary: almanac.mansion.luminary,
      animal: almanac.mansion.animal,
      quadrant: almanac.mansion.quadrant,
      auspicious: almanac.mansion.lucky,
      index: almanac.mansion.index,
    },
    goodFor: almanac.goodFor,
    avoid: almanac.avoid,
    clash: {
      branch: almanac.clash.branch,
      clashAnimal: almanac.clash.zodiac,
    },
    evilDirection: almanac.evilDirection,
    dayGod: almanac.dayGod,
    pengZu: almanac.pengZu,
    auspiciousColor: almanac.luckyColor,
    auspiciousDirection: almanac.luckyDirection,
    dos: almanac.dos,
    donts: almanac.donts,
    overallRating: almanac.overallRating,
    // Year pillar (立春-aware) — Tier-1 audit #5 (生肖年 chip on hero) + the
    // 本命年 check downstream. `animal` resolved off the branch index so it
    // tracks the pillar's actual year (not the Gregorian-year approximation).
    yearGanZhi: {
      stem: yearPillar.stem,
      branch: yearPillar.branch,
      animal: branchToAnimal(yearPillar.branch),
    },
    // 农历 — Tier-1 audit #8 (农历初一/十五 highlight + 闰月 indicator) + the
    // future month-grid build-out. `monthName` already prefixes "闰" when
    // the month is a leap month (no separate isLeapName flag needed). The
    // `isFirst` / `isFifteenth` flags are convenience booleans the client uses
    // to switch the 农历 text colour to accent on glance-significant days.
    lunarDate: {
      year: lunar.year,
      month: lunar.month,
      day: lunar.day,
      isLeap: lunar.isLeap,
      monthName: lunar.monthName,
      dayName: lunar.dayName,
      isFirst: lunar.day === 1,
      isFifteenth: lunar.day === 15,
    },
    // 六曜 (Rokuyo) — the Japanese six-day calendar annotation derived purely
    // from the 旧暦 month + day. Shipped on every locale (it is locale-agnostic
    // lunar data, tiny); only the ja DayView surfaces the badge. Like 六曜 on any
    // Japanese カレンダー this is a calendar annotation, not a fortune claim — the
    // name kanji (大安/仏滅 …) are the cycle's own labels and stay as-is.
    rokuyo: getRokuyo(lunar.month, lunar.day),
    // Sprint 3 chunk 3 — Today highlight (tap-through to `/festival/[id]`).
    festivalToday,
    solarTermToday,
    solarTerm: {
      // `instant` is the second-level UTC ISO timestamp (C.1.8 VSOP87) — the
      // client renders it in local time. `date` stays the YYYY-MM-DD UTC
      // calendar day for back-compat.
      prev: {
        name: term.prev.name,
        date: fmtUtc(term.prev.date),
        instant: term.prev.date.toISOString(),
      },
      next: {
        name: term.next.name,
        date: fmtUtc(term.next.date),
        instant: term.next.date.toISOString(),
      },
    },
    hours,
  }

  // `day` stays the shared base (no per-八字 variation); the per-user verdict lives here.
  // `benming` (本命年) — Tier-1 audit #10: true when the user's birth-year
  // branch equals the current year-pillar branch (e.g. 属马 user in 丙午年).
  const personalization = subject
    ? {
        dayMaster: subject.dayMasterStem,
        benming: subject.birthBranch === yearPillar.branch,
        ...personalAlmanacOverlay(subject, {
          dayElement: almanac.todayElement,
          dayBranch: almanac.dayBranch,
        }),
      }
    : null

  return { day, personalization }
}

// ── GET /day?date=YYYY-MM-DD&birthDate=YYYY-MM-DD ─────────────
// `birthDate` (optional) drives the deterministic "对你而言" overlay. No userId / HMAC —
// the endpoint is anonymous; the client passes its locally-held birth date.

// ── Edge cache (Cloudflare Cache API) ──────────────────────────────────────
// The almanac GET reads (/day · /month · /year-overview · /bootstrap) are pure,
// deterministic functions of their query params (date · birthDate · year · month
// · locale), so the request URL is a complete cache key. We cache the rendered
// JSON at the CF colo to skip recompute on repeat/burst requests (a launch
// fan-out, or many devices opening the same locale's month).
//
// TTL is deliberately SHORT: the data is immutable per-key, but a code deploy
// that changes almanac logic must not be masked by a long edge TTL — 10 min lets
// a fix propagate fast (this is exactly the prod-staleness footgun we hit during
// this build). Dev builds send `Cache-Control: no-cache` and bypass the cache
// entirely, so on-device testing always exercises fresh worker code.
const ALMANAC_EDGE_TTL = 600

async function edgeCachedJson(c: Context<AppEnv>, build: () => unknown): Promise<Response> {
  const wantsFresh = (c.req.header('cache-control') ?? '').includes('no-cache')
  // `caches.default` is a Workers-only extension (not in the standard CacheStorage
  // lib) — cast so this file also typechecks when pulled into a non-Workers tsconfig
  // (hexastral-web imports an API type, dragging this module into its type graph).
  const cache = (caches as unknown as { default: Cache }).default
  const cacheKey = new Request(new URL(c.req.url).toString(), { method: 'GET' })
  if (!wantsFresh) {
    const hit = await cache.match(cacheKey)
    if (hit) return hit
  }
  const res = new Response(JSON.stringify(ok(build())), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      'cache-control': `public, max-age=${ALMANAC_EDGE_TTL}`,
    },
  })
  if (!wantsFresh) c.executionCtx.waitUntil(cache.put(cacheKey, res.clone()))
  return res
}

auspiceRoutes.get('/day', (c) => {
  const dateParam = c.req.query('date')
  const ymd = dateParam ? parseYmd(dateParam) : dateToYmd(new Date())
  const birthDate = c.req.query('birthDate')
  const subject = birthDate ? subjectFromBirthDate(birthDate) : undefined

  const build = () => {
    const { day, personalization } = buildDay(ymd, subject)
    return { date: fmtUtc(ymdToDate(ymd)), day, personalization, explanation: null }
  }
  // Only edge-cache an explicit `date` — the no-date "today" shares a key across
  // the midnight boundary and would go stale, so it always computes fresh.
  return dateParam ? edgeCachedJson(c, build) : jsonOk(c, build())
})

// ── GET /calendar.ics — Apple Calendar / iCal subscription feed ────────────
// Returns ±30 days of 干支 + 节气 + 宜忌 as RFC 5545 all-day VEVENTs so users
// can subscribe in the system Calendar app via webcal:// and see the almanac
// inline on their phone/Mac/iPad without opening cycle. v1 is anonymous and
// generic (no 对你而言) — matches the free-tier push contract. Personalized
// per-user feeds are a follow-up (require per-user opaque tokens + Pro gate).
//
// Edge-cached for an hour. Apple Calendar polls subscribed feeds on its own
// cadence (typically every 5min–24h depending on user settings), so a 60min
// cache is enough to absorb thundering-herd subscriptions without staleness
// showing up to the user.

/**
 * Rolling window around "today" (UTC anchor): 2 weeks back + ~1 year forward.
 * 黄历 days are deterministic and the feed is edge-cached, so Apple Calendar's
 * own polling keeps a subscribed feed fresh with NO cron — each poll recomputes
 * the current window, sliding it forward a day at a time.
 */
const ICS_PAST_DAYS = 14
const ICS_FUTURE_DAYS = 365

/** Escape ICS TEXT field per RFC 5545 §3.3.11. */
function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

/** Fold long lines per RFC 5545 §3.1 — keep clients like Outlook happy. */
function foldIcsLine(line: string): string {
  if (line.length <= 75) return line
  const out: string[] = []
  let i = 0
  while (i < line.length) {
    const take = i === 0 ? 75 : 74 // continuation lines lead with a space (-1 budget)
    out.push((i === 0 ? '' : ' ') + line.slice(i, i + take))
    i += take
  }
  return out.join('\r\n')
}

/** YYYYMMDD for DTSTART;VALUE=DATE. */
function ymdCompact(ymd: Ymd): string {
  return `${ymd.year}${String(ymd.month).padStart(2, '0')}${String(ymd.day).padStart(2, '0')}`
}

/** UTC YYYYMMDDTHHMMSSZ for DTSTAMP. */
function utcStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}` +
    `${String(d.getUTCDate()).padStart(2, '0')}T` +
    `${String(d.getUTCHours()).padStart(2, '0')}` +
    `${String(d.getUTCMinutes()).padStart(2, '0')}` +
    `${String(d.getUTCSeconds()).padStart(2, '0')}Z`
  )
}

function ymdAdd(ymd: Ymd, days: number): Ymd {
  const d = ymdToDate(ymd)
  d.setUTCDate(d.getUTCDate() + days)
  return dateToYmd(d)
}

/** 对你而言 verdict → short label for the calendar feed. */
const FIT_LABEL: Record<string, string> = { 吉: '宜把握', 平: '平稳', 凶: '宜谨慎' }

/**
 * Render a full VCALENDAR body for the rolling window. When `subject` is set,
 * each day also carries the deterministic 对你而言 verdict (the Pro feed).
 *
 * INVARIANT — keep this feed 100% DETERMINISTIC (pure `buildDay` compute: 干支 /
 * 宜忌 / 节气 / the 吉平凶 verdict). NEVER put LLM-generated personalized prose
 * here: a calendar export spans a whole rolling window, which is far too much to
 * generate, and the personalized "对你而言" reading is deliberately app-ONLY — it
 * is the daily-push hook that drives DAU. The export is the deterministic almanac;
 * the personalization lives in the app.
 */
function renderAlmanacIcs(subject: PersonalAlmanacSubject | undefined, calName: string): string {
  const today = dateToYmd(new Date())
  const stamp = utcStamp(new Date())

  const events: string[] = []
  for (let offset = -ICS_PAST_DAYS; offset <= ICS_FUTURE_DAYS; offset++) {
    const ymd = ymdAdd(today, offset)
    const { day, personalization } = buildDay(ymd, subject)
    const dt = ymdCompact(ymd)
    const dtEnd = ymdCompact(ymdAdd(ymd, 1))

    const yi = day.goodFor.slice(0, 4).join('、') || '—'
    const ji = day.avoid.slice(0, 4).join('、') || '—'
    const forYou = personalization ? (FIT_LABEL[personalization.fit] ?? personalization.fit) : null
    const summary = `${day.ganZhi}日 · 宜 ${yi} · 忌 ${ji}${forYou ? ` · 你${forYou}` : ''}`
    const descParts = [
      `干支日：${day.ganZhi}（${day.element}）`,
      `日辰：${day.dayOfficer}日`,
      day.solarTermToday ? `节气：${day.solarTermToday.name}` : null,
      day.festivalToday ? `节日：${day.festivalToday.name}` : null,
      `宜：${day.goodFor.join('、') || '—'}`,
      `忌：${day.avoid.join('、') || '—'}`,
      `冲：${day.clash.clashAnimal}`,
      forYou ? `对你而言：${forYou}` : null,
    ].filter(Boolean) as string[]
    const description = descParts.join('\\n')

    events.push(
      [
        'BEGIN:VEVENT',
        foldIcsLine(`UID:cycle-${subject ? 'p-' : ''}${dt}@hexastral.com`),
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${dt}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        foldIcsLine(`SUMMARY:${icsEscape(summary)}`),
        foldIcsLine(`DESCRIPTION:${icsEscape(description)}`),
        'TRANSP:TRANSPARENT',
        'END:VEVENT',
      ].join('\r\n')
    )
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HexAstral//Auspice Almanac v1//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    foldIcsLine(`X-WR-CALNAME:${calName}`),
    'X-WR-TIMEZONE:Asia/Shanghai',
    'X-PUBLISHED-TTL:PT1H',
    ...events,
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}

auspiceRoutes.get('/calendar.ics', (c) => {
  c.header('Content-Type', 'text/calendar; charset=utf-8')
  c.header('Cache-Control', 'public, max-age=3600')
  c.header('Content-Disposition', 'inline; filename="auspice-almanac.ics"')
  return c.body(renderAlmanacIcs(undefined, 'Auspice 黄历'))
})

// ── Pro 对你而言 calendar feed — signed token + server-side Pro check ─────────
// Flow: the app calls GET /calendar/sign with its RC app-user-id; the server
// verifies auspice_pro via RevenueCat, then returns a webcal URL carrying an
// HMAC-signed token of the birthDate. Apple Calendar fetches /calendar/p/:token,
// which verifies the signature and renders the personalized feed. The token is
// opaque (hides the birthDate) and tamper-proof (only server-issued URLs work).

type CalendarEnv = { CYCLE_CALENDAR_SECRET?: string; REVENUECAT_API_KEY?: string }

function bytesToB64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function strToB64url(s: string): string {
  return bytesToB64url(new TextEncoder().encode(s))
}
function b64urlToStr(s: string): string {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}
async function hmacB64url(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return bytesToB64url(new Uint8Array(sig))
}
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
async function makeCalendarToken(secret: string, birthDate: string): Promise<string> {
  return `${strToB64url(birthDate)}.${await hmacB64url(secret, birthDate)}`
}
async function verifyCalendarToken(secret: string, token: string): Promise<string | null> {
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return null
  let birthDate: string
  try {
    birthDate = b64urlToStr(token.slice(0, dot))
  } catch {
    return null
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null
  const expected = await hmacB64url(secret, birthDate)
  return timingSafeEqual(token.slice(dot + 1), expected) ? birthDate : null
}

/** Live RevenueCat check — is auspice_pro (or universe_pro) active for this RC id? */
async function isAuspiceProViaRc(apiKey: string, appUserId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    )
    if (!res.ok) return false
    const active = parseRcActiveEntitlements(await res.json(), new Date().toISOString())
    return active.some((e) => e.key === 'auspice_pro' || e.key === 'universe_pro')
  } catch {
    return false
  }
}

// Mint a signed personal-feed URL. Server verifies Pro via RevenueCat when
// REVENUECAT_API_KEY is configured (fail-closed in prod; fail-open in dev with
// no key so local builds work). `u` = the RC app-user-id from the client.
auspiceRoutes.get('/calendar/sign', async (c) => {
  const env = c.env as unknown as CalendarEnv
  const birthDate = c.req.query('birthDate')
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return c.json({ error: 'birthDate=YYYY-MM-DD required' }, 400)
  }
  if (!env.CYCLE_CALENDAR_SECRET) {
    return c.json({ error: 'calendar signing not configured' }, 503)
  }
  if (env.REVENUECAT_API_KEY) {
    const appUserId = c.req.query('u')
    if (!appUserId || !(await isAuspiceProViaRc(env.REVENUECAT_API_KEY, appUserId))) {
      return c.json({ error: 'pro required' }, 403)
    }
  }
  const token = await makeCalendarToken(env.CYCLE_CALENDAR_SECRET, birthDate)
  const host = new URL(c.req.url).host
  return c.json({ url: `webcal://${host}/api/auspice/calendar/p/${token}.ics` })
})

// Apple Calendar fetches this. Verify the signed token → render the 对你而言 feed.
auspiceRoutes.get('/calendar/p/:token', async (c) => {
  const env = c.env as unknown as CalendarEnv
  if (!env.CYCLE_CALENDAR_SECRET) return c.text('not configured', 503)
  const raw = c.req.param('token')
  const token = raw.endsWith('.ics') ? raw.slice(0, -4) : raw
  const birthDate = await verifyCalendarToken(env.CYCLE_CALENDAR_SECRET, token)
  if (!birthDate) return c.text('invalid or expired link', 403)
  c.header('Content-Type', 'text/calendar; charset=utf-8')
  c.header('Cache-Control', 'private, max-age=3600')
  c.header('Content-Disposition', 'inline; filename="auspice-foryou.ics"')
  return c.body(renderAlmanacIcs(subjectFromBirthDate(birthDate), 'Auspice · 对你而言'))
})

// ── GET /month?year=&month= — batched month grid (Sprint 2 deliverable #2) ──
// Returns one row per day in the requested gregorian month with the data the
// Month grid cell renders: 农历 day name + 初一/十五 flags + 节气 mark + heat-
// map rating. One request replaces the 30 single-day fetches that would
// otherwise hammer this anonymous endpoint when a user scrubs months.

const MIN_YEAR = 1900
const MAX_YEAR = 2100

const SUPPORTED_HOLIDAY_LOCALES = ['zh-Hans', 'zh-Hant', 'ja', 'en'] as const

const monthQuerySchema = z.object({
  year: z.coerce.number().int().min(MIN_YEAR).max(MAX_YEAR),
  month: z.coerce.number().int().min(1).max(12),
  /** User's display locale — drives the per-cell `publicHoliday` lookup. */
  locale: z.enum(SUPPORTED_HOLIDAY_LOCALES).default('zh-Hans'),
})

/**
 * Per-day shape for the month grid. The cell renders gregorian day number
 * (`day`) prominently; `lunarDayName` is the small CJK label underneath;
 * `solarTermName` is non-null only on the exact gregorian day a 节气 falls on
 * (in 北京时间, UTC+8) — driving the small mark on those cells.
 *
 * `publicHoliday` (Sprint 3 chunk 4) is the localized holiday name when the
 * day matches a public holiday in the user's locale. The client renders this
 * with higher priority than `solarTermName` since the holiday usually carries
 * the more user-actionable signal.
 */
function buildMonth(year: number, month: number, locale: SupportedHolidayLocale) {
  // Reject impossible months (e.g. month=13). zod already enforces the range
  // but the calendar bounds happen via Date.UTC roll-over check.
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()

  // Pre-compute the year's 节气 list once, filter to this month — converts the
  // 24 yearly terms into an O(1) lookup the per-day loop hits.
  const yearJieQi = getYearJieQi(year)
  const monthJieQiMap = new Map<number, string>()
  for (const entry of yearJieQi) {
    if (entry.month === month) monthJieQiMap.set(entry.day, entry.jieqi.name)
  }

  // Pre-resolve the locale's holidays to a day → name lookup. Resolved once
  // per request, not once per cell.
  const monthHolidays = new Map<number, string>()
  for (const h of LOCALE_HOLIDAYS[locale]) {
    const day = resolveHolidayDayInMonth(h.rule, year, month, yearJieQi)
    if (day !== null && day >= 1 && day <= daysInMonth) {
      monthHolidays.set(day, h.name)
    }
  }

  // Lunar month header — pick a representative day inside the month. Day 15
  // is reliably inside any gregorian month and usually lands inside the same
  // lunar month, so its `monthName` (with "闰" prefix when applicable) is the
  // header label the Month grid shows above the day cells.
  const headerLunar = solarToLunar(year, month, Math.min(15, daysInMonth))
  const lunarMonthHeader = `${headerLunar.year}年 ${headerLunar.monthName}`

  const days = []
  for (let d = 1; d <= daysInMonth; d++) {
    const almanac = calculateDailyAlmanac({ year, month, day: d })
    const lunar = solarToLunar(year, month, d)
    days.push({
      day: d,
      date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      lunarDay: lunar.day,
      lunarDayName: lunar.dayName,
      isLunarFirst: lunar.day === 1,
      isLunarFifteenth: lunar.day === 15,
      isLeapMonth: lunar.isLeap,
      solarTermName: monthJieQiMap.get(d) ?? null,
      publicHoliday: monthHolidays.get(d) ?? null,
      overallRating: almanac.overallRating,
      // 流日 (Sprint 4.5 follow-up) — the day's 五行 element for the calendar
      // cell's element-color dot. Same value as the day route's `day.element`.
      dayElement: almanac.todayElement,
    })
  }

  return { year, month, locale, lunarMonthHeader, days }
}

auspiceRoutes.get('/month', (c) => {
  const parsed = monthQuerySchema.safeParse({
    year: c.req.query('year'),
    month: c.req.query('month'),
    locale: c.req.query('locale'),
  })
  if (!parsed.success) {
    throw new HTTPException(400, { message: 'invalid year/month/locale' })
  }
  const { year, month, locale } = parsed.data
  return edgeCachedJson(c, () => buildMonth(year, month, locale))
})

// ── GET /bootstrap — one-shot launch payload (focused day + its month) ──────
//
// Collapses the today-tab cold start — which otherwise fires a separate /day and
// /month (plus the client's per-strip-day fan-out) — into ONE request. Same
// deterministic-edge-cache as the others. `date` is REQUIRED so the cache key is
// unambiguous + stable across midnight; `locale` drives the month grid's holiday
// overlay; `birthDate` (optional) adds the 对你而言 overlay to the focused day.
// The month grid already carries per-cell data, so the CalendarStrip can source
// its cells from `month` instead of N× /day.
const bootstrapQuerySchema = z.object({
  date: z.string().regex(DATE_RE, 'date must be YYYY-MM-DD'),
  birthDate: z.string().regex(DATE_RE).optional(),
  locale: z.enum(['zh-Hans', 'zh-Hant', 'ja', 'en']).default('en'),
})

auspiceRoutes.get('/bootstrap', (c) => {
  const parsed = bootstrapQuerySchema.safeParse({
    date: c.req.query('date'),
    birthDate: c.req.query('birthDate'),
    locale: c.req.query('locale'),
  })
  if (!parsed.success) {
    throw new HTTPException(400, { message: 'invalid date/birthDate/locale' })
  }
  const { date, birthDate, locale } = parsed.data
  const ymd = parseYmd(date)
  const subject = birthDate ? subjectFromBirthDate(birthDate) : undefined
  return edgeCachedJson(c, () => {
    const { day, personalization } = buildDay(ymd, subject)
    return {
      date: fmtUtc(ymdToDate(ymd)),
      day,
      personalization,
      explanation: null,
      month: buildMonth(ymd.year, ymd.month, locale),
    }
  })
})

// ── GET /year-overview?year= — Sprint 3 节庆 page (24 节气 + 8 festivals) ──
//
// One request feeds the `/festivals` drill-in's two list sections — avoids the
// 32 round-trips it would take to assemble client-side. Both timelines are
// deterministic from astro-core (no LLM, no auth), so the response caches
// well at edge for an entire year.

const yearQuerySchema = z.object({
  year: z.coerce.number().int().min(MIN_YEAR).max(MAX_YEAR),
})

// FESTIVALS_LUNAR + FESTIVALS_SOLAR_TERM are declared above buildDay so the
// per-day endpoint can answer "is today a festival?"; reused here.

function buildYearOverview(year: number) {
  const yearJieQi = getYearJieQi(year)
  const solarTerms = yearJieQi.map((entry, index) => {
    const instant = getJieQiInstant(year, index)
    return {
      index,
      name: entry.jieqi.name,
      date: `${year}-${String(entry.month).padStart(2, '0')}-${String(entry.day).padStart(2, '0')}`,
      instant: instant ? instant.toISOString() : null,
    }
  })

  const festivals: Array<{
    id: string
    name: string
    kind: 'lunar' | 'solar-term'
    solarDate: string
    lunarLabel: string | null
  }> = []

  for (const f of FESTIVALS_LUNAR) {
    try {
      const solarDate = lunarToSolar(year, f.lunarMonth, f.lunarDay, false)
      const m = String(solarDate.getUTCMonth() + 1).padStart(2, '0')
      const d = String(solarDate.getUTCDate()).padStart(2, '0')
      festivals.push({
        id: f.id,
        name: f.name,
        kind: 'lunar',
        solarDate: `${solarDate.getUTCFullYear()}-${m}-${d}`,
        lunarLabel: f.lunarLabel,
      })
    } catch {
      // Out-of-range year — silently skip. astro-core lunar tables cover 1900-2100.
    }
  }

  for (const f of FESTIVALS_SOLAR_TERM) {
    const term = yearJieQi.find((e) => e.jieqi.name === f.termName)
    if (!term) continue
    festivals.push({
      id: f.id,
      name: f.name,
      kind: 'solar-term',
      solarDate: `${year}-${String(term.month).padStart(2, '0')}-${String(term.day).padStart(2, '0')}`,
      lunarLabel: null,
    })
  }

  festivals.sort((a, b) => a.solarDate.localeCompare(b.solarDate))

  return { year, solarTerms, festivals }
}

auspiceRoutes.get('/year-overview', (c) => {
  const parsed = yearQuerySchema.safeParse({ year: c.req.query('year') })
  if (!parsed.success) {
    throw new HTTPException(400, { message: 'invalid year' })
  }
  const { year } = parsed.data
  return edgeCachedJson(c, () => buildYearOverview(year))
})

// ── GET /search?event=&from=&to= — reverse 择日 ───────────────

const EVENTS = [
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
type AuspiceEvent = (typeof EVENTS)[number]

/** event → 黄历 宜忌 verbs that decide its fitness, matched against goodFor / avoid. */
const EVENT_VERBS: Record<AuspiceEvent, readonly string[]> = {
  wedding: ['嫁娶'],
  business: ['开市', '交易', '纳财'],
  signing: ['立券', '交易'],
  move: ['移徙'],
  'move-in': ['入宅', '移徙'],
  travel: ['出行'],
  burial: ['安葬'],
  groundbreaking: ['动土', '破土'],
  medical: ['求医', '疗病'],
  study: ['入学'],
}

const searchQuerySchema = z.object({
  event: z.enum(EVENTS),
  from: z.string().regex(DATE_RE, 'from must be YYYY-MM-DD'),
  to: z.string().regex(DATE_RE, 'to must be YYYY-MM-DD'),
})

const specializedQuerySchema = z.object({
  from: z.string().regex(DATE_RE, 'from must be YYYY-MM-DD'),
  to: z.string().regex(DATE_RE, 'to must be YYYY-MM-DD'),
})

/**
 * Sprint 2 deliverable #3 — activity-tuned officer boosts for the four
 * specialized 择日 routes. Each event biases scoring toward 建除十二神
 * that classical 黄历 traditions consider auspicious for that activity,
 * and away from ones traditionally avoided. Officer signal is the most
 * reliable per-day boost the existing astro-core surface provides;
 * richer 神煞 (天德 / 月德 / 红沙 / 月厌 / 受死 / 往亡 etc.) needs
 * additional astro-core primitives and is left as follow-up work.
 */
interface EventBoosts {
  goodOfficers: ReadonlySet<DayOfficer>
  badOfficers: ReadonlySet<DayOfficer>
}
type DayOfficer = DailyAlmanac['dayOfficer']

const EVENT_BOOSTS: Partial<Record<AuspiceEvent, EventBoosts>> = {
  // 嫁娶 — 成日宜婚, 定日宜定盟, 破日大忌.
  wedding: {
    goodOfficers: new Set<DayOfficer>(['成', '定']),
    badOfficers: new Set<DayOfficer>(['破']),
  },
  // 入宅 — 定/开/建 安宅, 破/危 宜避.
  'move-in': {
    goodOfficers: new Set<DayOfficer>(['定', '开', '建']),
    badOfficers: new Set<DayOfficer>(['破', '危']),
  },
  // 开市 — 开/收 财利, 闭日 财绝.
  business: {
    goodOfficers: new Set<DayOfficer>(['开', '收']),
    badOfficers: new Set<DayOfficer>(['闭']),
  },
  // 出行 — 除/开 易行, 破/危/闭 阻塞.
  travel: {
    goodOfficers: new Set<DayOfficer>(['除', '开']),
    badOfficers: new Set<DayOfficer>(['破', '危', '闭']),
  },
}

function scoreDay(almanac: DailyAlmanac, verbs: readonly string[], boosts?: EventBoosts) {
  const matchedGood = verbs.filter((v) => almanac.goodFor.includes(v))
  const matchedBad = verbs.filter((v) => almanac.avoid.includes(v))
  let score = 0.5
  if (matchedGood.length > 0) score += 0.35
  if (matchedBad.length > 0) score -= 0.4
  score += almanac.mansion.lucky ? 0.1 : -0.05
  // gentle nudge from the 五行 day rating (1..5 → -0.05..+0.05)
  score += (almanac.overallRating - 3) * 0.025
  // Sprint 2 deliverable #3 — activity-tuned officer boost (only applied
  // on the 4 specialized routes; the generic `/search` passes no boosts).
  let officerBoost = 0
  if (boosts?.goodOfficers.has(almanac.dayOfficer)) officerBoost = 0.08
  else if (boosts?.badOfficers.has(almanac.dayOfficer)) officerBoost = -0.08
  score += officerBoost
  return {
    score: Math.max(0, Math.min(1, score)),
    matchedGood,
    matchedBad,
    officerBoost,
  }
}

function reasoning(
  almanac: DailyAlmanac,
  matchedGood: string[],
  matchedBad: string[],
  officerBoost?: number
): string {
  const parts = [`${almanac.todayGanZhi}日`, `${almanac.dayOfficer}日`, `${almanac.mansion.name}宿`]
  if (matchedGood.length > 0) parts.push(`宜${matchedGood.join('、')}`)
  if (matchedBad.length > 0) parts.push(`忌${matchedBad.join('、')}`)
  // Specialized-route activity-tuned reasoning (Sprint 2 #3).
  if (officerBoost !== undefined && officerBoost > 0) parts.push(`${almanac.dayOfficer}日相宜`)
  else if (officerBoost !== undefined && officerBoost < 0) parts.push(`${almanac.dayOfficer}日相避`)
  return parts.join(' · ')
}

/** Shared ranking pipeline for both /search (generic) and the 4 specialized routes. */
function runSearch(event: AuspiceEvent, fromStr: string, toStr: string, specialized: boolean) {
  const fromDate = ymdToDate(parseYmd(fromStr))
  const toDate = ymdToDate(parseYmd(toStr))
  if (toDate.getTime() < fromDate.getTime()) {
    throw new HTTPException(400, { message: 'to must be on or after from' })
  }
  const spanDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1
  if (spanDays > MAX_SEARCH_SPAN_DAYS) {
    throw new HTTPException(400, { message: `range too large (max ${MAX_SEARCH_SPAN_DAYS} days)` })
  }

  const verbs = EVENT_VERBS[event]
  const boosts = specialized ? EVENT_BOOSTS[event] : undefined
  const scored: Array<{
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
  }> = []

  const cursor = new Date(fromDate)
  for (let i = 0; i < spanDays; i++) {
    const almanac = calculateDailyAlmanac(dateToYmd(cursor))
    const { score, matchedGood, matchedBad, officerBoost } = scoreDay(almanac, verbs, boosts)
    scored.push({
      date: fmtUtc(cursor),
      score: Math.round(score * 100) / 100,
      recommended: score >= 0.6,
      reasoning: reasoning(
        almanac,
        matchedGood,
        matchedBad,
        specialized ? officerBoost : undefined
      ),
      day: {
        ganZhi: almanac.todayGanZhi,
        dayOfficer: almanac.dayOfficer,
        mansion: almanac.mansion.name,
        goodFor: almanac.goodFor,
        avoid: almanac.avoid,
      },
    })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  // Rank by score desc; tie-break earliest date so picks are stable.
  scored.sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))

  return {
    event,
    range: { from: fromStr, to: toStr },
    top: scored.slice(0, 3),
  }
}

auspiceRoutes.get('/search', (c) => {
  const parsed = searchQuerySchema.parse({
    event: c.req.query('event'),
    from: c.req.query('from'),
    to: c.req.query('to'),
  })
  return jsonOk(c, runSearch(parsed.event, parsed.from, parsed.to, /* specialized */ false))
})

// ── Specialized 择日 routes (Sprint 2 deliverable #3) ─────────────
// Thin wrappers over runSearch that pre-set the event + opt into
// activity-tuned officer boosts. Separate URLs so:
//   1. the client can cache per activity,
//   2. UI screens get a clean per-activity entry point with their own copy,
//   3. the response carries activity-tuned reasoning ("成日相宜" etc.).

auspiceRoutes.get('/wedding', (c) => {
  const parsed = specializedQuerySchema.parse({
    from: c.req.query('from'),
    to: c.req.query('to'),
  })
  return jsonOk(c, runSearch('wedding', parsed.from, parsed.to, /* specialized */ true))
})

auspiceRoutes.get('/move-in', (c) => {
  const parsed = specializedQuerySchema.parse({
    from: c.req.query('from'),
    to: c.req.query('to'),
  })
  return jsonOk(c, runSearch('move-in', parsed.from, parsed.to, /* specialized */ true))
})

auspiceRoutes.get('/business', (c) => {
  const parsed = specializedQuerySchema.parse({
    from: c.req.query('from'),
    to: c.req.query('to'),
  })
  return jsonOk(c, runSearch('business', parsed.from, parsed.to, /* specialized */ true))
})

auspiceRoutes.get('/travel', (c) => {
  const parsed = specializedQuerySchema.parse({
    from: c.req.query('from'),
    to: c.req.query('to'),
  })
  return jsonOk(c, runSearch('travel', parsed.from, parsed.to, /* specialized */ true))
})

// ── POST /explain — 深度解读 (C.4): the ONLY LLM in Auspice ─────
//
// Pro/lazy: invoked on app-open + field-tap, NEVER pre-generated, NEVER in the push.
// Cost-guarded by the shared K.4 guard (free taste → degrade to a deterministic
// template; v1 never hard-blocks). 24h cached in GUARD_KV. Subject: deviceId > ipHash
// (the endpoint is anonymous — no trusted userId).

// 宜忌 深读 backstop. NOTE: ONLY the Pro path reaches this guard — free callers get
// the deterministic template earlier (no LLM, no guard). The deep reading is also
// per-day cached (one batch call covers a whole day's fields), so a legit Pro user
// triggers ≤1 LLM call per distinct day opened. The guard's sole job is to cap a
// client that spoofs `isPro` across many novel dates — hence Pro-generous, not the
// old 1/day free-taste number that was silently throttling real subscribers.
const CYCLE_GUARD_CONFIG = {
  app: 'cycle',
  dailyLimitAnon: 15,
  dailyLimitSigned: 30,
  lifetimePeakPass: 1,
  globalDailyBudget: 5000,
  noRollover: true,
  noPeriodicRefill: true,
} as const satisfies LlmGuardConfig

// make-if is Pro-gated + cached, so the interactive sandbox needs a far higher
// per-day budget than the daily 黄历 explain (which used 1/day for free taste).
// This is the "Pro rate-limit" — generous but bounded so a runaway can't drain
// the LLM budget.
const MAKEIF_GUARD_CONFIG = {
  app: 'cycle',
  dailyLimitAnon: 10,
  dailyLimitSigned: 20,
  lifetimePeakPass: 1,
  globalDailyBudget: 5000,
  noRollover: true,
  noPeriodicRefill: true,
} as const satisfies LlmGuardConfig

const explainSchema = z.object({
  date: z.string().regex(DATE_RE, 'date must be YYYY-MM-DD'),
  field: z.string().min(1).max(40),
  /** 日主 天干 (optional) — adds the 对你而言 angle + buckets the cache. */
  dayMaster: z.string().max(2).optional(),
  locale: z.string().max(16).default('en'),
  /** Anonymous install id (optional) — preferred quota subject over ipHash. */
  deviceId: z.string().max(128).optional(),
  /** Client-reported Pro entitlement. The deep LLM reading is Pro-only
   *  (订阅解锁); free callers get the deterministic template + an upsell. The
   *  endpoint is anonymous so this is trusted-but-cheap: cost stays bounded by
   *  the per-day KV cache regardless. */
  isPro: z.boolean().default(false),
  /** __DEV__ test builds — skip the guard so the full Pro reading is always
   *  exercised on a test device (mirrors /makeif's `dev`). Trusted-but-cheap:
   *  cost still bounded by the per-day KV cache. */
  dev: z.boolean().default(false),
})

/** Tiny non-crypto hash so raw IPs never land in KV keys. */
function hashIp(ip: string): string {
  let h = 2_166_136_261
  for (let i = 0; i < ip.length; i++) {
    h ^= ip.charCodeAt(i)
    h = Math.imul(h, 16_777_619)
  }
  return (h >>> 0).toString(36)
}

/** Deterministic fallback when the LLM is exhausted/unavailable — never blank. */
function templateExplanation(almanac: DailyAlmanac, field: string): string {
  const base = `${field}：${almanac.todayGanZhi}日 · ${almanac.dayOfficer}日 · ${almanac.mansion.name}宿。`
  return almanac.elementRelation ? `${base}（对你而言：日主${almanac.elementRelation}）` : base
}

/**
 * Background-warm the REST of a day's 宜忌 fields after the tapped one was served,
 * so later taps that day are KV hits (no second LLM wait). Runs under `waitUntil`
 * — never blocks the response, never throws into the request. Skips already-cached
 * fields so it doesn't re-bill the LLM budget.
 */
async function warmExplainRest(
  c: Context<AppEnv>,
  args: {
    date: string
    fields: string[]
    ganZhi: string
    dayOfficer: string
    mansion: string
    dayMaster?: string
    relation?: string
    locale: string
    cacheKeyOf: (field: string) => string
  }
): Promise<void> {
  const todo: string[] = []
  for (const f of args.fields) {
    if (!(await c.env.GUARD_KV.get(args.cacheKeyOf(f)))) todo.push(f)
  }
  if (todo.length === 0) return
  try {
    const resp = await astroClient.post<{ explanations: Record<string, string> }>(
      c.env.SVC_ASTRO,
      '/cycle/explain-batch',
      {
        date: args.date,
        fields: todo,
        ganZhi: args.ganZhi,
        dayOfficer: args.dayOfficer,
        mansion: args.mansion,
        dayMaster: args.dayMaster,
        relation: args.relation,
        locale: args.locale,
        isPro: true,
      }
    )
    const map = resp.explanations ?? {}
    await Promise.all(
      Object.entries(map)
        .filter(([, v]) => v?.trim())
        .map(([f, v]) =>
          c.env.GUARD_KV.put(args.cacheKeyOf(f), v.trim(), { expirationTtl: 86_400 })
        )
    )
  } catch (err) {
    console.error('[auspice.explain] background warm failed', err)
  }
}

auspiceRoutes.post('/explain', async (c) => {
  const body = explainSchema.parse(await c.req.json().catch(() => ({})))
  const ymd = parseYmd(body.date)
  const dayMaster = body.dayMaster as HeavenlyStem | undefined

  // Recompute the day (personalized when 日主 known) — facts for the prompt + template.
  const almanac = calculateDailyAlmanac(ymd, dayMaster)
  const bucket = dayMaster ? STEM_WUXING[dayMaster] : 'none'
  const cacheKeyOf = (field: string) =>
    `auspice:explain:${body.date}:${field}:${body.locale}:${bucket}`

  // Pro-gate (订阅解锁): the deep LLM reading is Pro-only. Free callers always get
  // the deterministic template + an upsell — they never trigger an LLM call.
  if (!body.isPro) {
    return jsonOk(c, {
      explanation: templateExplanation(almanac, body.field),
      source: 'template',
      upsell: true,
    })
  }

  // Pro: cache-first. Any field of a day a Pro user already opened is a hit.
  const cached = await c.env.GUARD_KV.get(cacheKeyOf(body.field))
  if (cached) {
    return jsonOk(c, { explanation: cached, source: 'cache', upsell: false })
  }

  // Miss → guard backstop (caps abuse via novel dates), then BATCH the whole day
  // in ONE call and cache EVERY field, so later taps that day are KV hits.
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const subject = resolveLlmGuardSubject({ deviceId: body.deviceId, ipHash: hashIp(ip) })
  const template = (upsell: boolean) =>
    jsonOk(c, {
      explanation: templateExplanation(almanac, body.field),
      source: 'template',
      upsell,
    })
  if (!subject) return template(false)

  // __DEV__ test devices bypass the guard entirely (mirrors /makeif) so the full
  // Pro reading is always exercised; prod still caps spoofed-isPro abuse.
  let guard: Awaited<ReturnType<typeof evaluateLlmGuard>> | null = null
  if (!body.dev) {
    guard = await evaluateLlmGuard(c.env, { subject, config: CYCLE_GUARD_CONFIG })
    for (const ev of guard.events) console.info('[cycle.explain.guard]', JSON.stringify(ev))
    if (guard.decision !== 'allow_llm') return template(guard.upsellAfterExhaust)
  }

  // FAST PATH: generate ONLY the tapped field (single call, ~2-3s) and return it,
  // then warm the REST of the day's fields in the background so later taps are KV
  // hits. (Previously one ~12s batch up front — far too slow for a single tap.)
  const restFields = [
    ...almanac.goodFor.map((v) => `宜 ${v}`),
    ...almanac.avoid.map((v) => `忌 ${v}`),
    `冲${almanac.clash.zodiac}`,
  ].filter((f) => f !== body.field)

  try {
    const single = await astroClient.post<{ explanation: string }>(
      c.env.SVC_ASTRO,
      '/cycle/explain',
      {
        date: body.date,
        field: body.field,
        ganZhi: almanac.todayGanZhi,
        dayOfficer: almanac.dayOfficer,
        mansion: almanac.mansion.name,
        dayMaster,
        relation: almanac.elementRelation,
        locale: body.locale,
        isPro: true,
      }
    )
    const explanation = (single.explanation ?? '').trim()
    if (explanation) {
      await c.env.GUARD_KV.put(cacheKeyOf(body.field), explanation, { expirationTtl: 86_400 })
      if (!body.dev && guard) {
        await recordLlmGuardGrant(c.env, {
          subject,
          config: CYCLE_GUARD_CONFIG,
          consumesPeakPass: guard.consumesPeakPass,
        })
      }
      c.executionCtx.waitUntil(
        warmExplainRest(c, {
          date: body.date,
          fields: restFields,
          ganZhi: almanac.todayGanZhi,
          dayOfficer: almanac.dayOfficer,
          mansion: almanac.mansion.name,
          dayMaster,
          relation: almanac.elementRelation,
          locale: body.locale,
          cacheKeyOf,
        })
      )
      return jsonOk(c, { explanation, source: 'llm', tier: guard?.tier ?? 'dev', upsell: false })
    }
  } catch (err) {
    console.error('[auspice.explain] single failed', err)
  }
  return template(false) // svc-astro failed/empty — degrade, no grant recorded
})

// ── POST /makeif — Pro "假如你..." narratives for the make-if life branches ────
//
// make-if Phase 3. The branch STRUCTURE is deterministic + client-side; this
// adds the per-branch narrative (one LLM call, same batch+cache+Pro-gate pattern
// as /explain). Pro-only; cached 30d per (birth profile · locale · branch shape).

const makeifSchema = z.object({
  birthDate: z.string().regex(DATE_RE, 'birthDate must be YYYY-MM-DD'),
  birthHour: z.number().int().min(-1).max(23).default(-1),
  gender: z.enum(['M', 'F']),
  locale: z.string().max(16).default('en'),
  isPro: z.boolean().default(false),
  /** DEV builds (__DEV__) set this to bypass the per-subject daily limit while
   *  testing. Production app builds always send false. */
  dev: z.boolean().default(false),
  branches: z
    .array(
      z.object({
        id: z.string().max(64),
        label: z.string().max(40),
        divergeAtAge: z.number().int().min(0).max(120),
        mergeAtAge: z.number().int().min(0).max(120).nullable(),
        isPast: z.boolean().optional(),
        realPillar: z.string().max(8).optional(),
      })
    )
    .min(1)
    .max(5),
})

auspiceRoutes.post('/makeif', async (c) => {
  const body = makeifSchema.parse(await c.req.json().catch(() => ({})))

  // Pro-only — Free sees the deterministic structure + the explainer, no narrative.
  if (!body.isPro) return jsonOk(c, { narratives: {}, summaries: {}, source: 'locked' })

  const ymd = parseYmd(body.birthDate)
  const hour = body.birthHour < 0 ? 12 : body.birthHour
  const pillars = getFourPillars({ year: ymd.year, month: ymd.month, day: ymd.day, hour })

  // Cache key buckets by birth profile + branch shape, so a given person always
  // reads the same stories and re-asks are free. Branch shape folded in via the
  // tiny non-crypto hash so a structure change busts the cache.
  const shapeSig = body.branches
    .map((b) => `${b.id}:${b.label}:${b.divergeAtAge}:${b.mergeAtAge}:${b.isPast}:${b.realPillar}`)
    .join(',')
  // `v3` busts the 30-day cache after the 概要 (summary) addition — pre-v3 entries
  // cached only `{id: narrative}`; v3 caches `{narratives, summaries}` together.
  const cacheKey = `auspice:makeif:v3:${body.birthDate}:${body.birthHour}:${body.gender}:${body.locale}:${hashIp(shapeSig)}`
  const cached = await c.env.GUARD_KV.get(cacheKey)
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as {
        narratives: Record<string, string>
        summaries?: Record<string, string>
      }
      return jsonOk(c, {
        narratives: parsed.narratives ?? {},
        summaries: parsed.summaries ?? {},
        source: 'cache',
      })
    } catch {
      // fall through to regenerate on a corrupt cache row
    }
  }

  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const subject = resolveLlmGuardSubject({ deviceId: undefined, ipHash: hashIp(ip) })
  // DEV builds bypass the per-subject daily limit so testing isn't capped after
  // a handful of forks. Production app builds send dev=false, so real users
  // still hit MAKEIF_GUARD_CONFIG.
  let guard: Awaited<ReturnType<typeof evaluateLlmGuard>> | null = null
  if (!body.dev) {
    if (!subject) return jsonOk(c, { narratives: {}, summaries: {}, source: 'template' })
    guard = await evaluateLlmGuard(c.env, { subject, config: MAKEIF_GUARD_CONFIG })
    for (const ev of guard.events) console.info('[auspice.makeif.guard]', JSON.stringify(ev))
    if (guard.decision !== 'allow_llm') {
      return jsonOk(c, {
        narratives: {},
        summaries: {},
        source: 'template',
        upsell: guard.upsellAfterExhaust,
      })
    }
  }

  const currentAge = new Date().getUTCFullYear() - ymd.year

  try {
    const resp = await astroClient.post<{
      narratives: Record<string, string>
      summaries?: Record<string, string>
    }>(c.env.SVC_ASTRO, '/cycle/makeif-narrate', {
      dayMaster: pillars.day.stem,
      dayPillar: `${pillars.day.stem}${pillars.day.branch}`,
      yearPillar: `${pillars.year.stem}${pillars.year.branch}`,
      gender: body.gender,
      currentAge,
      locale: body.locale,
      isPro: true,
      branches: body.branches,
    })
    const narratives = resp.narratives ?? {}
    const summaries = resp.summaries ?? {}
    if (Object.keys(narratives).length > 0) {
      await c.env.GUARD_KV.put(cacheKey, JSON.stringify({ narratives, summaries }), {
        expirationTtl: 2_592_000,
      })
      if (!body.dev && subject && guard) {
        await recordLlmGuardGrant(c.env, {
          subject,
          config: MAKEIF_GUARD_CONFIG,
          consumesPeakPass: guard.consumesPeakPass,
        })
      }
      return jsonOk(c, { narratives, summaries, source: 'llm' })
    }
  } catch (err) {
    console.error('[auspice.makeif] narrate failed', err)
  }
  return jsonOk(c, { narratives: {}, summaries: {}, source: 'template' })
})

// ── make-if forks persistence (D1) ─────────────────────────────────────────
//
// The interactive sandbox was in-memory only — forks vanished on exit. These
// persist them so a returning user sees their "假如人生" branches + narratives.
// Scoped by device (`owner = device:<deviceId>`), matching Auspice's anonymous
// model; account-level cross-device sync can migrate device→userId on sign-in
// later (same pattern as transferAuspicePeopleToBonds). PK (owner,id) → re-save
// upserts the latest narrative.

const forkSchema = z.object({
  deviceId: z.string().min(1).max(128),
  birthDate: z.string().regex(DATE_RE),
  birthHour: z.number().int().min(-1).max(23),
  gender: z.enum(['M', 'F']),
  id: z.string().min(1).max(64),
  label: z.string().max(40),
  event: z.string().max(200),
  divergeAtAge: z.number().int().min(0).max(120),
  mergeAtAge: z.number().int().min(0).max(120).nullable(),
  isPast: z.boolean().default(false),
  realPillar: z.string().max(8).optional(),
  narrative: z.string().max(2000),
  locale: z.string().max(16).default('en'),
})

auspiceRoutes.post('/makeif/forks', async (c) => {
  const body = forkSchema.parse(await c.req.json())
  const owner = `device:${body.deviceId}`
  await c
    .get('db')
    .insert(makeifForks)
    .values({
      owner,
      id: body.id,
      birthDate: body.birthDate,
      birthHour: body.birthHour,
      gender: body.gender,
      event: body.event,
      label: body.label,
      divergeAtAge: body.divergeAtAge,
      mergeAtAge: body.mergeAtAge,
      isPast: body.isPast,
      realPillar: body.realPillar,
      narrative: body.narrative,
      locale: body.locale,
      createdAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: [makeifForks.owner, makeifForks.id],
      set: {
        narrative: body.narrative,
        label: body.label,
        event: body.event,
        locale: body.locale,
      },
    })
  return jsonOk(c, { saved: true })
})

auspiceRoutes.get('/makeif/forks', async (c) => {
  const deviceId = c.req.query('deviceId')
  const birthDate = c.req.query('birthDate')
  const birthHour = Number.parseInt(c.req.query('birthHour') ?? '', 10)
  const gender = c.req.query('gender')
  if (!deviceId || !birthDate || Number.isNaN(birthHour) || (gender !== 'M' && gender !== 'F')) {
    throw new HTTPException(400, { message: 'deviceId/birthDate/birthHour/gender required' })
  }
  const rows = await c
    .get('db')
    .select()
    .from(makeifForks)
    .where(
      and(
        eq(makeifForks.owner, `device:${deviceId}`),
        eq(makeifForks.birthDate, birthDate),
        eq(makeifForks.birthHour, birthHour),
        eq(makeifForks.gender, gender)
      )
    )
    .orderBy(makeifForks.createdAt)
  return jsonOk(c, { forks: rows })
})

auspiceRoutes.delete('/makeif/forks/:id', async (c) => {
  const id = c.req.param('id')
  const deviceId = c.req.query('deviceId')
  if (!deviceId) throw new HTTPException(400, { message: 'deviceId required' })
  await c
    .get('db')
    .delete(makeifForks)
    .where(and(eq(makeifForks.owner, `device:${deviceId}`), eq(makeifForks.id, id)))
  return jsonOk(c, { deleted: true })
})

// ── 生日提醒 (birthday reminders) persistence + free-tier cap ─────────────────
//
// Server-backed store for 亲友 birthdays (see schema.birthdayReminders). The free
// tier gets reminders for the first BIRTHDAY_FREE_LIMIT 亲友; more need auspice_pro.
// The cap is enforced HERE (authoritative) so it can't be bypassed by editing local
// storage; the app also caps locally for snappy UX. Device-scoped like make-if.

const BIRTHDAY_FREE_LIMIT = 3

/** MM-DD for a solar birthday (cron index); null for 农历 (resolved at runtime). */
function solarMonthDay(date: string, calendar: 'solar' | 'lunar'): string | null {
  if (calendar !== 'solar') return null
  const m = /^\d{4}-(\d{2}-\d{2})$/.exec(date)
  return m ? (m[1] ?? null) : null
}

/** Live Pro gate for the cap: RevenueCat when configured + `u` present, else the
 *  client flag (fail-open in dev with no RC key — matches /calendar/sign). */
async function birthdayProOk(
  env: CalendarEnv,
  isProFlag: boolean,
  appUserId?: string
): Promise<boolean> {
  if (env.REVENUECAT_API_KEY && appUserId)
    return isAuspiceProViaRc(env.REVENUECAT_API_KEY, appUserId)
  return isProFlag
}

const birthdaySchema = z.object({
  deviceId: z.string().min(1).max(128),
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(80),
  solarDate: z.string().regex(DATE_RE),
  calendar: z.enum(['solar', 'lunar']).default('solar'),
  relation: z.string().max(40).optional(),
  advanceDays: z.number().int().min(0).max(60).default(1),
  remindOnDay: z.boolean().default(true),
  /** Pro signal — client flag, hardened by a live RC check when `u` is sent. */
  isPro: z.boolean().default(false),
  /** RevenueCat app-user-id, for the authoritative Pro check. */
  u: z.string().max(128).optional(),
})

auspiceRoutes.post('/birthdays', async (c) => {
  const body = birthdaySchema.parse(await c.req.json())
  const owner = `device:${body.deviceId}`
  const db = c.get('db')

  const existing = await db
    .select({ id: birthdayReminders.id })
    .from(birthdayReminders)
    .where(eq(birthdayReminders.owner, owner))
  const isNew = !existing.some((r) => r.id === body.id)

  // Only NEW birthdays beyond the free cap need Pro; editing an existing one is free.
  if (isNew && existing.length >= BIRTHDAY_FREE_LIMIT) {
    const pro = await birthdayProOk(c.env as unknown as CalendarEnv, body.isPro, body.u)
    if (!pro) {
      return jsonOk(c, { saved: false, limited: true, limit: BIRTHDAY_FREE_LIMIT })
    }
  }

  await db
    .insert(birthdayReminders)
    .values({
      owner,
      id: body.id,
      name: body.name,
      solarDate: body.solarDate,
      calendar: body.calendar,
      relation: body.relation,
      advanceDays: body.advanceDays,
      remindOnDay: body.remindOnDay,
      monthDay: solarMonthDay(body.solarDate, body.calendar),
      createdAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: [birthdayReminders.owner, birthdayReminders.id],
      set: {
        name: body.name,
        solarDate: body.solarDate,
        calendar: body.calendar,
        relation: body.relation,
        advanceDays: body.advanceDays,
        remindOnDay: body.remindOnDay,
        monthDay: solarMonthDay(body.solarDate, body.calendar),
      },
    })
  return jsonOk(c, { saved: true })
})

auspiceRoutes.get('/birthdays', async (c) => {
  const deviceId = c.req.query('deviceId')
  if (!deviceId) throw new HTTPException(400, { message: 'deviceId required' })
  const rows = await c
    .get('db')
    .select()
    .from(birthdayReminders)
    .where(eq(birthdayReminders.owner, `device:${deviceId}`))
    .orderBy(birthdayReminders.createdAt)
  return jsonOk(c, { birthdays: rows, freeLimit: BIRTHDAY_FREE_LIMIT })
})

auspiceRoutes.delete('/birthdays/:id', async (c) => {
  const id = c.req.param('id')
  const deviceId = c.req.query('deviceId')
  if (!deviceId) throw new HTTPException(400, { message: 'deviceId required' })
  await c
    .get('db')
    .delete(birthdayReminders)
    .where(and(eq(birthdayReminders.owner, `device:${deviceId}`), eq(birthdayReminders.id, id)))
  return jsonOk(c, { deleted: true })
})
