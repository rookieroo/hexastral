/**
 * @zhop/astro-core — 十神 (Ten Gods / Shi Shen)
 *
 * 十神是八字命理的核心概念，描述日主（日柱天干）与其他天干的五行生克关系。
 *
 * 十神体系：
 * - 比肩 (Bǐ Jiān): 同我，同阴阳 → 兄弟、同辈
 * - 劫财 (Jié Cái): 同我，异阴阳 → 竞争、冲动
 * - 食神 (Shí Shén): 我生，同阴阳 → 才华、口福
 * - 伤官 (Shāng Guān): 我生，异阴阳 → 叛逆、艺术
 * - 偏财 (Piān Cái): 我克，同阴阳 → 横财、父亲
 * - 正财 (Zhèng Cái): 我克，异阴阳 → 正财、妻子
 * - 七杀 (Qī Shā): 克我，同阴阳 → 压力、魄力
 * - 正官 (Zhèng Guān): 克我，异阴阳 → 权威、丈夫
 * - 偏印 (Piān Yìn): 生我，同阴阳 → 偏学、继母
 * - 正印 (Zhèng Yìn): 生我，异阴阳 → 学问、母亲
 */

import { STEM_WUXING, STEM_YINYANG, WUXING_GENERATE, WUXING_OVERCOME } from './constants'
import type { EarthlyBranch, FourPillars, HeavenlyStem, WuXing, YinYang } from './types'

/** 十神类型 */
export type ShiShen =
  | '比肩'
  | '劫财' // 同我
  | '食神'
  | '伤官' // 我生
  | '偏财'
  | '正财' // 我克
  | '七杀'
  | '正官' // 克我
  | '偏印'
  | '正印' // 生我

/** 十神分类 */
export type ShiShenCategory =
  | '比劫' // 比肩 + 劫财
  | '食伤' // 食神 + 伤官
  | '财星' // 偏财 + 正财
  | '官杀' // 七杀 + 正官
  | '印绶' // 偏印 + 正印

/** 十神信息 */
export interface ShiShenInfo {
  /** 十神名称 */
  name: ShiShen
  /** 十神分类 */
  category: ShiShenCategory
  /** 简称 */
  abbr: string
  /** 五行关系 */
  relation: '同我' | '我生' | '我克' | '克我' | '生我'
  /** 阴阳关系 */
  yinYangMatch: boolean
}

/** 十神简称映射表 */
const SHISHEN_ABBR: Record<ShiShen, string> = {
  比肩: '比',
  劫财: '劫',
  食神: '食',
  伤官: '伤',
  偏财: '财',
  正财: '才',
  七杀: '杀',
  正官: '官',
  偏印: '枭',
  正印: '印',
}

/** 十神分类映射 */
const SHISHEN_CATEGORY: Record<ShiShen, ShiShenCategory> = {
  比肩: '比劫',
  劫财: '比劫',
  食神: '食伤',
  伤官: '食伤',
  偏财: '财星',
  正财: '财星',
  七杀: '官杀',
  正官: '官杀',
  偏印: '印绶',
  正印: '印绶',
}

/** 地支藏干表（本气、中气、余气） */
export const BRANCH_HIDDEN_STEMS: Record<EarthlyBranch, readonly HeavenlyStem[]> = {
  子: ['癸'],
  丑: ['己', '癸', '辛'],
  寅: ['甲', '丙', '戊'],
  卯: ['乙'],
  辰: ['戊', '乙', '癸'],
  巳: ['丙', '戊', '庚'],
  午: ['丁', '己'],
  未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'],
  酉: ['辛'],
  戌: ['戊', '辛', '丁'],
  亥: ['壬', '甲'],
}

/**
 * 计算两个天干之间的十神关系
 *
 * @param dayMaster 日主（日柱天干）
 * @param target 目标天干
 * @returns 十神信息
 */
export function getShiShen(dayMaster: HeavenlyStem, target: HeavenlyStem): ShiShenInfo {
  const myWuXing = STEM_WUXING[dayMaster]
  const myYinYang = STEM_YINYANG[dayMaster]
  const targetWuXing = STEM_WUXING[target]
  const targetYinYang = STEM_YINYANG[target]

  const sameYinYang = myYinYang === targetYinYang
  let relation: '同我' | '我生' | '我克' | '克我' | '生我'
  let name: ShiShen

  if (myWuXing === targetWuXing) {
    // 同我（比劫）
    relation = '同我'
    name = sameYinYang ? '比肩' : '劫财'
  } else if (WUXING_GENERATE[myWuXing] === targetWuXing) {
    // 我生（食伤）
    relation = '我生'
    name = sameYinYang ? '食神' : '伤官'
  } else if (WUXING_OVERCOME[myWuXing] === targetWuXing) {
    // 我克（财星）
    relation = '我克'
    name = sameYinYang ? '偏财' : '正财'
  } else if (WUXING_OVERCOME[targetWuXing] === myWuXing) {
    // 克我（官杀）
    relation = '克我'
    name = sameYinYang ? '七杀' : '正官'
  } else {
    // 生我（印绶）
    relation = '生我'
    name = sameYinYang ? '偏印' : '正印'
  }

  return {
    name,
    category: SHISHEN_CATEGORY[name],
    abbr: SHISHEN_ABBR[name],
    relation,
    yinYangMatch: sameYinYang,
  }
}

