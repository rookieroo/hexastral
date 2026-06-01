/**
 * @zhop/astro-core — 格局分析 (Ge Ju / Pattern Analysis)
 *
 * 格局是八字命理的核心判定系统，决定了整体命格的"型态"。
 *
 * 正格（八正格）：
 * - 正官格、七杀格、正财格、偏财格
 * - 正印格、偏印格、伤官格、食神格
 *
 * 从格（从势而行）：
 * - 从财格、从杀格、从儿格（从食伤）、从势格
 *
 * 专旺格（一气独旺）：
 * - 曲直格（木旺）、炎上格（火旺）、稼穑格（土旺）
 * - 从革格（金旺）、润下格（水旺）
 *
 * 杂格（特殊结构）：
 * - 建禄格、月刃格、暗禄格等
 */

import type { FourPillars, HeavenlyStem, EarthlyBranch, WuXing } from './types'
import type { FourPillarsShiShen, ShiShenCategory } from './shishen'
import { STEM_WUXING, BRANCH_WUXING, WUXING_GENERATE, WUXING_OVERCOME } from './constants'
import { countShiShen, analyzeShiShenStrength, BRANCH_HIDDEN_STEMS } from './shishen'

/** 格局类型 */
export type GeJuType =
  // 正格
  | '正官格'
  | '七杀格'
  | '正财格'
  | '偏财格'
  | '正印格'
  | '偏印格'
  | '伤官格'
  | '食神格'
  // 从格
  | '从财格'
  | '从杀格'
  | '从儿格'
  | '从势格'
  // 专旺格
  | '曲直格'
  | '炎上格'
  | '稼穑格'
  | '从革格'
  | '润下格'
  // 杂格
  | '建禄格'
  | '月刃格'
  // 无格（格局不明）
  | '普通格'

/** 格局分析结果 */
export interface GeJuAnalysis {
  /** 主格局 */
  primary: GeJuType
  /** 辅助格局 */
  secondary?: GeJuType
  /** 日主强弱 */
  dayMasterStrength: '极强' | '偏强' | '中和' | '偏弱' | '极弱'
  /** 用神推荐（五行） */
  favorableElement: WuXing
  /** 忌神（五行） */
  unfavorableElement: WuXing
  /** 格局品质 */
  quality: '上' | '中' | '下'
  /** 描述 */
  description: string
}

/** 月支→月令五行 */
const MONTH_BRANCH_SEASON: Record<EarthlyBranch, WuXing> = {
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
  子: '水',
  丑: '土',
}

/** 日主→建禄地支 */
const DAY_MASTER_JIANLU: Record<HeavenlyStem, EarthlyBranch> = {
  甲: '寅',
  乙: '卯',
  丙: '巳',
  丁: '午',
  戊: '巳',
  己: '午',
  庚: '申',
  辛: '酉',
  壬: '亥',
  癸: '子',
}

/** 日主→羊刃地支 */
const DAY_MASTER_YANGREN: Record<HeavenlyStem, EarthlyBranch> = {
  甲: '卯',
  乙: '寅',
  丙: '午',
  丁: '巳',
  戊: '午',
  己: '巳',
  庚: '酉',
  辛: '申',
  壬: '子',
  癸: '亥',
}

/**
 * 计算日主在当前八字中的强度
 *
 * 考虑因素：
 * - 月令得气（最重要）
 * - 四柱天干地支的生扶/克泄
 * - 十神比劫/印绶 vs 食伤/财星/官杀
 */
export function calculateDayMasterStrength(
  pillars: FourPillars,
  shishen: FourPillarsShiShen
): '极强' | '偏强' | '中和' | '偏弱' | '极弱' {
  const dayMaster = pillars.day.stem
  const dayWuXing = STEM_WUXING[dayMaster]
  const monthBranch = pillars.month.branch

  let score = 0

  // 1. 月令得气（权重最大）
  const monthWuXing = MONTH_BRANCH_SEASON[monthBranch]
  if (monthWuXing === dayWuXing) {
    score += 3 // 月令同类
  } else if (WUXING_GENERATE[monthWuXing] === dayWuXing) {
    score += 2 // 月令生日主
  } else if (WUXING_OVERCOME[monthWuXing] === dayWuXing) {
    score -= 2 // 月令克日主
  } else if (WUXING_GENERATE[dayWuXing] === monthWuXing) {
    score -= 1 // 日主生月令（泄气）
  }

  // 2. 月支藏干透出
  const monthHidden = BRANCH_HIDDEN_STEMS[monthBranch]
  if (monthHidden[0] && STEM_WUXING[monthHidden[0]] === dayWuXing) {
    score += 1 // 月支本气同日主
  }

  // 3. 十神统计
  const counts = countShiShen(shishen)
  const helpCount = counts.比肩 + counts.劫财 + counts.正印 + counts.偏印
  const drainCount =
    counts.食神 + counts.伤官 + counts.偏财 + counts.正财 + counts.七杀 + counts.正官

  if (helpCount > drainCount + 2) {
    score += 2
  } else if (helpCount > drainCount) {
    score += 1
  } else if (drainCount > helpCount + 2) {
    score -= 2
  } else if (drainCount > helpCount) {
    score -= 1
  }

  // 4. 日支得根
  const dayBranchWuXing = BRANCH_WUXING[pillars.day.branch]
  if (dayBranchWuXing === dayWuXing) {
    score += 1 // 日坐根
  }

  // 判定强弱
  if (score >= 4) return '极强'
  if (score >= 2) return '偏强'
  if (score >= -1) return '中和'
  if (score >= -3) return '偏弱'
  return '极弱'
}

