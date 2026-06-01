/**
 * @zhop/astro-core — 大运计算引擎
 *
 * 大运是八字命理的十年运程周期，命理付费核心内容。
 *
 * 核心算法：
 * 1. 排运方向 → 年干阴阳 × 性别（阳男阴女顺排，阴男阳女逆排）
 * 2. 起运年龄 → 生日到最近「节」天数 ÷ 3 = 年, 余数 × 4 = 月
 * 3. 大运干支 → 从月柱起，按方向顺/逆推六十甲子序列
 * 4. 每步大运 10 年
 *
 * 用途：
 * - 流年大运时间轴可视化（v2.5 付费功能，3 枚香火/次）
 * - 双盘合参引擎的八字底色层
 * - AI 解读的核心上下文
 */

import { BRANCH_WUXING, HEAVENLY_STEMS, STEM_WUXING, STEM_YINYANG } from './constants'
import { ganZhiFromIndex, getFourPillars, monthGanZhi, yearGanZhi } from './ganzhi'
import { getJieQiDay } from './jieqi'
import type {
  DateTimeInput,
  EarthlyBranch,
  FourPillars,
  GanZhi,
  HeavenlyStem,
  WuXing,
} from './types'

// ========================================
// Types
// ========================================

/** 性别 */
export type Gender = '男' | '女'

/** 大运单步（10年） */
export interface DaYunStep {
  /** 大运序号 (1-based) */
  index: number
  /** 该步大运的干支 */
  ganZhi: GanZhi
  /** 起始年龄 */
  startAge: number
  /** 结束年龄 */
  endAge: number
  /** 起始公历年 */
  startYear: number
  /** 结束公历年 */
  endYear: number
}

/** 起运年龄（精确到年月） */
export interface StartAgeDetail {
  /** 年数 */
  years: number
  /** 余月数 (0, 4, 8) */
  months: number
  /** 四舍五入后的整数年龄 */
  rounded: number
  /** 显示文本 e.g. "5岁4个月" */
  description: string
}

/** 大运完整结果 */
export interface DaYunResult {
  /** 排运方向 */
  direction: '顺' | '逆'
  /** 起运年龄详情 */
  startAge: StartAgeDetail
  /** 起运公历年 */
  startYear: number
  /** 大运序列 */
  steps: DaYunStep[]
  /** 四柱（排盘基础） */
  pillars: FourPillars
}

/** 流年信息 */
export interface LiuNianInfo {
  /** 公历年 */
  year: number
  /** 流年干支 */
  ganZhi: GanZhi
  /** 虚岁 */
  age: number
}

/** 大运+流年时间轴条目 */
export interface TimelineEntry {
  /** 所属大运 */
  daYun: DaYunStep
  /** 该大运内的逐年流年 */
  liuNianList: LiuNianInfo[]
}

// ========================================
// Direction
// ========================================

/**
 * 判断排运方向
 *
 * 阳年干(甲/丙/戊/庚/壬) + 男 → 顺排
 * 阳年干 + 女 → 逆排
 * 阴年干(乙/丁/己/辛/癸) + 男 → 逆排
 * 阴年干 + 女 → 顺排
 */
export function getDaYunDirection(yearStem: HeavenlyStem, gender: Gender): '顺' | '逆' {
  const isYangStem = STEM_YINYANG[yearStem] === '阳'
  const isMale = gender === '男'
  return isYangStem === isMale ? '顺' : '逆'
}

// ========================================
// Jie (节) Lookup
// ========================================

/**
 * 12 节的 jieqi index（年历序）
 * 小寒(0), 立春(2), 惊蛰(4), 清明(6), 立夏(8), 芒种(10),
 * 小暑(12), 立秋(14), 白露(16), 寒露(18), 立冬(20), 大雪(22)
 */
const JIE_INDICES = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22] as const

/**
 * 节气名称（按年历序 jie only）
 */
const JIE_NAMES = [
  '小寒',
  '立春',
  '惊蛰',
  '清明',
  '立夏',
  '芒种',
  '小暑',
  '立秋',
  '白露',
  '寒露',
  '立冬',
  '大雪',
] as const

