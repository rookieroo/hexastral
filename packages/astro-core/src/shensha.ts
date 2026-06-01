/**
 * @zhop/astro-core — 核心神煞引擎
 *
 * 八字命理中的「神煞」是基于天干地支组合的特殊格局标记。
 * 本模块实现最常用的 4 大神煞 + 4 个辅助神煞。
 *
 * P2 核心神煞:
 * 1. 天乙贵人 — 逢贵人相助，遇难呈祥
 * 2. 文昌贵人 — 利学业、考试、文艺
 * 3. 桃花（咸池）— 异性缘、人缘
 * 4. 驿马 — 迁动、出行、变化
 *
 * 辅助神煞:
 * 5. 华盖 — 孤高、宗教、哲学
 * 6. 将星 — 领导力
 * 7. 劫煞 — 意外、灾厄
 * 8. 亡神 — 暗耗、损失
 *
 * 查法规则:
 * - 以「日干」查天乙贵人、文昌贵人
 * - 以「日支」或「年支」查桃花、驿马、华盖、将星、劫煞、亡神
 */

import type { EarthlyBranch, FourPillars, HeavenlyStem } from './types'

// ========================================
// Types
// ========================================

/** 神煞类型 */
export type ShenShaType =
  | '天乙贵人'
  | '文昌贵人'
  | '桃花'
  | '驿马'
  | '华盖'
  | '将星'
  | '劫煞'
  | '亡神'

/** 神煞吉凶 */
export type ShenShaPolarity = '吉' | '凶' | '中'

/** 单条神煞结果 */
export interface ShenShaItem {
  /** 神煞名称 */
  name: ShenShaType
  /** 吉凶属性 */
  polarity: ShenShaPolarity
  /** 出现在哪一柱 */
  pillar: '年' | '月' | '日' | '时'
  /** 该柱的地支（触发条件） */
  branch: EarthlyBranch
  /** 简要说明 */
  description: string
}

/** 四柱神煞分析结果 */
export interface ShenShaAnalysis {
  /** 所有命中的神煞 */
  items: ShenShaItem[]
  /** 吉神数量 */
  auspiciousCount: number
  /** 凶煞数量 */
  inauspiciousCount: number
  /** 摘要（用于 AI Prompt） */
  summary: string
}

// ========================================
// 1. 天乙贵人 — 以日干查
// ========================================

/**
 * 天乙贵人口诀:
 * 甲戊庚牛羊 (丑未)
 * 乙己鼠猴乡 (子申)
 * 丙丁猪鸡位 (亥酉)
 * 壬癸兔蛇藏 (卯巳)
 * 庚辛马虎方 → 实际应为: 六辛逢马虎 (午寅)
 *
 * 修正版（广泛使用的标准版本）:
 */
const TIANYI_TABLE: Record<HeavenlyStem, EarthlyBranch[]> = {
  甲: ['丑', '未'],
  乙: ['子', '申'],
  丙: ['亥', '酉'],
  丁: ['亥', '酉'],
  戊: ['丑', '未'],
  己: ['子', '申'],
  庚: ['丑', '未'],
  辛: ['午', '寅'],
  壬: ['卯', '巳'],
  癸: ['卯', '巳'],
}

/** 查天乙贵人 */
export function getTianYiGuiRen(dayStem: HeavenlyStem): EarthlyBranch[] {
  return TIANYI_TABLE[dayStem]
}

// ========================================
// 2. 文昌贵人 — 以日干查
// ========================================

/**
 * 文昌贵人口诀:
 * 甲乙巳午报 → 甲→巳, 乙→午
 * 丙戊申宫坐 → 丙→申, 戊→申
 * 丁己酉中存 → 丁→酉, 己→酉
 * 庚猪辛鼠眠 → 庚→亥, 辛→子
 * 壬人寅上是 → 壬→寅
 * 癸向卯中求 → 癸→卯
 */
const WENCHANG_TABLE: Record<HeavenlyStem, EarthlyBranch> = {
  甲: '巳',
  乙: '午',
  丙: '申',
  丁: '酉',
  戊: '申',
  己: '酉',
  庚: '亥',
  辛: '子',
  壬: '寅',
  癸: '卯',
}

/** 查文昌贵人 */
export function getWenChangGuiRen(dayStem: HeavenlyStem): EarthlyBranch {
  return WENCHANG_TABLE[dayStem]
}

// ========================================
// 3. 桃花（咸池）— 以日支/年支查
// ========================================

/**
 * 桃花口诀（以年支或日支查四柱其余地支）:
 * 申子辰见酉
 * 寅午戌见卯
 * 亥卯未见子
 * 巳酉丑见午
 *
 * 原理: 三合局的沐浴之地
 */
const TAOHUA_TABLE: Record<EarthlyBranch, EarthlyBranch> = {
  申: '酉',
  子: '酉',
  辰: '酉',
  寅: '卯',
  午: '卯',
  戌: '卯',
  亥: '子',
  卯: '子',
  未: '子',
  巳: '午',
  酉: '午',
  丑: '午',
}

