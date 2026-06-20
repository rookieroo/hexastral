/**
 * Almanac engine — pure deterministic, no LLM, no network.
 *
 * Computes a per-user-per-day "almanac" reading from:
 *   1. The user's static traits (cached at onboarding: dayMasterStem, favorableElement, ...)
 *   2. Today's heavenly-stem / earthly-branch context
 *   3. Locale + a deterministic seed (date + userId) for stable variation
 *
 * Output drives:
 *   - The daily push notification headline (free for all users, forever, zero LLM cost)
 *   - Scaffold consumed by the lazy LLM signal so in-app text stays consistent with push
 *   - The 7-day trail visualization on the Fate tab
 *
 * Mathematics is grounded in classical wuxing-relation rules (《滴天髓》/《通胜》/《玉匣记》):
 *   - day-element vs day-master-element relation → energy band
 *   - favorable element + ten-god dynamics → lucky direction / hour / color
 *   - templated headline / lens / watch-out drawn from per-locale dictionaries
 */

import type { Locale } from '../types'
import { almanacTemplates } from './templates'

/** Wu Xing element. */
export type WuXing = '木' | '火' | '土' | '金' | '水'

/** 10 heavenly stems. */
export type Stem = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸'

/** 12 earthly branches. */
export type Branch =
  | '子'
  | '丑'
  | '寅'
  | '卯'
  | '辰'
  | '巳'
  | '午'
  | '未'
  | '申'
  | '酉'
  | '戌'
  | '亥'

/** Wuxing relation between day-element and user's day-master-element. */
export type Relation = 'support' | 'output' | 'wealth' | 'pressure' | 'peer'

/** Energy band — drives card coloring + push tone. */
export type EnergyLevel = 'rising' | 'steady' | 'productive' | 'guarded' | 'volatile'

/** Compass direction. */
export type Direction = '东' | '南' | '西' | '北' | '中'

export interface UserStaticTraits {
  /** Stable user id used for deterministic per-user-per-day variation. */
  userId: string
  dayMasterStem: Stem
  favorableElement: WuXing
  unfavorableElement: WuXing
  birthBranch: Branch
}

export interface DayContext {
  /** ISO date (YYYY-MM-DD), the user's local-tz day. */
  date: string
  dayStem: Stem
  dayBranch: Branch
}

export interface AlmanacResult {
  date: string
  relation: Relation
  energyLevel: EnergyLevel
  luckyHour: string
  luckyDirection: Direction
  luckyColor: string
  /** Localized one-line headline, used as push title. */
  headline: string
  /** Localized 1–2 sentence "today's lens" — the day's strategic frame. */
  todayLens: string
  /** Localized 1 sentence "watch for" — what to avoid / soften. */
  watchFor: string
}

// ============================================================================
// Wu Xing tables
// ============================================================================

const STEM_TO_ELEMENT: Record<Stem, WuXing> = {
  甲: '木',
  乙: '木',
  丙: '火',
  丁: '火',
  戊: '土',
  己: '土',
  庚: '金',
  辛: '金',
  壬: '水',
  癸: '水',
}

const BRANCH_TO_ELEMENT: Record<Branch, WuXing> = {
  子: '水',
  丑: '土',
  寅: '木',
  卯: '木',
  辰: '土',
  巳: '火',
  午: '火',
  未: '土',
  申: '金',
  酉: '金',
  戌: '土',
  亥: '水',
}

/** A → generates → B (生): 木→火→土→金→水→木 */
const GENERATES: Record<WuXing, WuXing> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
}

/** A → controls → B (克): 木→土→水→火→金→木 */
const CONTROLS: Record<WuXing, WuXing> = {
  木: '土',
  土: '水',
  水: '火',
  火: '金',
  金: '木',
}

const ELEMENT_TO_DIRECTION: Record<WuXing, Direction> = {
  木: '东',
  火: '南',
  金: '西',
  水: '北',
  土: '中',
}

const ELEMENT_TO_COLOR_KEY: Record<WuXing, string> = {
  木: 'green',
  火: 'red',
  土: 'yellow',
  金: 'white',
  水: 'black',
}

/** 12 shichen names + their hour ranges. */
const SHICHEN: Array<{ branch: Branch; range: string }> = [
  { branch: '子', range: '23:00–01:00' },
  { branch: '丑', range: '01:00–03:00' },
  { branch: '寅', range: '03:00–05:00' },
  { branch: '卯', range: '05:00–07:00' },
  { branch: '辰', range: '07:00–09:00' },
  { branch: '巳', range: '09:00–11:00' },
  { branch: '午', range: '11:00–13:00' },
  { branch: '未', range: '13:00–15:00' },
  { branch: '申', range: '15:00–17:00' },
  { branch: '酉', range: '17:00–19:00' },
  { branch: '戌', range: '19:00–21:00' },
  { branch: '亥', range: '21:00–23:00' },
]