/** 获取某年所有 12 节的精确日期 */
function getYearJieDates(year: number): Date[] {
  return JIE_INDICES.map((jieIdx) => {
    const day = getJieQiDay(year, jieIdx)
    const month = Math.floor(jieIdx / 2) + 1
    return new Date(year, month - 1, day)
  })
}

/**
 * 找到出生日期前/后最近的「节」
 *
 * - 顺排: 找出生日后的下一个节
 * - 逆排: 找出生日前（含当日）的上一个节
 */
function findNearestJie(
  year: number,
  month: number,
  day: number,
  direction: '顺' | '逆'
): { date: Date; name: string } {
  // Collect jie dates for 3 consecutive years to handle boundary
  const allJie: Array<{ date: Date; name: string }> = []
  for (const y of [year - 1, year, year + 1]) {
    const dates = getYearJieDates(y)
    for (let i = 0; i < dates.length; i++) {
      allJie.push({ date: dates[i]!, name: JIE_NAMES[i]! })
    }
  }
  allJie.sort((a, b) => a.date.getTime() - b.date.getTime())

  const birthDate = new Date(year, month - 1, day)
  const birthMs = birthDate.getTime()

  if (direction === '顺') {
    // Find next jie strictly after birth date
    for (const jie of allJie) {
      if (jie.date.getTime() > birthMs) return jie
    }
  } else {
    // Find previous jie on or before birth date
    for (let i = allJie.length - 1; i >= 0; i--) {
      if (allJie[i]!.date.getTime() <= birthMs) return allJie[i]!
    }
  }

  // Fallback (should not reach)
  return allJie[0]!
}

// ========================================
// Start Age Calculation
// ========================================

/**
 * 计算起运年龄
 *
 * 传统规则: 3天折1年，1天折4个月
 *
 * @returns 精确年月拆分
 */
function calcStartAge(
  year: number,
  month: number,
  day: number,
  direction: '顺' | '逆'
): StartAgeDetail {
  const birthDate = new Date(year, month - 1, day)
  const nearestJie = findNearestJie(year, month, day, direction)

  const diffMs = Math.abs(nearestJie.date.getTime() - birthDate.getTime())
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  const years = Math.floor(diffDays / 3)
  const remainDays = diffDays % 3
  const months = remainDays * 4 // 1天 ≈ 4个月

  // 四舍五入: 余6个月及以上进1年
  const rounded = years + (months >= 6 ? 1 : 0)

  const description = months > 0 ? `${years}岁${months}个月` : `${years}岁`

  return { years, months, rounded, description }
}

// ========================================
// Core: 大运计算
// ========================================

/**
 * 计算大运
 *
 * @param input 出生日期时间
 * @param gender 性别
 * @param stepCount 大运步数（默认 8 步，覆盖 80 年）
 * @returns 完整大运结果
 *
 * @example
 * ```typescript
 * const result = calculateDaYun(
 *   { year: 1990, month: 3, day: 15, hour: 14 },
 *   '男'
 * )
 * // result.direction === '顺' (庚 is 阳干, 男 → 顺排)
 * // result.startAge.rounded === 7
 * // result.steps[0].ganZhi.label === '辛卯' (月柱庚寅 + 1)
 * ```
 */
export function calculateDaYun(input: DateTimeInput, gender: Gender, stepCount = 8): DaYunResult {
  const pillars = getFourPillars(input)
  const direction = getDaYunDirection(pillars.year.stem, gender)
  const startAgeDetail = calcStartAge(input.year, input.month, input.day, direction)
  const startAge = startAgeDetail.rounded

  // Month pillar's sexagenary index (1-60) is the starting point
  const monthIndex = pillars.month.index

  const steps: DaYunStep[] = []
  for (let i = 1; i <= stepCount; i++) {
    const offset = direction === '顺' ? i : -i
    const ganZhi = ganZhiFromIndex(monthIndex + offset)

    const stepStartAge = startAge + (i - 1) * 10
    const stepEndAge = stepStartAge + 9

    steps.push({
      index: i,
      ganZhi,
      startAge: stepStartAge,
      endAge: stepEndAge,
      startYear: input.year + stepStartAge,
      endYear: input.year + stepEndAge,
    })
  }

  return {
    direction,
    startAge: startAgeDetail,
    startYear: input.year + startAge,
    steps,
    pillars,
  }
}

