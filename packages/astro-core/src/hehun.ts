/**
 * @zhop/astro-core — 八字合婚引擎
 *
 * PRD v2.5 核心功能 — #1 搜索量需求 + 裂变引擎。
 *
 * 评分维度（PRD §11.6 配对评分算法）:
 * | 维度           | 权重 | 逻辑                                |
 * |---------------|------|-------------------------------------|
 * | 日主五行互补度  | 40%  | 相生 > 比和 > 相克，相生得满分        |
 * | 年支三合/六合   | 20%  | 合为正分，冲为负分                   |
 * | 月支关系       | 20%  | 合/刑/冲/害各档得分                  |
 * | 日支关系       | 20%  | 同上                                |
 *
 * 总分 0-100，映射至配对指数。
 */

import { STEM_WUXING, WUXING_GENERATE, WUXING_OVERCOME } from './constants'
import type { EarthlyBranch, FourPillars, HeavenlyStem, WuXing } from './types'

// ========================================
// Types
// ========================================

/** 五行关系类型 */
export type WuXingRelation = '相生' | '被生' | '比和' | '相克' | '被克'

/** 地支关系类型 */
export type BranchRelation = '六合' | '三合' | '比和' | '无关' | '刑' | '害' | '冲'

/** 单维度评分 */
export interface DimensionScore {
  /** 维度名称 */
  name: string
  /** 实际得分 (0-权重) */
  score: number
  /** 满分 (权重) */
  maxScore: number
  /** 关系描述 */
  relation: string
  /** 详细说明 */
  note: string
}

/** 合婚完整结果 */
export interface HeHunResult {
  /** 配对指数 (0-100) */
  score: number
  /** 等级 */
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  /** 等级中文 */
  gradeLabel: string
  /** 各维度详情 */
  dimensions: DimensionScore[]
  /** 亮点（优势） */
  highlights: string[]
  /** 注意点（隐患） */
  warnings: string[]
  /** 一句话总结 */
  summary: string
}

// ========================================
// 五行关系判定
// ========================================

/**
 * 判断两个五行之间的关系（以 A 为主视角）
 *
 * @param wuxingA 主方五行
 * @param wuxingB 对方五行
 */
export function getWuXingRelation(wuxingA: WuXing, wuxingB: WuXing): WuXingRelation {
  if (wuxingA === wuxingB) return '比和'
  if (WUXING_GENERATE[wuxingA] === wuxingB) return '相生' // A 生 B
  if (WUXING_GENERATE[wuxingB] === wuxingA) return '被生' // B 生 A
  if (WUXING_OVERCOME[wuxingA] === wuxingB) return '相克' // A 克 B
  return '被克' // B 克 A
}

// ========================================
// 地支合冲刑害
// ========================================

/** 地支六合 */
const SIX_HARMONIES: ReadonlyArray<readonly [EarthlyBranch, EarthlyBranch]> = [
  ['子', '丑'],
  ['寅', '亥'],
  ['卯', '戌'],
  ['辰', '酉'],
  ['巳', '申'],
  ['午', '未'],
] as const

/** 地支三合局（三元素）→ 任意两支出现视为半合 */
const THREE_HARMONIES: ReadonlyArray<readonly [EarthlyBranch, EarthlyBranch, EarthlyBranch]> = [
  ['申', '子', '辰'],
  ['亥', '卯', '未'],
  ['寅', '午', '戌'],
  ['巳', '酉', '丑'],
] as const

/** 地支六冲 */
const SIX_CLASHES: ReadonlyArray<readonly [EarthlyBranch, EarthlyBranch]> = [
  ['子', '午'],
  ['丑', '未'],
  ['寅', '申'],
  ['卯', '酉'],
  ['辰', '戌'],
  ['巳', '亥'],
] as const

/** 地支六害 */
const SIX_HARMS: ReadonlyArray<readonly [EarthlyBranch, EarthlyBranch]> = [
  ['子', '未'],
  ['丑', '午'],
  ['寅', '巳'],
  ['卯', '辰'],
  ['申', '亥'],
  ['酉', '戌'],
] as const

/** 地支刑（三刑 + 自刑） */
const PUNISHMENTS: ReadonlyArray<readonly [EarthlyBranch, EarthlyBranch]> = [
  // 寅巳申 无恩之刑（两两互刑）
  ['寅', '巳'],
  ['巳', '申'],
  ['寅', '申'],
  // 丑戌未 恃势之刑
  ['丑', '戌'],
  ['戌', '未'],
  ['丑', '未'],
  // 子卯 无礼之刑
  ['子', '卯'],
  // 自刑
  ['辰', '辰'],
  ['午', '午'],
  ['酉', '酉'],
  ['亥', '亥'],
] as const

/**
 * 判断两个地支的关系
 */
