/**
 * 玄空飞星 (Xuán Kōng Flying Stars) — V1 implementation.
 *
 * Supports:
 *   - 元运 lookup (1864-onwards, 20-year cycles)
 *   - 运盘 (period chart)
 *   - 山盘 / 向盘 (mountain & facing star charts) — 下卦 + 替卦 (兼向 起星)
 *   - 年紫白 (annual flying stars)
 *
 * Deferred:
 *   - 月紫白 (monthly stars)
 *   - 日 / 时紫白
 *
 * Year boundary: **立春** (≈ Feb 4). Callers that don't have a precise
 * 立春 date should pass `{ approximateLiChun: true }` and we use Feb 4 as
 * the boundary. Tests use precise dates.
 *
 * All computation is deterministic and sub-millisecond. No I/O.
 */

import type { BaguaPalace, Mountain, MountainName, SanYuanDragon } from './twenty-four-mountains'
import {
  isCompoundFacing,
  LUOSHU_TO_PALACE,
  mountainAtDegree,
  normalizeDegree,
  sitMountainForFacing,
  TWENTY_FOUR_MOUNTAINS,
} from './twenty-four-mountains'

// ────────────────────────────────────────────────────────────────────────────
// 元运 (Kindred-Yùn)
// ────────────────────────────────────────────────────────────────────────────

/** 1–9, the current 20-year period. */
export type YuanYun = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

/** 三元 — upper/middle/lower 60-year cycle. */
export type SanYuan = '上元' | '中元' | '下元'

export interface YuanYunInfo {
  yuanYun: YuanYun
  sanYuan: SanYuan
  /** Inclusive start year of this 元运 */
  startYear: number
  /** Inclusive end year of this 元运 */
  endYear: number
}

/**
 * Map a Gregorian year to its 元运. Boundary is 立春 (~Feb 4).
 *
 * Anchor: 1864 = 1运 (start of 上元甲子). 20-year cycles thereafter.
 * 2024 = 9运 (start of 下元 third period).
 */
export function yuanYunForYear(year: number): YuanYunInfo {
  const offset = year - 1864
  // Mod-positive, handles years before 1864 (which we don't really support
  // but the math should still work).
  const cycleIndex = ((Math.floor(offset / 20) % 9) + 9) % 9
  const yuanYun = (cycleIndex + 1) as YuanYun
  const startYear = 1864 + Math.floor(offset / 20) * 20
  const endYear = startYear + 19
  const sanYuan: SanYuan = yuanYun <= 3 ? '上元' : yuanYun <= 6 ? '中元' : '下元'
  return { yuanYun, sanYuan, startYear, endYear }
}

// ────────────────────────────────────────────────────────────────────────────
// 9-palace chart — the core data structure
// ────────────────────────────────────────────────────────────────────────────

/** A 3x3 chart of values keyed by palace. Center is '中'. */
export type NineChart<T> = Record<BaguaPalace | '中', T>

/** Helper: every palace key in render order (top→bottom, left→right). */
export const NINE_CHART_KEYS: readonly (BaguaPalace | '中')[] = [
  '巽',
  '离',
  '坤', // top row (SE, S, SW)
  '震',
  '中',
  '兑', // middle row (E, center, W)
  '艮',
  '坎',
  '乾', // bottom row (NE, N, NW)
] as const

/**
 * Wrap a star number to the 1-9 range. Values like 0 become 9, 10 becomes 1.
 *
 * In 玄空 the star numbers loop modulo 9 with **no zero** — the cycle is
 * 1,2,3,4,5,6,7,8,9,1,2,...
 */
export function wrapStar(n: number): YuanYun {
  const r = (((n - 1) % 9) + 9) % 9
  return (r + 1) as YuanYun
}

/**
 * The order in which stars visit palaces when flying. Same order regardless
 * of 顺/逆 — only the +1 vs -1 step changes.
 *
 * Order: center → 乾(NW) → 兑(W) → 艮(NE) → 离(S) → 坎(N) → 坤(SW) → 震(E) → 巽(SE) → back to center.
 */