// ========================================
// Lookup Helpers
// ========================================

/**
 * 查询某年龄处于哪步大运
 */
export function getDaYunAtAge(result: DaYunResult, age: number): DaYunStep | null {
  return result.steps.find((s) => age >= s.startAge && age <= s.endAge) ?? null
}

/**
 * 查询某公历年处于哪步大运
 */
export function getDaYunAtYear(result: DaYunResult, year: number): DaYunStep | null {
  return result.steps.find((s) => year >= s.startYear && year <= s.endYear) ?? null
}

/**
 * 获取流年干支
 *
 * 流年就是该年的年柱干支。
 * 每年的流年干支影响当年运势，与大运干支交互产生吉凶判断。
 */
export function getLiuNian(year: number): GanZhi {
  return yearGanZhi(year)
}

/**
 * 获取指定年份范围的流年信息
 *
 * @param birthYear 出生年（用于计算虚岁）
 * @param fromYear 起始年
 * @param toYear 结束年
 */
export function getLiuNianRange(
  birthYear: number,
  fromYear: number,
  toYear: number
): LiuNianInfo[] {
  const result: LiuNianInfo[] = []
  for (let y = fromYear; y <= toYear; y++) {
    result.push({
      year: y,
      ganZhi: yearGanZhi(y),
      age: y - birthYear + 1, // 虚岁
    })
  }
  return result
}

// ========================================
// Timeline (大运 + 流年合成)
// ========================================

/**
 * 生成大运+流年时间轴
 *
 * 将每步大运展开，填充逐年流年信息。
 * 用于 iOS 时间轴 UI 和 AI 解读上下文。
 *
 * @param daYunResult 大运计算结果
 * @param birthYear 出生年
 * @returns 时间轴条目数组
 */
export function buildTimeline(daYunResult: DaYunResult, birthYear: number): TimelineEntry[] {
  return daYunResult.steps.map((step) => ({
    daYun: step,
    liuNianList: getLiuNianRange(birthYear, step.startYear, step.endYear),
  }))
}

/**
 * 格式化大运信息，生成 AI Prompt 上下文
 *
 * @param result 大运结果
 * @param currentYear 当前年份（高亮当前所处大运）
 * @returns Prompt 文本
 */
export function formatDaYunForPrompt(result: DaYunResult, currentYear: number): string {
  const lines: string[] = [
    '## 大运排盘',
    `排运方向：${result.direction}排`,
    `起运年龄：${result.startAge.description}（${result.startYear}年起运）`,
    '',
    '| 序 | 大运 | 年龄区间 | 年份区间 | 当前 |',
    '|---|---|---|---|---|',
  ]

  for (const step of result.steps) {
    const isCurrent = currentYear >= step.startYear && currentYear <= step.endYear
    const marker = isCurrent ? '◀ 当前' : ''
    lines.push(
      `| ${step.index} | ${step.ganZhi.label} | ${step.startAge}-${step.endAge}岁 | ${step.startYear}-${step.endYear} | ${marker} |`
    )
  }

  // Current 大运 summary
  const currentDaYun = getDaYunAtYear(result, currentYear)
  if (currentDaYun) {
    const liuNian = getLiuNian(currentYear)
    lines.push(
      '',
      `当前大运：${currentDaYun.ganZhi.label}（${currentDaYun.startYear}-${currentDaYun.endYear}）`,
      `当前流年：${currentYear}年 ${liuNian.label}年`
    )
  }

  return lines.join('\n')
}

// ========================================
// Life Timeline API (ADR-0020)
// ========================================
//
// Slimmer surface tailored to `POST /api/cycle/timeline` (the Pro Life-
// Timeline endpoint) and the cycle-app consumer. Wraps the rich
// `calculateDaYun` / `getLiuNianRange` helpers above with a stable
// `PillarUnit { stem, branch, element }` shape so the route layer can
// project directly into the wire payload — no per-row mapping at the
// boundary. Gender is `'M' | 'F'` here (mirroring the API request
// schema); the legacy `'男' | '女'` Gender alias and `calculateDaYun` /
// `getLiuNianRange` callers are untouched.