export function getBranchRelation(branchA: EarthlyBranch, branchB: EarthlyBranch): BranchRelation {
  if (branchA === branchB) return '比和'

  // 六合
  for (const [a, b] of SIX_HARMONIES) {
    if ((branchA === a && branchB === b) || (branchA === b && branchB === a)) {
      return '六合'
    }
  }

  // 三合（半合也算）
  for (const [a, b, c] of THREE_HARMONIES) {
    const pair = [branchA, branchB]
    if (
      (pair.includes(a) && pair.includes(b)) ||
      (pair.includes(b) && pair.includes(c)) ||
      (pair.includes(a) && pair.includes(c))
    ) {
      return '三合'
    }
  }

  // 冲
  for (const [a, b] of SIX_CLASHES) {
    if ((branchA === a && branchB === b) || (branchA === b && branchB === a)) {
      return '冲'
    }
  }

  // 害
  for (const [a, b] of SIX_HARMS) {
    if ((branchA === a && branchB === b) || (branchA === b && branchB === a)) {
      return '害'
    }
  }

  // 刑
  for (const [a, b] of PUNISHMENTS) {
    if ((branchA === a && branchB === b) || (branchA === b && branchB === a)) {
      return '刑'
    }
  }

  return '无关'
}

// ========================================
// 评分系统
// ========================================

/**
 * 日主五行互补度评分 (满分 40)
 *
 * 评分标准:
 * - 相生/被生: 40 (最佳互补)
 * - 比和: 30 (心意相通)
 * - 相克: 15 (压制，但有时为互补)
 * - 被克: 10 (受制)
 */
function scoreDayMaster(stemA: HeavenlyStem, stemB: HeavenlyStem): DimensionScore {
  const wxA = STEM_WUXING[stemA]
  const wxB = STEM_WUXING[stemB]
  const relation = getWuXingRelation(wxA, wxB)

  const SCORE_MAP: Record<WuXingRelation, number> = {
    相生: 40,
    被生: 36,
    比和: 30,
    相克: 15,
    被克: 10,
  }

  const NOTE_MAP: Record<WuXingRelation, string> = {
    相生: `${stemA}(${wxA})生${stemB}(${wxB})，你滋养对方，关系流畅融洽。`,
    被生: `${stemB}(${wxB})生${stemA}(${wxA})，对方滋养你，被呵护之感。`,
    比和: `${stemA}(${wxA})与${stemB}(${wxB})同属${wxA}，心意相通，志趣相投。`,
    相克: `${stemA}(${wxA})克${stemB}(${wxB})，你对对方有约束力，需包容。`,
    被克: `${stemB}(${wxB})克${stemA}(${wxA})，对方对你有压制感，需沟通。`,
  }

  return {
    name: '日主五行互补',
    score: SCORE_MAP[relation],
    maxScore: 40,
    relation,
    note: NOTE_MAP[relation],
  }
}

/**
 * 地支关系评分（通用，满分由参数决定）
 *
 * 评分标准:
 * - 六合: 满分
 * - 三合: 满分 × 0.8
 * - 比和: 满分 × 0.6
 * - 无关: 满分 × 0.5
 * - 刑: 满分 × 0.25
 * - 害: 满分 × 0.15
 * - 冲: 0
 */
function scoreBranchRelation(
  branchA: EarthlyBranch,
  branchB: EarthlyBranch,
  dimensionName: string,
  maxScore: number
): DimensionScore {
  const relation = getBranchRelation(branchA, branchB)

  const RATIO_MAP: Record<BranchRelation, number> = {
    六合: 1.0,
    三合: 0.8,
    比和: 0.6,
    无关: 0.5,
    刑: 0.25,
    害: 0.15,
    冲: 0,
  }

  const RELATION_NOTES: Record<BranchRelation, string> = {
    六合: `${branchA}${branchB}六合，默契天成，相处融洽。`,
    三合: `${branchA}${branchB}属三合局，和谐共生，有共同目标。`,
    比和: `${branchA}${branchB}相同，性格相似，容易理解彼此。`,
    无关: `${branchA}与${branchB}无特殊关系，各自独立。`,
    刑: `${branchA}${branchB}相刑，在此领域可能存在摩擦，但可通过理解化解。`,
    害: `${branchA}${branchB}相害，暗中消耗，需要更多耐心。`,
    冲: `${branchA}${branchB}相冲，在此领域节奏差异大，是挑战也是互补契机。`,
  }

  const score = Math.round(maxScore * RATIO_MAP[relation])

  return {
    name: dimensionName,
    score,
    maxScore,
    relation,
    note: RELATION_NOTES[relation],
  }
}

// ========================================
// Grade & Highlights
// ========================================

