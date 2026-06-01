/**
 * 二十四山 (24 Mountains) — feng-shui orientation primitive.
 *
 * Each of the 24 mountains occupies 15° on the compass, starting with 子 山
 * centered on **true north** (0°). Going clockwise:
 *
 *   坎 (N)  : 壬子癸
 *   艮 (NE) : 丑艮寅
 *   震 (E)  : 甲卯乙
 *   巽 (SE) : 辰巽巳
 *   离 (S)  : 丙午丁
 *   坤 (SW) : 未坤申
 *   兑 (W)  : 庚酉辛
 *   乾 (NW) : 戌乾亥
 *
 * Every facing degree must be expressed in **true north**. Convert from
 * magnetic readings using `world-magnetic-model` (or backend
 * /api/feng/declination) before calling into this module.
 *
 * Used by:
 *   - 玄空飞星 (flying-stars.ts) — facing degree → 山 → 元龙 → 阴阳 → fly direction
 *   - 八宅 reports — annotated bagua sector display
 *   - Compass app — live 24山 ring overlay
 */

import type { EarthlyBranch, HeavenlyStem, YinYang } from '../types'

/** The 8 trigram palaces (八卦), in clockwise order from north. */
export type BaguaPalace = '坎' | '艮' | '震' | '巽' | '离' | '坤' | '兑' | '乾'

/** Cardinal direction shorthand. */
export type Cardinal = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'

/**
 * 三元龙 — every mountain belongs to one of three "dragon" groups.
 *
 *   - 天元 (Heaven): the 卦's central mountain (子午卯酉 + 乾坤艮巽)
 *   - 人元 (Human):  四隅支 + 乙辛丁癸 (寅申巳亥 + 乙辛丁癸)
 *   - 地元 (Earth):  四墓支 + 甲庚壬丙 (辰戌丑未 + 甲庚壬丙)
 *
 * Critical for 玄空飞星 — when placing a mountain-star at center, the
 * 三元龙 of the building's 坐山 picks which sub-mountain inside the same
 * palace determines 顺/逆 fly.
 */
export type SanYuanDragon = '天元' | '人元' | '地元'

/** Mountain name — either a heavenly stem, earthly branch, or trigram-anchor. */
export type MountainName = HeavenlyStem | EarthlyBranch | '艮' | '巽' | '坤' | '乾'

export interface Mountain {
  /** Index 0..23, starting at 子 = 0, clockwise */
  index: number
  /** Mountain name */
  name: MountainName
  /** Palace this mountain belongs to */
  palace: BaguaPalace
  /** Cardinal direction this mountain's palace falls in */
  cardinal: Cardinal
  /** 三元龙 group */
  dragon: SanYuanDragon
  /** 阴阳 (used by 玄空 for 顺/逆 fly determination) */
  yinYang: YinYang
  /** Center degree of this mountain (true north) */
  centerDeg: number
  /** Start degree of this mountain's 15° span */
  startDeg: number
  /** End degree of this mountain's 15° span */
  endDeg: number
}

/**
 * Canonical table of the 24 mountains.
 *
 * Order is clockwise from 子 (0°). Each mountain spans 15° centered on
 * its index × 15°. 子 spans [352.5°, 7.5°) — a half-step into the next
 * cycle, which the lookup function handles via modulo.
 *
 * 阴阳 follows the 沈氏玄空 standard:
 *   - 天元: 子午卯酉(阴) + 乾坤艮巽(阳)
 *   - 人元: 寅申巳亥(阳) + 乙辛丁癸(阴)
 *   - 地元: 辰戌丑未(阴) + 甲庚壬丙(阳)
 */
export const TWENTY_FOUR_MOUNTAINS: readonly Mountain[] = (() => {
  type Spec = readonly [MountainName, BaguaPalace, Cardinal, SanYuanDragon, YinYang]
  const specs: readonly Spec[] = [
    ['子', '坎', 'N', '天元', '阴'],
    ['癸', '坎', 'N', '人元', '阴'],
    ['丑', '艮', 'NE', '地元', '阴'],
    ['艮', '艮', 'NE', '天元', '阳'],
    ['寅', '艮', 'NE', '人元', '阳'],
    ['甲', '震', 'E', '地元', '阳'],
    ['卯', '震', 'E', '天元', '阴'],
    ['乙', '震', 'E', '人元', '阴'],
    ['辰', '巽', 'SE', '地元', '阴'],
    ['巽', '巽', 'SE', '天元', '阳'],
    ['巳', '巽', 'SE', '人元', '阳'],
    ['丙', '离', 'S', '地元', '阳'],
    ['午', '离', 'S', '天元', '阴'],
    ['丁', '离', 'S', '人元', '阴'],
    ['未', '坤', 'SW', '地元', '阴'],
    ['坤', '坤', 'SW', '天元', '阳'],
    ['申', '坤', 'SW', '人元', '阳'],
    ['庚', '兑', 'W', '地元', '阳'],
    ['酉', '兑', 'W', '天元', '阴'],
    ['辛', '兑', 'W', '人元', '阴'],
    ['戌', '乾', 'NW', '地元', '阴'],
    ['乾', '乾', 'NW', '天元', '阳'],
    ['亥', '乾', 'NW', '人元', '阳'],
    ['壬', '坎', 'N', '地元', '阳'],
  ] as const

  return specs.map(([name, palace, cardinal, dragon, yinYang], i) => {
    const centerDeg = (i * 15) % 360
    const startDeg = (centerDeg - 7.5 + 360) % 360
    const endDeg = (centerDeg + 7.5) % 360
    return { index: i, name, palace, cardinal, dragon, yinYang, centerDeg, startDeg, endDeg }
  })
})()