/** 查桃花地支 */
export function getTaoHua(branch: EarthlyBranch): EarthlyBranch {
  return TAOHUA_TABLE[branch]
}

// ========================================
// 4. 驿马 — 以日支/年支查
// ========================================

/**
 * 驿马口诀:
 * 申子辰马在寅
 * 寅午戌马在申
 * 亥卯未马在巳
 * 巳酉丑马在亥
 *
 * 原理: 三合局所冲之地（长生之冲）
 */
const YIMA_TABLE: Record<EarthlyBranch, EarthlyBranch> = {
  申: '寅',
  子: '寅',
  辰: '寅',
  寅: '申',
  午: '申',
  戌: '申',
  亥: '巳',
  卯: '巳',
  未: '巳',
  巳: '亥',
  酉: '亥',
  丑: '亥',
}

/** 查驿马地支 */
export function getYiMa(branch: EarthlyBranch): EarthlyBranch {
  return YIMA_TABLE[branch]
}

// ========================================
// 5. 华盖 — 以日支/年支查
// ========================================

/**
 * 华盖口诀:
 * 申子辰见辰
 * 寅午戌见戌
 * 亥卯未见未
 * 巳酉丑见丑
 *
 * 原理: 三合局的墓库
 */
const HUAGAI_TABLE: Record<EarthlyBranch, EarthlyBranch> = {
  申: '辰',
  子: '辰',
  辰: '辰',
  寅: '戌',
  午: '戌',
  戌: '戌',
  亥: '未',
  卯: '未',
  未: '未',
  巳: '丑',
  酉: '丑',
  丑: '丑',
}

/** 查华盖地支 */
export function getHuaGai(branch: EarthlyBranch): EarthlyBranch {
  return HUAGAI_TABLE[branch]
}

// ========================================
// 6. 将星 — 以日支/年支查
// ========================================

/**
 * 将星口诀:
 * 申子辰将在子
 * 寅午戌将在午
 * 亥卯未将在卯
 * 巳酉丑将在酉
 *
 * 原理: 三合局的帝旺之地
 */
const JIANGXING_TABLE: Record<EarthlyBranch, EarthlyBranch> = {
  申: '子',
  子: '子',
  辰: '子',
  寅: '午',
  午: '午',
  戌: '午',
  亥: '卯',
  卯: '卯',
  未: '卯',
  巳: '酉',
  酉: '酉',
  丑: '酉',
}

/** 查将星地支 */
export function getJiangXing(branch: EarthlyBranch): EarthlyBranch {
  return JIANGXING_TABLE[branch]
}

// ========================================
// 7. 劫煞 — 以日支/年支查
// ========================================

/**
 * 劫煞口诀:
 * 申子辰劫在巳
 * 寅午戌劫在亥
 * 亥卯未劫在申
 * 巳酉丑劫在寅
 */
const JIESHA_TABLE: Record<EarthlyBranch, EarthlyBranch> = {
  申: '巳',
  子: '巳',
  辰: '巳',
  寅: '亥',
  午: '亥',
  戌: '亥',
  亥: '申',
  卯: '申',
  未: '申',
  巳: '寅',
  酉: '寅',
  丑: '寅',
}

/** 查劫煞地支 */
export function getJieSha(branch: EarthlyBranch): EarthlyBranch {
  return JIESHA_TABLE[branch]
}

// ========================================
// 8. 亡神 — 以日支/年支查
// ========================================

/**
 * 亡神口诀:
 * 申子辰亡在亥
 * 寅午戌亡在巳
 * 亥卯未亡在寅
 * 巳酉丑亡在申
 */
const WANGSHEN_TABLE: Record<EarthlyBranch, EarthlyBranch> = {
  申: '亥',
  子: '亥',
  辰: '亥',
  寅: '巳',
  午: '巳',
  戌: '巳',
  亥: '寅',
  卯: '寅',
  未: '寅',
  巳: '申',
  酉: '申',
  丑: '申',
}

/** 查亡神地支 */
export function getWangShen(branch: EarthlyBranch): EarthlyBranch {
  return WANGSHEN_TABLE[branch]
}

// ========================================
// 综合分析
// ========================================

/** 神煞描述映射 */
const SHENSHA_DESCRIPTIONS: Record<ShenShaType, { polarity: ShenShaPolarity; desc: string }> = {
  天乙贵人: { polarity: '吉', desc: '逢凶化吉，遇难呈祥。贵人相助，人缘极佳。' },
  文昌贵人: { polarity: '吉', desc: '聪慧好学，利考试、文艺、学术。' },
  桃花: { polarity: '中', desc: '异性缘旺，人缘佳。正桃花利感情，偏桃花主风流。' },
  驿马: { polarity: '中', desc: '主迁动、出行、变化。利外出发展，不宜守旧。' },
  华盖: { polarity: '中', desc: '聪颖孤高，利宗教、哲学、艺术。命带华盖多孤独。' },
  将星: { polarity: '吉', desc: '有领导才能，权威显赫，适合掌权任事。' },
  劫煞: { polarity: '凶', desc: '主意外、灾厄、官非。需谨慎行事。' },
  亡神: { polarity: '凶', desc: '主暗耗、损失、精神困扰。宜静不宜动。' },
}