const FLY_ORDER: readonly (BaguaPalace | '中')[] = [
  '中',
  '乾',
  '兑',
  '艮',
  '离',
  '坎',
  '坤',
  '震',
  '巽',
] as const

/**
 * Place `centerStar` at the center of the chart and fill the 8 surrounding
 * palaces by flying 顺 (+1 per step) or 逆 (-1 per step).
 */
export function fillChartFromCenter(
  centerStar: number,
  direction: '顺' | '逆'
): NineChart<YuanYun> {
  const step = direction === '顺' ? 1 : -1
  const out: Partial<NineChart<YuanYun>> = {}
  for (let i = 0; i < 9; i++) {
    out[FLY_ORDER[i] as BaguaPalace | '中'] = wrapStar(centerStar + i * step)
  }
  return out as NineChart<YuanYun>
}

// ────────────────────────────────────────────────────────────────────────────
// 运盘 (period chart)
// ────────────────────────────────────────────────────────────────────────────

/**
 * The 运盘 places the 元运 number at center and flies 顺. So 9运 → 9 at center,
 * 乾 has 1, 兑 has 2, etc.
 */
export function periodChart(yuanYun: YuanYun): NineChart<YuanYun> {
  return fillChartFromCenter(yuanYun, '顺')
}

// ────────────────────────────────────────────────────────────────────────────
// 山盘 / 向盘 (mountain & facing charts)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a chart's center: the "proxy mountain" + 顺/逆 fly direction. Shared
 * by 下卦 (period number flies) and 替卦 (the proxy's 替星 flies).
 *
 * The rule (沈氏 standard):
 *   1. Take the building's anchor mountain (`坐山` for 山盘, `向` for 向盘).
 *   2. Note its 三元龙 (天/人/地).
 *   3. Look at the palace where the center star "naturally sits" in 洛书 —
 *      i.e., LUOSHU_TO_PALACE[centerStar]. (For star 5 there is no such
 *      palace; see the special case below.)
 *   4. Inside that palace, pick the sub-mountain whose 三元龙 matches step 2 —
 *      this is the **proxy mountain**.
 *   5. The proxy's 阴阳 → 阳 means 顺, 阴 means 逆.
 *
 * Special case for star 5: 5 has no 洛书 palace, so the anchor mountain is its
 * own proxy and supplies the 阴阳 directly.
 */
function resolveCenter(
  centerStar: YuanYun,
  anchorMountain: Mountain
): { proxy: Mountain; direction: '顺' | '逆' } {
  if (centerStar === 5) {
    return { proxy: anchorMountain, direction: anchorMountain.yinYang === '阳' ? '顺' : '逆' }
  }
  const naturalPalace = LUOSHU_TO_PALACE[centerStar as 1 | 2 | 3 | 4 | 6 | 7 | 8 | 9]
  const proxy = TWENTY_FOUR_MOUNTAINS.find(
    (m) => m.palace === naturalPalace && m.dragon === anchorMountain.dragon
  )
  if (!proxy) {
    // Should be unreachable — every palace contains all 3 三元龙 by construction.
    throw new Error(
      `resolveCenter: no mountain in palace ${naturalPalace} with dragon ${anchorMountain.dragon}`
    )
  }
  return { proxy, direction: proxy.yinYang === '阳' ? '顺' : '逆' }
}

/** Back-compat thin wrapper: just the 顺/逆 direction. */
function flyDirection(centerStar: YuanYun, anchorMountain: Mountain): '顺' | '逆' {
  return resolveCenter(centerStar, anchorMountain).direction
}

// ────────────────────────────────────────────────────────────────────────────
// 替卦 (起星 / replacement-star) — for 兼向 facings near a palace boundary
// ────────────────────────────────────────────────────────────────────────────

/**
 * 沈氏玄空學 二十四山替星表 (替卦/起星).
 *
 * Each replacement star covers exactly 3 mountains, ordered by 洛书 palace
 * sequence; 五黄廉贞 has no mountains (无替). Source: 楊筠松《青囊奧語》—
 * "坤壬乙巨門… 艮丙辛破軍… 巽辰亥武曲… 甲癸申貪狼…" — expanded to all 24 by the
 * 沈氏 rule (each 替星's three 山 run 洛书-小到大). See `docs/apps/feng/fix-plan.md`.
 *
 *   1 貪狼: 子 申 甲      2 巨門: 壬 坤 乙      3 祿存: 癸 未 卯
 *   4 文曲: 巳 戌 乾      6 武曲: 辰 巽 亥      7 破軍: 辛 艮 丙
 *   8 左輔: 庚 寅 午      9 右弼: 酉 丑 丁
 *
 * Keyed by the 24 mountain names — 戊/己 are center stems, never a 山.
 */
export const REPLACEMENT_STAR: Record<Exclude<MountainName, '戊' | '己'>, YuanYun> = {
  子: 1,
  申: 1,
  甲: 1,
  壬: 2,
  坤: 2,
  乙: 2,
  癸: 3,
  未: 3,
  卯: 3,
  巳: 4,
  戌: 4,
  乾: 4,
  辰: 6,
  巽: 6,
  亥: 6,
  辛: 7,
  艮: 7,
  丙: 7,
  庚: 8,
  寅: 8,
  午: 8,
  酉: 9,
  丑: 9,
  丁: 9,
}

/**
 * The center star to fly for a 替卦 chart. Identical to the 下卦 center derivation
 * except the proxy mountain's **替星** is flown instead of the period number.
 *
 * Star 5 (五黄) has no 替星 (无替), so a center of 5 stays 5 — "用替而不能替".
 */
function replacementCenter(periodNumber: YuanYun, anchorMountain: Mountain): YuanYun {
  if (periodNumber === 5) return 5
  const { proxy } = resolveCenter(periodNumber, anchorMountain)
  // proxy always comes from TWENTY_FOUR_MOUNTAINS, so its name is never 戊/己.
  return REPLACEMENT_STAR[proxy.name as Exclude<MountainName, '戊' | '己'>]
}

/**
 * Build the 山盘 (mountain star chart).
 *
 * 1. Find the period number in the 运盘 at the building's 坐山 palace.
 * 2. Put that number at center.
 * 3. Fly 顺/逆 based on the 坐山's 三元龙 / 阴阳 rule.
 */
export function mountainChart(yuanYun: YuanYun, sitMountain: Mountain): NineChart<YuanYun> {
  const periodN = periodChart(yuanYun)[sitMountain.palace]
  const direction = flyDirection(periodN, sitMountain)
  return fillChartFromCenter(periodN, direction)
}

/**
 * Build the 向盘 (facing / water star chart). Same algorithm as the mountain
 * chart but anchored on the 向 instead of the 坐.
 */
export function facingChart(yuanYun: YuanYun, faceMountain: Mountain): NineChart<YuanYun> {
  const periodN = periodChart(yuanYun)[faceMountain.palace]
  const direction = flyDirection(periodN, faceMountain)
  return fillChartFromCenter(periodN, direction)
}

/**
 * 替卦 山盘 — for 兼向. Same as {@link mountainChart} but flies the proxy's 替星
 * (not the period number) from center. 顺/逆 is unchanged from the 下卦 chart.
 */
export function mountainChartReplaced(yuanYun: YuanYun, sitMountain: Mountain): NineChart<YuanYun> {
  const periodN = periodChart(yuanYun)[sitMountain.palace]
  const { direction } = resolveCenter(periodN, sitMountain)
  return fillChartFromCenter(replacementCenter(periodN, sitMountain), direction)
}

/** 替卦 向盘 — the 向 counterpart of {@link mountainChartReplaced}. */
export function facingChartReplaced(yuanYun: YuanYun, faceMountain: Mountain): NineChart<YuanYun> {
  const periodN = periodChart(yuanYun)[faceMountain.palace]
  const { direction } = resolveCenter(periodN, faceMountain)
  return fillChartFromCenter(replacementCenter(periodN, faceMountain), direction)
}

// ────────────────────────────────────────────────────────────────────────────
// 年紫白 (annual flying stars)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Center number of the annual flying-star chart for a Gregorian year.
 *
 * Anchor: 1864 = 1 at center. Each subsequent year the center decrements
 * by 1 (wrapping 1 → 9 → 8 → ... → 1).
 *
 * Year boundary is 立春 (~Feb 4). For dates in January or before 立春,
 * use the previous year. The `dateToFlyingYear` helper applies this.
 */
export function annualCenterStar(year: number): YuanYun {
  const c = (((1864 - year) % 9) + 9) % 9
  return (c + 1) as YuanYun
}

/**
 * Map a Gregorian date to its 飞星 year using 立春 as the boundary.
 * Approximates 立春 as Feb 4 — accurate within ~24h for years 1900-2100.
 * Real-world callers that need exact 立春 should use the existing
 * `jieqi.ts` module and pass the resolved year here.
 */
export function dateToFlyingYear(date: Date): number {
  const m = date.getMonth() // 0-indexed
  const d = date.getDate()
  if (m === 0 || (m === 1 && d < 4)) {
    return date.getFullYear() - 1
  }
  return date.getFullYear()
}

/** Build the annual chart for a Gregorian year (or use `dateToFlyingYear`). */
export function annualChart(year: number): NineChart<YuanYun> {
  return fillChartFromCenter(annualCenterStar(year), '顺')
}

// ────────────────────────────────────────────────────────────────────────────
// 月紫白 (monthly flying stars)
// ────────────────────────────────────────────────────────────────────────────

/**
 * 三元月白诀 — the 正月入中 star by the year's 地支 group:
 *   子午卯酉 年 → 正月 八白入中
 *   辰戌丑未 年 → 正月 五黄入中
 *   寅申巳亥 年 → 正月 二黑入中
 * Then each subsequent 节-month decrements the center by 1 (逆行), and within
 * each month the center star flies 顺 (like every 紫白 chart).
 *
 * `yearBranchIndex`: 0=子 … 11=亥 (立春-aligned 干支 year branch).
 * `lunarMonth`: 节-defined month, 1=正月(寅月) … 12=丑月.
 */
function monthStartCenter(yearBranchIndex: number): YuanYun {
  const b = ((yearBranchIndex % 12) + 12) % 12
  // 子0 午6 卯3 酉9 → 8 ; 辰4 戌10 丑1 未7 → 5 ; 寅2 申8 巳5 亥11 → 2
  if (b === 0 || b === 6 || b === 3 || b === 9) return 8
  if (b === 4 || b === 10 || b === 1 || b === 7) return 5
  return 2
}

/** Center star of the 月紫白 chart for a 干支-year branch + 节-month. */
export function monthlyCenterStar(yearBranchIndex: number, lunarMonth: number): YuanYun {
  const start = monthStartCenter(yearBranchIndex)
  return wrapStar(start - (lunarMonth - 1))
}

/** Build the 月紫白 chart (center decremented per month, then 顺飞). */
export function monthlyChart(yearBranchIndex: number, lunarMonth: number): NineChart<YuanYun> {
  return fillChartFromCenter(monthlyCenterStar(yearBranchIndex, lunarMonth), '顺')
}

// ────────────────────────────────────────────────────────────────────────────
// Top-level convenience — what the API + report needs in one call
// ────────────────────────────────────────────────────────────────────────────

export interface FlyingStarsInput {
  /** Facing degree, true north, in [0, 360). */
  facingDegTrue: number
  /** Build year (Gregorian). Use moveInYear as fallback per fallback ladder. */
  buildYear: number
  /** Date to compute the annual chart for. Defaults to "now". */
  asOf?: Date
}

export interface FlyingStarsResult {
  buildYuanYun: YuanYunInfo
  currentYuanYun: YuanYunInfo
  faceMountain: Mountain
  sitMountain: Mountain
  /** True if facing is within 替卦 zone (兼向). When true the effective charts
   *  below use 替卦; when false they use 下卦. */
  isCompoundFacing: boolean
  /** Which method the effective `mountainChart`/`facingChart`/`combined` use. */
  chartMethod: '下卦' | '替卦'
  periodChart: NineChart<YuanYun>
  /** Effective 山盘 (替卦 when 兼向, else 下卦). */
  mountainChart: NineChart<YuanYun>
  /** Effective 向盘 (替卦 when 兼向, else 下卦). */
  facingChart: NineChart<YuanYun>
  /** Raw 下卦 charts, always present — for transparency / "用替不能替" display. */
  mountainChartXiaGua: NineChart<YuanYun>
  facingChartXiaGua: NineChart<YuanYun>
  annualChart: NineChart<YuanYun>
  /** The 4 stars in each palace: [mountain, facing, period, annual] */
  combined: NineChart<{
    mountain: YuanYun
    facing: YuanYun
    period: YuanYun
    annual: YuanYun
  }>
}

/**
 * Top-level driver. Computes everything the report and the share card need.
 */
export function computeFlyingStars(input: FlyingStarsInput): FlyingStarsResult {
  const { facingDegTrue, buildYear, asOf = new Date() } = input
  const facing = normalizeDegree(facingDegTrue)
  const faceMountain = mountainAtDegree(facing)
  const sitMountain = sitMountainForFacing(facing)
  const buildYuanYun = yuanYunForYear(buildYear)
  const currentYuanYun = yuanYunForYear(dateToFlyingYear(asOf))
  const period = periodChart(buildYuanYun.yuanYun)

  // 兼向 → use 替卦 for the effective charts; always keep the raw 下卦 too.
  const compound = isCompoundFacing(facing)
  const mountainXiaGua = mountainChart(buildYuanYun.yuanYun, sitMountain)
  const facingXiaGua = facingChart(buildYuanYun.yuanYun, faceMountain)
  const mountain = compound
    ? mountainChartReplaced(buildYuanYun.yuanYun, sitMountain)
    : mountainXiaGua
  const facingC = compound ? facingChartReplaced(buildYuanYun.yuanYun, faceMountain) : facingXiaGua
  const annual = annualChart(dateToFlyingYear(asOf))

  const combined: Partial<FlyingStarsResult['combined']> = {}
  for (const key of NINE_CHART_KEYS) {
    combined[key] = {
      mountain: mountain[key],
      facing: facingC[key],
      period: period[key],
      annual: annual[key],
    }
  }

  return {
    buildYuanYun,
    currentYuanYun,
    faceMountain,
    sitMountain,
    isCompoundFacing: compound,
    chartMethod: compound ? '替卦' : '下卦',
    periodChart: period,
    mountainChart: mountain,
    facingChart: facingC,
    mountainChartXiaGua: mountainXiaGua,
    facingChartXiaGua: facingXiaGua,
    annualChart: annual,
    combined: combined as FlyingStarsResult['combined'],
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Star quality (旺衰) — what each number means in the current 元运
// ────────────────────────────────────────────────────────────────────────────

export type StarQuality = '当令' | '生气' | '退气' | '死气' | '煞气'

/** True when the star is 当令 or 生气 (auspicious / usable now or soon). */
export function isProsperous(star: YuanYun, yuanYun: YuanYun): boolean {
  const q = classifyStar(star, yuanYun)
  return q === '当令' || q === '生气'
}

/**
 * Classify a star's 旺衰 relative to the current 元运 (沈氏 standard):
 *   - 当令 (旺): star === yuanYun
 *   - 煞气: 五黄 (no 运, always 灾煞 when not 当令)
 *   - 生气 (进气/未来旺): star === yuanYun+1 or yuanYun+2
 *   - 退气 (刚过一运): star === yuanYun-1
 *   - 死气: everything else (过气二运以上)
 *
 * Order matters: 当令 is checked first (so 5运 的 5 is 旺, not 煞); 生气 is checked
 * before 死气 so e.g. 二黑 in 九运 reads 生气 (未来二运将旺), not 病符煞 — the
 * 病符 badness of 2 only applies when it is 失令 (退死), handled by the
 * combination table, not here.
 */
export function classifyStar(star: YuanYun, yuanYun: YuanYun): StarQuality {
  if (star === yuanYun) return '当令'
  if (star === 5) return '煞气'
  if (star === wrapStar(yuanYun + 1) || star === wrapStar(yuanYun + 2)) return '生气'
  if (star === wrapStar(yuanYun - 1)) return '退气'
  return '死气'
}

/** Re-export `Mountain` and dragon type so callers only import from feng/. */
export type { BaguaPalace, Mountain, SanYuanDragon }