/**
 * 判断正格格局
 *
 * 正格取用：月令透干 + 月支藏干
 */
function determineNormalGeJu(pillars: FourPillars, shishen: FourPillarsShiShen): GeJuType | null {
  const monthBranch = pillars.month.branch
  const monthHidden = BRANCH_HIDDEN_STEMS[monthBranch]

  // 月令本气透出到天干？
  const monthMainStem = monthHidden[0]
  if (!monthMainStem) return null

  // 检查月令本气是否透干（年/月/时干）
  const transparentStems = [pillars.year.stem, pillars.month.stem, pillars.hour.stem]

  // 找到透干的十神
  for (const stem of transparentStems) {
    if (STEM_WUXING[stem] === STEM_WUXING[monthMainStem]) {
      // 同五行视为透出，取其十神
      const info = shishen.month // 简化：用月干十神
      switch (info.name) {
        case '正官':
          return '正官格'
        case '七杀':
          return '七杀格'
        case '正财':
          return '正财格'
        case '偏财':
          return '偏财格'
        case '正印':
          return '正印格'
        case '偏印':
          return '偏印格'
        case '伤官':
          return '伤官格'
        case '食神':
          return '食神格'
        default:
          break
      }
    }
  }

  return null
}

/**
 * 判断建禄格 / 月刃格
 */
function checkJianLuGeJu(pillars: FourPillars): GeJuType | null {
  const dayMaster = pillars.day.stem
  const monthBranch = pillars.month.branch

  if (monthBranch === DAY_MASTER_JIANLU[dayMaster]) {
    return '建禄格'
  }

  if (monthBranch === DAY_MASTER_YANGREN[dayMaster]) {
    return '月刃格'
  }

  return null
}

/**
 * 判断专旺格（一气独旺）
 */
function checkZhuanWangGeJu(
  pillars: FourPillars,
  strength: '极强' | '偏强' | '中和' | '偏弱' | '极弱'
): GeJuType | null {
  if (strength !== '极强') return null

  const dayWuXing = STEM_WUXING[pillars.day.stem]

  // 统计五行分布
  const wuxingCount: Record<WuXing, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }

  // 天干
  wuxingCount[STEM_WUXING[pillars.year.stem]]++
  wuxingCount[STEM_WUXING[pillars.month.stem]]++
  wuxingCount[STEM_WUXING[pillars.day.stem]]++
  wuxingCount[STEM_WUXING[pillars.hour.stem]]++

  // 地支
  wuxingCount[BRANCH_WUXING[pillars.year.branch]]++
  wuxingCount[BRANCH_WUXING[pillars.month.branch]]++
  wuxingCount[BRANCH_WUXING[pillars.day.branch]]++
  wuxingCount[BRANCH_WUXING[pillars.hour.branch]]++

  const total = 8
  const dayRatio = wuxingCount[dayWuXing] / total

  if (dayRatio >= 0.5) {
    switch (dayWuXing) {
      case '木':
        return '曲直格'
      case '火':
        return '炎上格'
      case '土':
        return '稼穑格'
      case '金':
        return '从革格'
      case '水':
        return '润下格'
    }
  }

  return null
}

/**
 * 判断从格（日主极弱，从势而行）
 */
function checkCongGeJu(
  shishen: FourPillarsShiShen,
  strength: '极强' | '偏强' | '中和' | '偏弱' | '极弱'
): GeJuType | null {
  if (strength !== '极弱') return null

  const counts = countShiShen(shishen)
  const { categoryStrength } = analyzeShiShenStrength(counts)

  // 找最强的十神类别
  const entries = Object.entries(categoryStrength) as [ShiShenCategory, number][]
  const sorted = entries.sort((a, b) => b[1] - a[1])
  const [strongest] = sorted[0]!

  switch (strongest) {
    case '财星':
      return '从财格'
    case '官杀':
      return '从杀格'
    case '食伤':
      return '从儿格'
    default:
      return '从势格'
  }
}

/**
 * 推荐用神（喜用神）
 */