/** 四柱十神结果 */
export interface FourPillarsShiShen {
  /** 年柱十神 */
  year: ShiShenInfo
  /** 月柱十神 */
  month: ShiShenInfo
  /** 时柱十神 */
  hour: ShiShenInfo
  /** 年支藏干十神 */
  yearBranchHidden: ShiShenInfo[]
  /** 月支藏干十神 */
  monthBranchHidden: ShiShenInfo[]
  /** 日支藏干十神 */
  dayBranchHidden: ShiShenInfo[]
  /** 时支藏干十神 */
  hourBranchHidden: ShiShenInfo[]
}

/**
 * 计算四柱的十神
 *
 * 日柱天干（日主）与其他三柱天干的十神关系，
 * 以及四柱地支藏干的十神关系。
 *
 * @param pillars 四柱
 * @returns 四柱十神
 */
export function getFourPillarsShiShen(pillars: FourPillars): FourPillarsShiShen {
  const dayMaster = pillars.day.stem

  // 天干十神（日柱自己是"日主"，不算十神）
  const year = getShiShen(dayMaster, pillars.year.stem)
  const month = getShiShen(dayMaster, pillars.month.stem)
  const hour = getShiShen(dayMaster, pillars.hour.stem)

  // 地支藏干十神
  const getHiddenShiShen = (branch: EarthlyBranch): ShiShenInfo[] => {
    const hiddenStems = BRANCH_HIDDEN_STEMS[branch]
    return hiddenStems.map((stem) => getShiShen(dayMaster, stem))
  }

  return {
    year,
    month,
    hour,
    yearBranchHidden: getHiddenShiShen(pillars.year.branch),
    monthBranchHidden: getHiddenShiShen(pillars.month.branch),
    dayBranchHidden: getHiddenShiShen(pillars.day.branch),
    hourBranchHidden: getHiddenShiShen(pillars.hour.branch),
  }
}

/**
 * 藏干权重 — 本气/中气/余气
 *
 * 地支所藏天干按力量大小赋权：
 * - 本气（第一位）: 0.6 — 当令之气，主导力量
 * - 中气（第二位）: 0.2 — 余气或暗藏
 * - 余气（第三位）: 0.1 — 最弱的暗藏
 *
 * 注：单藏干地支（子/卯/酉）本气取 1.0 以保证总权重合理
 */
const HIDDEN_STEM_WEIGHTS: readonly number[] = [0.6, 0.2, 0.1]

/**
 * 统计十神数量（加权）
 *
 * 天干十神权重 = 1.0
 * 地支藏干按 本气(0.6)/中气(0.2)/余气(0.1) 加权
 *
 * @param shishen 四柱十神
 * @returns 每个十神的加权出现次数
 */
export function countShiShen(shishen: FourPillarsShiShen): Record<ShiShen, number> {
  const counts: Record<ShiShen, number> = {
    比肩: 0,
    劫财: 0,
    食神: 0,
    伤官: 0,
    偏财: 0,
    正财: 0,
    七杀: 0,
    正官: 0,
    偏印: 0,
    正印: 0,
  }

  // 天干（权重 1.0）
  counts[shishen.year.name] += 1
  counts[shishen.month.name] += 1
  counts[shishen.hour.name] += 1

  // 地支藏干（本气 0.6 / 中气 0.2 / 余气 0.1）
  const addHidden = (hidden: ShiShenInfo[]) => {
    hidden.forEach((s, i) => {
      const weight = hidden.length === 1 ? 1.0 : (HIDDEN_STEM_WEIGHTS[i] ?? 0.1)
      counts[s.name] += weight
    })
  }
  addHidden(shishen.yearBranchHidden)
  addHidden(shishen.monthBranchHidden)
  addHidden(shishen.dayBranchHidden)
  addHidden(shishen.hourBranchHidden)

  return counts
}

/**
 * 分析十神强弱
 *
 * @param counts 十神统计
 * @returns 各类十神的强度评估
 */
export function analyzeShiShenStrength(counts: Record<ShiShen, number>): {
  strongest: ShiShenCategory
  weakest: ShiShenCategory
  categoryStrength: Record<ShiShenCategory, number>
} {
  const categoryStrength: Record<ShiShenCategory, number> = {
    比劫: counts.比肩 + counts.劫财,
    食伤: counts.食神 + counts.伤官,
    财星: counts.偏财 + counts.正财,
    官杀: counts.七杀 + counts.正官,
    印绶: counts.偏印 + counts.正印,
  }

  const entries = Object.entries(categoryStrength) as [ShiShenCategory, number][]
  const sorted = entries.sort((a, b) => b[1] - a[1])

  return {
    strongest: sorted[0]![0],
    weakest: sorted[sorted.length - 1]![0],
    categoryStrength,
  }
}