/** Wire-shape pillar atom — same fields as TimelinePayload['pillars'][k]. */
export interface PillarUnit {
  stem: HeavenlyStem
  branch: EarthlyBranch
  /** Branch 五行 (matches existing `BRANCH_WUXING` mapping). */
  element: WuXing
}

/** Wire-shape 四柱 — hour pillar is `null` when birth hour unknown (`-1`). */
export interface TimelinePillars {
  year: PillarUnit
  month: PillarUnit
  day: PillarUnit
  hour: PillarUnit | null
}

/**
 * One 大运 step in the timeline payload.
 *
 * `isCurrent` is intentionally omitted — the route layer stamps it after
 * the deterministic compute returns, because "current" depends on
 * request time (which is not pure).
 */
export interface DayunRow {
  /** 1-based 大运 序号. */
  index: number
  pillar: PillarUnit
  startYear: number
  endYear: number
  startAge: number
  endAge: number
}

export interface LiunianRow {
  year: number
  pillar: PillarUnit
  /** 虚岁 (matches `getLiuNianRange`). */
  age: number
}

export interface LiuyueRow {
  /** 1..12, calendar-month index. Caveat: not 节气-bounded — see `computeLiuyue` JSDoc. */
  month: number
  pillar: PillarUnit
}

/**
 * Build a `PillarUnit` from an existing `GanZhi` — element comes from the
 * branch (which is what the cycle-app 五行 chip displays).
 */
function pillarFromGanZhi(gz: GanZhi): PillarUnit {
  return {
    stem: gz.stem,
    branch: gz.branch,
    element: BRANCH_WUXING[gz.branch],
  }
}

/** ASCII-only birth-date input — same shape the API request schema validates. */
interface TimelineBirth {
  /** `YYYY-MM-DD` (gregorian; the v1 endpoint does not take a tz offset). */
  date: string
  /** 24h hour, or `-1` when the user has not provided a birth hour. */
  hour: number
}

/** Parse `'YYYY-MM-DD'` → `{year, month, day}`; throws on malformed input. */
function parseBirthDate(date: string): { year: number; month: number; day: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!m) {
    throw new Error(`computeBaziPillars: birth.date must be YYYY-MM-DD (got ${date})`)
  }
  const year = Number.parseInt(m[1]!, 10)
  const month = Number.parseInt(m[2]!, 10)
  const day = Number.parseInt(m[3]!, 10)
  // The existing `getFourPillars` does not validate calendar legality (e.g. Feb 31);
  // we let it through here too — the API route already rejects invalid dates upstream.
  return { year, month, day }
}

/**
 * Compute the 四柱 in the wire-payload shape.
 *
 * - `hour === -1` → `hour` pillar is `null` (birth time unknown — the cycle-
 *   app onboarding lets the user skip this, see ADR-0020).
 * - For known hours we delegate to the existing `getFourPillars` (no 真太阳
 *   时 / 节气 boundary correction — same simplification it already documents
 *   for daily-almanac usage).
 *
 * Pure: same input → same output, no clock / I/O.
 */
export function computeBaziPillars(birth: TimelineBirth): TimelinePillars {
  const ymd = parseBirthDate(birth.date)
  const hour = birth.hour

  if (hour === -1) {
    // Unknown hour — synthesize 年/月/日 from a noon probe (the hour does
    // not influence year/month/day pillars in `getFourPillars`'s simplified
    // model), then drop the hour pillar.
    const probe = getFourPillars({ ...ymd, hour: 12 })
    return {
      year: pillarFromGanZhi(probe.year),
      month: pillarFromGanZhi(probe.month),
      day: pillarFromGanZhi(probe.day),
      hour: null,
    }
  }

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error(`computeBaziPillars: birth.hour must be -1 or 0-23 (got ${hour})`)
  }

  const fp = getFourPillars({ ...ymd, hour })
  return {
    year: pillarFromGanZhi(fp.year),
    month: pillarFromGanZhi(fp.month),
    day: pillarFromGanZhi(fp.day),
    hour: pillarFromGanZhi(fp.hour),
  }
}

/** Map the wire-shape `'M' | 'F'` to the internal CJK `Gender` alias. */
function genderToCjk(g: 'M' | 'F'): Gender {
  return g === 'M' ? '男' : '女'
}