function recommendFavorableElement(
  pillars: FourPillars,
  strength: '极强' | '偏强' | '中和' | '偏弱' | '极弱'
): { favorable: WuXing; unfavorable: WuXing } {
  const dayWuXing = STEM_WUXING[pillars.day.stem]

  if (strength === '极强' || strength === '偏强') {
    // 日主强：喜财官食伤泄耗
    return {
      favorable: WUXING_GENERATE[dayWuXing], // 泄气（食伤）
      unfavorable: dayWuXing, // 忌同类
    }
  }

  if (strength === '极弱' || strength === '偏弱') {
    // 日主弱：喜印比生扶
    const generator = Object.entries(WUXING_GENERATE).find(
      ([, gen]) => gen === dayWuXing
    )?.[0] as WuXing
    return {
      favorable: generator ?? dayWuXing, // 生我（印）
      unfavorable: WUXING_OVERCOME[dayWuXing], // 忌克我
    }
  }

  // 中和：看具体需要，默认以官杀财为用
  return {
    favorable: WUXING_OVERCOME[dayWuXing], // 我克（财）
    unfavorable: dayWuXing, // 不宜过旺
  }
}

/**
 * 格局品质评估
 */
function evaluateQuality(geju: GeJuType, strength: string): '上' | '中' | '下' {
  // 简化评估逻辑
  const goodPatterns: GeJuType[] = ['正官格', '正财格', '正印格', '食神格']
  const specialPatterns: GeJuType[] = ['曲直格', '炎上格', '稼穑格', '从革格', '润下格']

  if (goodPatterns.includes(geju)) {
    return strength === '中和' ? '上' : '中'
  }

  if (specialPatterns.includes(geju)) {
    return '上' // 专旺格成格即为上
  }

  if (geju === '普通格') {
    return '下'
  }

  return '中'
}

/**
 * 生成格局描述
 */
function generateDescription(geju: GeJuType, strength: string, favorable: WuXing): string {
  const descriptions: Partial<Record<GeJuType, string>> = {
    正官格: '命主为人正直守信，适合在体制内发展，有领导才能。',
    七杀格: '命主魄力十足，敢于挑战，适合开创性事业。',
    正财格: '命主勤劳务实，理财有道，财运稳定持久。',
    偏财格: '命主交际广泛，偏财运好，适合商业投资。',
    正印格: '命主聪明好学，贵人运强，适合学术文化事业。',
    偏印格: '命主思维独特，善于研究，宜冷门专业领域。',
    食神格: '命主温和有才，享福多寿，艺术天赋高。',
    伤官格: '命主个性鲜明，才华横溢，宜自由职业。',
    建禄格: '命主自立自强，靠自己打拼成功。',
    月刃格: '命主意志坚定，有魄力，需注意冲动。',
    曲直格: '木气专旺，命主仁慈正直，宜文教事业。',
    炎上格: '火气专旺，命主热情开朗，宜文化传播。',
    稼穑格: '土气专旺，命主稳重厚道，宜农业房产。',
    从革格: '金气专旺，命主果断有决断力，宜金融法律。',
    润下格: '水气专旺，命主聪明灵活，宜科研技术。',
    从财格: '顺从财星，命主以财为重，商业运好。',
    从杀格: '顺从官杀，命主宜从政从军，权力运强。',
    从儿格: '顺从食伤，命主以才华立身，艺术成就高。',
    从势格: '顺从大势，命主适应力强，随遇而安。',
    普通格: '八字格局不甚明显，命运起伏中等。',
  }

  const base = descriptions[geju] ?? '格局特点待详细分析。'
  const elementAdvice = `五行喜${favorable}，事业发展宜向${favorable}相关方向。`

  return `${base}${elementAdvice}`
}

/**
 * 综合分析格局
 *
 * @param pillars 四柱
 * @param shishen 十神
 * @returns 格局分析结果
 */
export function analyzeGeJu(pillars: FourPillars, shishen: FourPillarsShiShen): GeJuAnalysis {
  // 1. 计算日主强弱
  const strength = calculateDayMasterStrength(pillars, shishen)

  // 2. 尝试各类格局判断
  let primary: GeJuType = '普通格'
  let secondary: GeJuType | undefined

  // 先检查特殊格局
  const zhuanwang = checkZhuanWangGeJu(pillars, strength)
  if (zhuanwang) {
    primary = zhuanwang
  }

  const cong = checkCongGeJu(shishen, strength)
  if (cong) {
    primary = primary === '普通格' ? cong : primary
    if (primary !== cong) secondary = cong
  }

  const jianlu = checkJianLuGeJu(pillars)
  if (jianlu) {
    primary = primary === '普通格' ? jianlu : primary
    if (primary !== jianlu) secondary = jianlu
  }

  const normal = determineNormalGeJu(pillars, shishen)
  if (normal) {
    primary = primary === '普通格' ? normal : primary
    if (primary !== normal && !secondary) secondary = normal
  }

  // 3. 推荐用神
  const { favorable, unfavorable } = recommendFavorableElement(pillars, strength)

  // 4. 评估品质
  const quality = evaluateQuality(primary, strength)

  // 5. 生成描述
  const description = generateDescription(primary, strength, favorable)

  return {
    primary,
    secondary,
    dayMasterStrength: strength,
    favorableElement: favorable,
    unfavorableElement: unfavorable,
    quality,
    description,
  }
}