function getGrade(score: number): { grade: HeHunResult['grade']; label: string } {
  if (score >= 90) return { grade: 'S', label: '天作之合' }
  if (score >= 75) return { grade: 'A', label: '非常般配' }
  if (score >= 60) return { grade: 'B', label: '良Kindred佳配' }
  if (score >= 45) return { grade: 'C', label: '有Kindred需修' }
  return { grade: 'D', label: '磨合考验' }
}

function generateHighlightsAndWarnings(dimensions: DimensionScore[]): {
  highlights: string[]
  warnings: string[]
} {
  const highlights: string[] = []
  const warnings: string[] = []

  for (const dim of dimensions) {
    const ratio = dim.score / dim.maxScore
    if (ratio >= 0.8) {
      highlights.push(`${dim.name}：${dim.relation}（${dim.note.split('，')[0]}）`)
    } else if (ratio <= 0.25) {
      warnings.push(`${dim.name}：${dim.relation}（${dim.note.split('，')[0]}）`)
    }
  }

  return { highlights, warnings }
}

// ========================================
// Core: 合婚计算
// ========================================

/**
 * 八字合婚评分
 *
 * 以双方四柱进行四维度评分，输出 0-100 配对指数。
 *
 * @param pillarsA 甲方四柱
 * @param pillarsB 乙方四柱
 * @returns 合婚结果
 *
 * @example
 * ```typescript
 * const personA = getFourPillars({ year: 1990, month: 3, day: 15, hour: 14 })
 * const personB = getFourPillars({ year: 1992, month: 8, day: 20, hour: 10 })
 * const result = calculateHeHun(personA, personB)
 * // result.score === 87
 * // result.grade === 'A'
 * // result.gradeLabel === '非常般配'
 * ```
 */
export function calculateHeHun(pillarsA: FourPillars, pillarsB: FourPillars): HeHunResult {
  const dimensions: DimensionScore[] = []

  // 1. 日主五行互补 (40%)
  const dayMasterScore = scoreDayMaster(pillarsA.day.stem, pillarsB.day.stem)
  dimensions.push(dayMasterScore)

  // 2. 年支关系 (20%)
  const yearScore = scoreBranchRelation(
    pillarsA.year.branch,
    pillarsB.year.branch,
    '年支Kindred分',
    20
  )
  dimensions.push(yearScore)

  // 3. 月支关系 (20%)
  const monthScore = scoreBranchRelation(
    pillarsA.month.branch,
    pillarsB.month.branch,
    '月支生活',
    20
  )
  dimensions.push(monthScore)

  // 4. 日支关系 (20%)
  const dayScore = scoreBranchRelation(pillarsA.day.branch, pillarsB.day.branch, '日支亲密', 20)
  dimensions.push(dayScore)

  const totalScore = dimensions.reduce((sum, d) => sum + d.score, 0)
  const { grade, label } = getGrade(totalScore)
  const { highlights, warnings } = generateHighlightsAndWarnings(dimensions)

  const summary = generateSummary(totalScore, grade, highlights, warnings)

  return {
    score: totalScore,
    grade,
    gradeLabel: label,
    dimensions,
    highlights,
    warnings,
    summary,
  }
}

function generateSummary(
  score: number,
  grade: HeHunResult['grade'],
  highlights: string[],
  warnings: string[]
): string {
  const base = `配对指数 ${score}/100（${grade}级）。`

  if (highlights.length > 0 && warnings.length === 0) {
    return `${base}多维度高度契合，是令人羡慕的好Kindred分。`
  }
  if (highlights.length > 0 && warnings.length > 0) {
    return `${base}整体相合，但有${warnings.length}个领域需要双方共同经营。`
  }
  if (highlights.length === 0 && warnings.length > 0) {
    return `${base}关系中挑战较多，但考验本身也是成长契机。`
  }
  return `${base}中规中矩，稳定平和的组合。`
}

/**
 * 格式化合婚结果为 AI Prompt 上下文
 */
export function formatHeHunForPrompt(result: HeHunResult): string {
  const lines: string[] = [
    '## 八字合婚分析',
    '',
    `配对指数：${result.score}/100（${result.gradeLabel}）`,
    '',
    '### 四维评分',
    '| 维度 | 得分 | 关系 | 说明 |',
    '|---|---|---|---|',
  ]

  for (const dim of result.dimensions) {
    lines.push(`| ${dim.name} | ${dim.score}/${dim.maxScore} | ${dim.relation} | ${dim.note} |`)
  }

  if (result.highlights.length > 0) {
    lines.push('', '### 亮点')
    for (const h of result.highlights) {
      lines.push(`- ✦ ${h}`)
    }
  }

  if (result.warnings.length > 0) {
    lines.push('', '### 注意')
    for (const w of result.warnings) {
      lines.push(`- ⚡ ${w}`)
    }
  }

  lines.push('', `**总评**：${result.summary}`)
  return lines.join('\n')
}
