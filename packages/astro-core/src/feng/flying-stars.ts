/**
 * 玄空飞星 (Xuán Kōng Flying Stars) — V1 implementation.
 *
 * V1 supports:
 *   - 元运 lookup (1864-onwards, 20-year cycles)
 *   - 运盘 (period chart)
 *   - 山盘 / 向盘 (mountain & facing star charts) — 下卦 only
 *   - 年紫白 (annual flying stars)
 *
 * Not in V1 (deferred):
 *   - 替卦 chart for 兼向 (compound facings near palace boundaries)
 *   - 月紫白 (monthly stars)
 *   - 日 / 时紫白
 *
 * Year boundary: **立春** (≈ Feb 4). Callers that don't have a precise
 * 立春 date should pass `{ approximateLiChun: true }` and we use Feb 4 as
 * the boundary. Tests use precise dates.
 *
 * All computation is deterministic and sub-millisecond. No I/O.
 */

import type { BaguaPalace, Mountain, SanYuanDragon } from './twenty-four-mountains'
import {
  isCompoundFacing,
  LUOSHU_TO_PALACE,
  mountainAtDegree,
  normalizeDegree,
  PALACE_LUOSHU,
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
 * Determine whether a chart's center star flies 顺 or 逆.
 *
 * The rule (沈氏 standard for 下卦):
 *   1. Take the building's anchor mountain (`坐山` for 山盘, `向` for 向盘).
 *   2. Note its 三元龙 (天/人/地).
 *   3. Look at the palace where the center star "naturally sits" in 洛书 —
 *      i.e., LUOSHU_TO_PALACE[centerStar]. (For star 5 there is no such
 *      palace; see the special case below.)
 *   4. Inside that palace, pick the sub-mountain whose 三元龙 matches step 2.
 *   5. That sub-mountain's 阴阳 → 阳 means 顺, 阴 means 逆.
 *
 * Special case for star 5: 5 has no 洛书 palace, so it borrows the 阴阳 of
 * the building's anchor mountain directly.
 */
function flyDirection(centerStar: YuanYun, anchorMountain: Mountain): '顺' | '逆' {
  if (centerStar === 5) {
    return anchorMountain.yinYang === '阳' ? '顺' : '逆'
  }
  const naturalPalace = LUOSHU_TO_PALACE[centerStar as 1 | 2 | 3 | 4 | 6 | 7 | 8 | 9]
  const proxyMountain = TWENTY_FOUR_MOUNTAINS.find(
    (m) => m.palace === naturalPalace && m.dragon === anchorMountain.dragon
  )
  if (!proxyMountain) {
    // Should be unreachable — every palace contains all 3 三元龙 by construction.
    throw new Error(
      `flyDirection: no mountain in palace ${naturalPalace} with dragon ${anchorMountain.dragon}`
    )
  }
  return proxyMountain.yinYang === '阳' ? '顺' : '逆'
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
  /** True if facing is within 替卦 zone — caller should warn the user */
  isCompoundFacing: boolean
  periodChart: NineChart<YuanYun>
  mountainChart: NineChart<YuanYun>
  facingChart: NineChart<YuanYun>
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
  const mountain = mountainChart(buildYuanYun.yuanYun, sitMountain)
  const facingC = facingChart(buildYuanYun.yuanYun, faceMountain)
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
    isCompoundFacing: isCompoundFacing(facing),
    periodChart: period,
    mountainChart: mountain,
    facingChart: facingC,
    annualChart: annual,
    combined: combined as FlyingStarsResult['combined'],
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Star quality (旺衰) — what each number means in the current 元运
// ────────────────────────────────────────────────────────────────────────────

export type StarQuality = '当令' | '生气' | '退气' | '死气' | '煞气'

/**
 * Classify a star's quality relative to the current 元运. Used by the
 * synthesis prompt to label "this palace is auspicious / inauspicious".
 *
 * Standard rules (sufficient for V1):
 *   - 当令 (current): star === yuanYun
 *   - 生气 (rising):  star === yuanYun + 1
 *   - 退气 (fading):  star === yuanYun - 1
 *   - 死气 / 煞气 (dead / killing): everything else, with 5 / (yuanYun-2) flagged as 煞
 */
export function classifyStar(star: YuanYun, yuanYun: YuanYun): StarQuality {
  if (star === yuanYun) return '当令'
  if (star === wrapStar(yuanYun + 1)) return '生气'
  if (star === wrapStar(yuanYun - 1)) return '退气'
  if (star === 5 || star === wrapStar(yuanYun - 2)) return '煞气'
  return '死气'
}

/** Re-export `Mountain` and dragon type so callers only import from feng/. */
export type { BaguaPalace, Mountain, SanYuanDragon }