// ============================================================================
// Deterministic hash — FNV-1a 32-bit (small, fast, stable)
// ============================================================================

function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0
  }
  return h >>> 0
}

/** Stable per-seed-per-day index in [0, len). Exposed so callers that need the
 *  chosen index (e.g. a `hookKey` for A/B attribution) don't re-hash. */
function pickIndex(len: number, seed: string, date: string, salt: string): number {
  if (len <= 0) throw new Error('almanac: empty template array')
  return fnv1a(`${seed}|${date}|${salt}`) % len
}

/** Stable per-user-per-day pick from `arr`. */
function pick<T>(arr: readonly T[], userId: string, date: string, salt: string): T {
  return arr[pickIndex(arr.length, userId, date, salt)] as T
}

/** YYYY-MM-DD → a calendar-day ordinal (+1 per day; month/leap-correct via `Date.UTC`,
 *  which is a pure function of its args — no clock read). Drives the rotation below. */
function dayOrdinal(date: string): number {
  const [y, m, d] = date.split('-')
  return Math.floor(Date.UTC(Number(y), Number(m) - 1, Number(d)) / 86_400_000)
}

/** Like `pickIndex`, but ROTATED by the calendar-day ordinal so CONSECUTIVE days always
 *  land on different indices (for len>1) — the per-seed hash only sets the starting
 *  phase, so it stays personalized + deterministic. The daily hook uses this so a rare
 *  same-cell two-day run (where the day-pillar leaves the cell unchanged) still reads
 *  differently day-to-day. */
function rotateIndex(len: number, seed: string, date: string, salt: string): number {
  if (len <= 0) throw new Error('almanac: empty template array')
  return (fnv1a(`${seed}|${salt}`) + dayOrdinal(date)) % len
}

// ============================================================================
// Core derivations
// ============================================================================

function relationOf(dayEl: WuXing, dayMasterEl: WuXing): Relation {
  if (dayEl === dayMasterEl) return 'peer'
  if (GENERATES[dayEl] === dayMasterEl) return 'support' // 生我 (印)
  if (GENERATES[dayMasterEl] === dayEl) return 'output' // 我生 (食伤)
  if (CONTROLS[dayMasterEl] === dayEl) return 'wealth' // 我克 (财)
  if (CONTROLS[dayEl] === dayMasterEl) return 'pressure' // 克我 (官杀)
  // Mathematically unreachable given the closed wuxing relation set, but keep
  // the type-checker happy without throwing in production.
  return 'peer'
}

function energyOf(relation: Relation, dayEl: WuXing, favorable?: WuXing): EnergyLevel {
  // Day element matches user's favorable element → tilts upward regardless of relation.
  // `favorable` is optional: an Auspice subject derived from birthDate alone has no
  // 用神, so it falls to the no-boost branch (the relation still resolves the band).
  const favorableBoost = favorable != null && dayEl === favorable
  switch (relation) {
    case 'support':
      return favorableBoost ? 'rising' : 'steady'
    case 'peer':
      return favorableBoost ? 'rising' : 'steady'
    case 'output':
      return 'productive'
    case 'wealth':
      return favorableBoost ? 'productive' : 'guarded'
    case 'pressure':
      return favorableBoost ? 'guarded' : 'volatile'
  }
}

/**
 * Energy band from a RELATION. The daily hook reads its energy off the day-pillar
 * BRANCH's relation to the day-master (the 地支 turns over daily), so the hook's cell
 * moves day-to-day even when the stem-element theme holds for two days. 命理-coherent:
 * each cell is (today's 天干十神 theme) × (today's 地支十神 intensity).
 */
const ENERGY_BY_RELATION: Record<Relation, EnergyLevel> = {
  support: 'rising', // 生我 (印) — nourishing
  peer: 'steady', // 比和 (比劫) — level
  output: 'productive', // 我生 (食伤) — outflowing
  wealth: 'guarded', // 我克 (财) — effortful
  pressure: 'volatile', // 克我 (官杀) — pressing
}

function luckyHourOf(favorable: WuXing, userId: string, date: string): string {
  // Pick a shichen whose branch element equals or generates the favorable element.
  const candidates = SHICHEN.filter((s) => {
    const el = BRANCH_TO_ELEMENT[s.branch]
    return el === favorable || GENERATES[el] === favorable
  })
  const chosen = pick(candidates.length > 0 ? candidates : SHICHEN, userId, date, 'hour')
  return `${chosen.branch} ${chosen.range}`
}

// ============================================================================
// Public API
// ============================================================================