/** Normalize any degree to [0, 360). */
export function normalizeDegree(deg: number): number {
  return ((deg % 360) + 360) % 360
}

/**
 * Given a facing degree (true north), return the mountain that contains it.
 *
 * The 子 mountain wraps across 0° — degrees in [352.5°, 360°) and [0°, 7.5°)
 * both belong to 子. This function handles the wrap correctly.
 */
export function mountainAtDegree(deg: number): Mountain {
  const d = normalizeDegree(deg)
  // Index = round((d + 7.5) / 15) mod 24
  // Because mountain i centers on i*15°, the boundary at start is centerDeg - 7.5.
  const idx = Math.floor((d + 7.5) / 15) % 24
  // Type assertion safe — TWENTY_FOUR_MOUNTAINS has exactly 24 entries and idx is in [0, 24).
  return TWENTY_FOUR_MOUNTAINS[idx] as Mountain
}

/**
 * Returns the 8-palace cardinal direction for a degree. Useful when a caller
 * only needs the trigram (not the specific 山).
 */
export function palaceAtDegree(deg: number): BaguaPalace {
  return mountainAtDegree(deg).palace
}

/**
 * Each mountain's "sit" (坐) is exactly 180° opposite its "face" (向).
 * Given a facing degree, return the sit mountain.
 */
export function sitMountainForFacing(facingDeg: number): Mountain {
  return mountainAtDegree(normalizeDegree(facingDeg + 180))
}

/**
 * 替卦 zone detector. A facing degree close to a mountain's edge (within
 * ±~2.5° of the boundary) falls into the "兼向" zone where 玄空 practitioners
 * traditionally use the 替卦 chart rather than 下卦. V1 only supports 下卦
 * but warns the user when 兼向 is detected so they know the chart is
 * approximate.
 *
 * Returns `true` if degree is within `tolerance` of any mountain boundary.
 */
export function isCompoundFacing(deg: number, tolerance = 2.5): boolean {
  const d = normalizeDegree(deg)
  const offsetFromCenter = ((d % 15) + 15 + 7.5) % 15 // distance from mountain center
  const distToBoundary = Math.min(offsetFromCenter, 15 - offsetFromCenter)
  return distToBoundary < tolerance
}

/** All 8 palace centers, in degrees. Useful for rendering the bagua ring. */
export const PALACE_CENTERS: Record<BaguaPalace, number> = {
  坎: 0,
  艮: 45,
  震: 90,
  巽: 135,
  离: 180,
  坤: 225,
  兑: 270,
  乾: 315,
}

export const PALACE_TO_CARDINAL: Record<BaguaPalace, Cardinal> = {
  坎: 'N',
  艮: 'NE',
  震: 'E',
  巽: 'SE',
  离: 'S',
  坤: 'SW',
  兑: 'W',
  乾: 'NW',
}

/**
 * 洛书 — each palace has a fixed 洛书 number used in 玄空 / 紫白 calculations.
 *   1=坎(N), 2=坤(SW), 3=震(E), 4=巽(SE), 5=中宫, 6=乾(NW), 7=兑(W), 8=艮(NE), 9=离(S)
 */
export const PALACE_LUOSHU: Record<BaguaPalace, 1 | 2 | 3 | 4 | 6 | 7 | 8 | 9> = {
  坎: 1,
  坤: 2,
  震: 3,
  巽: 4,
  乾: 6,
  兑: 7,
  艮: 8,
  离: 9,
}

/** Inverse of PALACE_LUOSHU — useful for "which palace holds star N?" */
export const LUOSHU_TO_PALACE: Record<1 | 2 | 3 | 4 | 6 | 7 | 8 | 9, BaguaPalace> = {
  1: '坎',
  2: '坤',
  3: '震',
  4: '巽',
  6: '乾',
  7: '兑',
  8: '艮',
  9: '离',
}