/** 柱名称 */
const PILLAR_NAMES = ['年', '月', '日', '时'] as const

/**
 * 分析四柱中所有命中的神煞
 *
 * 查法:
 * - 天乙贵人、文昌贵人: 以日干查，看四柱地支是否命中
 * - 桃花、驿马、华盖、将星、劫煞、亡神: 以日支查（优先），看四柱其余地支是否命中
 *
 * @param pillars 四柱
 * @returns 神煞分析结果
 */
export function analyzeShenSha(pillars: FourPillars): ShenShaAnalysis {
  const items: ShenShaItem[] = []
  const allBranches: Array<{ branch: EarthlyBranch; pillar: '年' | '月' | '日' | '时' }> = [
    { branch: pillars.year.branch, pillar: '年' },
    { branch: pillars.month.branch, pillar: '月' },
    { branch: pillars.day.branch, pillar: '日' },
    { branch: pillars.hour.branch, pillar: '时' },
  ]

  const dayStem = pillars.day.stem
  const dayBranch = pillars.day.branch

  // 1. 天乙贵人 (以日干查)
  const tianyiBranches = getTianYiGuiRen(dayStem)
  for (const { branch, pillar } of allBranches) {
    if (tianyiBranches.includes(branch)) {
      items.push({
        name: '天乙贵人',
        polarity: '吉',
        pillar,
        branch,
        description: SHENSHA_DESCRIPTIONS['天乙贵人'].desc,
      })
    }
  }

  // 2. 文昌贵人 (以日干查)
  const wenchangBranch = getWenChangGuiRen(dayStem)
  for (const { branch, pillar } of allBranches) {
    if (branch === wenchangBranch) {
      items.push({
        name: '文昌贵人',
        polarity: '吉',
        pillar,
        branch,
        description: SHENSHA_DESCRIPTIONS['文昌贵人'].desc,
      })
    }
  }

  // 以日支为基准查以下神煞（检查四柱其余地支是否命中）
  const branchBasedChecks: Array<{
    name: ShenShaType
    targetBranch: EarthlyBranch
    lookupFn: (b: EarthlyBranch) => EarthlyBranch
  }> = [
    { name: '桃花', targetBranch: getTaoHua(dayBranch), lookupFn: getTaoHua },
    { name: '驿马', targetBranch: getYiMa(dayBranch), lookupFn: getYiMa },
    { name: '华盖', targetBranch: getHuaGai(dayBranch), lookupFn: getHuaGai },
    { name: '将星', targetBranch: getJiangXing(dayBranch), lookupFn: getJiangXing },
    { name: '劫煞', targetBranch: getJieSha(dayBranch), lookupFn: getJieSha },
    { name: '亡神', targetBranch: getWangShen(dayBranch), lookupFn: getWangShen },
  ]

  for (const { name, targetBranch } of branchBasedChecks) {
    for (const { branch, pillar } of allBranches) {
      if (branch === targetBranch && pillar !== '日') {
        // 命中: 四柱中（除日支本身外）出现了目标地支
        const info = SHENSHA_DESCRIPTIONS[name]
        items.push({
          name,
          polarity: info.polarity,
          pillar,
          branch,
          description: info.desc,
        })
      }
    }
  }

  const auspiciousCount = items.filter((i) => i.polarity === '吉').length
  const inauspiciousCount = items.filter((i) => i.polarity === '凶').length

  // 生成摘要
  const uniqueNames = [...new Set(items.map((i) => i.name))]
  const summary =
    uniqueNames.length > 0
      ? `命带${uniqueNames.join('、')}。吉神${auspiciousCount}个，凶煞${inauspiciousCount}个。`
      : '四柱未见显著神煞。'

  return { items, auspiciousCount, inauspiciousCount, summary }
}

/**
 * 格式化神煞信息，生成 AI Prompt 上下文
 */
export function formatShenShaForPrompt(analysis: ShenShaAnalysis): string {
  if (analysis.items.length === 0) {
    return '## 神煞\n四柱未见显著神煞。'
  }

  const lines: string[] = [
    '## 神煞',
    '',
    '| 神煞 | 吉凶 | 出现柱位 | 地支 | 含义 |',
    '|---|---|---|---|---|',
  ]

  for (const item of analysis.items) {
    const polarityMark = item.polarity === '吉' ? '🟢' : item.polarity === '凶' ? '🔴' : '🟡'
    lines.push(
      `| ${item.name} | ${polarityMark} ${item.polarity} | ${item.pillar}柱 | ${item.branch} | ${item.description} |`
    )
  }

  lines.push('', analysis.summary)
  return lines.join('\n')
}