export interface ComputeAlmanacInput {
  user: UserStaticTraits
  day: DayContext
  locale: Locale
}

export function computeAlmanac(input: ComputeAlmanacInput): AlmanacResult {
  const { user, day, locale } = input
  const dayMasterEl = STEM_TO_ELEMENT[user.dayMasterStem]
  const dayEl = STEM_TO_ELEMENT[day.dayStem]
  const relation = relationOf(dayEl, dayMasterEl)
  const energyLevel = energyOf(relation, dayEl, user.favorableElement)

  const luckyDirection = ELEMENT_TO_DIRECTION[user.favorableElement]
  const luckyColorKey = ELEMENT_TO_COLOR_KEY[user.favorableElement]
  const luckyHour = luckyHourOf(user.favorableElement, user.userId, day.date)

  const tpl = almanacTemplates[locale] ?? almanacTemplates.en
  const cell = tpl[relation][energyLevel]

  return {
    date: day.date,
    relation,
    energyLevel,
    luckyHour,
    luckyDirection,
    luckyColor: tpl.colors[luckyColorKey] ?? luckyColorKey,
    headline: pick(cell.headlines, user.userId, day.date, 'headline'),
    todayLens: pick(cell.lenses, user.userId, day.date, 'lens'),
    watchFor: pick(cell.watchFor, user.userId, day.date, 'watch'),
  }
}

// ============================================================================
// Daily hook — the Auspice DAU one-liner
// ============================================================================
//
// A thin, subject-light wrapper over the same corpus `computeAlmanac` uses. The
// Auspice daily push (non-zh) leads with this instead of an opaque 干支纪日 label,
// and the home screen echoes the identical line. Needs no 用神 — the day-PILLAR alone
// resolves the cell: the day-STEM's element vs the day-master is the THEME (row), the
// day-BRANCH's relation is the ENERGY (column). The 地支 turns over daily, so the hook
// varies day-to-day even when the stem-theme holds for two days (it used to be
// relation-locked → only 5 cells ever for a push user → "跨天不变"). `seed` (not a
// userId) keys the deterministic line pick, so push + app agree on the same line.

export interface DailyHookInput {
  /** Stable seed so push + app pick the same line. Auspice passes the birthDate. */
  seed: string
  dayMasterStem: Stem
  /** Today's day-pillar heavenly STEM — its element vs the day-master is the THEME
   *  (relation row). Holds ~2 days (stems pair by element), so not enough alone. */
  dayStem: Stem
  /** Today's day-pillar earthly BRANCH — its element vs the day-master drives the
   *  ENERGY band, which turns over daily (地支 cycles 12) → daily variety. */
  dayBranch: Branch
  /** ISO date (YYYY-MM-DD), the user's local-tz day. */
  date: string
  locale: Locale
}

export interface DailyHookResult {
  relation: Relation
  energyLevel: EnergyLevel
  /** Localized one-line hook — push title / home hero. */
  title: string
  /** Localized 1–2 sentence frame — push body / home subline. */
  lens: string
  /** `relation:energyLevel:idx` — opaque key carried for future A/B attribution. */
  hookKey: string
}

export function computeDailyHook(input: DailyHookInput): DailyHookResult {
  const { seed, dayMasterStem, dayStem, dayBranch, date, locale } = input
  const dayMasterEl = STEM_TO_ELEMENT[dayMasterStem]
  // THEME (格子 row): the day-STEM's element vs the day-master. Holds ~2 days.
  const relation = relationOf(STEM_TO_ELEMENT[dayStem], dayMasterEl)
  // ENERGY (格子 column): the day-BRANCH's relation vs the day-master — the 地支 turns
  // over daily, so the cell moves day-to-day even when the theme holds. (Was
  // relation-locked → only 5 cells ever for a push user → "跨天不变".)
  const energyLevel = ENERGY_BY_RELATION[relationOf(BRANCH_TO_ELEMENT[dayBranch], dayMasterEl)]

  const tpl = almanacTemplates[locale] ?? almanacTemplates.en
  const cell = tpl[relation][energyLevel]
  // ROTATE by the calendar-day ordinal (not a pure hash) so consecutive days never pick
  // the same line, even on the rare two-day run where the day-pillar leaves the cell
  // unchanged. title + lens rotate on independent phases (different salt).
  const titleIdx = rotateIndex(cell.headlines.length, seed, date, 'hook-title')
  const lensIdx = rotateIndex(cell.lenses.length, seed, date, 'hook-lens')
  return {
    relation,
    energyLevel,
    title: cell.headlines[titleIdx] as string,
    lens: cell.lenses[lensIdx] as string,
    hookKey: `${relation}:${energyLevel}:${titleIdx}`,
  }
}