/**
 * Compute the 8 大运 rows for the Life Timeline payload.
 *
 * Wraps `calculateDaYun` (which does the 节气-based 起运岁 + direction
 * logic) and reshapes the output into `DayunRow` (PillarUnit-typed pillars,
 * no `isCurrent` — the route adds that after compute).
 *
 * `pillars` is accepted to keep the function signature aligned with the
 * agent spec, but only the year stem matters for direction — the actual
 * 月柱 used as the starting point of the 大运 sequence is derived from
 * `birthDate` to stay consistent with the legacy 节气-aware path.
 */
export function computeDayun(
  pillars: TimelinePillars,
  gender: 'M' | 'F',
  birthDate: string
): DayunRow[] {
  // `pillars` is part of the public signature so callers can compute it once
  // and reuse; we still derive `birth` from `birthDate` so the underlying
  // 节气 calculation in `calculateDaYun` sees the actual calendar date.
  void pillars
  const ymd = parseBirthDate(birthDate)
  const result = calculateDaYun({ ...ymd, hour: 12 }, genderToCjk(gender), 8)
  return result.steps.map((step) => ({
    index: step.index,
    pillar: pillarFromGanZhi(step.ganZhi),
    startYear: step.startYear,
    endYear: step.endYear,
    startAge: step.startAge,
    endAge: step.endAge,
  }))
}

/**
 * Compute the ±`windowYears` 流年 window centered on `centerYear`.
 *
 * Total entries = `2 * windowYears + 1` (default 11). 虚岁 is computed as
 * `year - birthYear + 1`, matching `getLiuNianRange`.
 */
export function computeLiunian(
  centerYear: number,
  birthYear: number,
  windowYears = 5
): LiunianRow[] {
  if (!Number.isInteger(windowYears) || windowYears < 0) {
    throw new Error(`computeLiunian: windowYears must be a non-negative integer (got ${windowYears})`)
  }
  const rows = getLiuNianRange(birthYear, centerYear - windowYears, centerYear + windowYears)
  return rows.map((r) => ({
    year: r.year,
    pillar: pillarFromGanZhi(r.ganZhi),
    age: r.age,
  }))
}

/**
 * Compute the 12 流月 干支 for a given year.
 *
 * SIMPLIFICATION (v1 — flagged in the agent spec & ADR-0020): month index
 * `1..12` maps directly to calendar months (Jan..Dec) instead of being
 * 节气-bounded (寅月 ≈ 立春…惊蛰, 卯月 ≈ 惊蛰…清明, etc.). This is
 * accurate enough for the timeline strip the cycle-app renders today; a
 * follow-up can swap in `getMonthByJie` once the UI distinguishes
 * "节气月" boundaries from calendar months.
 *
 * TODO(life-timeline-v2): replace calendar-month mapping with 节气-bounded
 * lunar-month resolution via `getMonthByJie`.
 *
 * Stem derivation uses 五虎遁 via the existing `monthGanZhi` helper
 * (which is what `getFourPillars` already uses for the 月柱).
 */
export function computeLiuyue(year: number): LiuyueRow[] {
  // Year stem drives the 寅月 stem via 五虎遁 — read it off the (立春-aware
  // in 单算法 terms but Gregorian-approximated in this v1) year pillar.
  const yearStem = yearGanZhi(year).stem
  const yearStemIdx = HEAVENLY_STEMS.indexOf(yearStem)
  // Calendar-month index 1..12 → `monthBranchIndex` 0..11 where 0 ≡ 寅月.
  // For now we use the same `(month + 10) % 12` mapping `getFourPillars` uses
  // (1月→丑(11), 2月→寅(0), …) — see SIMPLIFICATION above.
  const rows: LiuyueRow[] = []
  for (let month = 1; month <= 12; month++) {
    const monthBranchIdx = (month + 10) % 12
    const gz = monthGanZhi(yearStemIdx, monthBranchIdx)
    rows.push({ month, pillar: pillarFromGanZhi(gz) })
  }
  return rows
}

/**
 * Internal helper kept here (rather than re-exporting `STEM_WUXING` again)
 * so future timeline code can resolve the 日主 五行 without re-importing
 * the constants module. Not currently used by the public API but tested.
 */
export function stemElement(stem: HeavenlyStem): WuXing {
  return STEM_WUXING[stem]
}
