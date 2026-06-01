/**
 * @zhop/astro-core — 天干合化 & 地支合化 (Stem & Branch Combinations)
 *
 * 天干五合:
 *   甲己合化土、乙庚合化金、丙辛合化水、丁壬合化木、戊癸合化火
 *
 * 地支六合:
 *   子丑合化土、寅亥合化木、卯戌合化火、辰酉合化金、巳申合化水、午未合化火（土）
 *
 * 地支三合局:
 *   申子辰合水局、亥卯未合木局、寅午戌合火局、巳酉丑合金局
 *
 * 地支三会局:
 *   亥子丑会水局、寅卯辰会木局、巳午未会火局、申酉戌会金局
 *
 * 关键校验: 合化必须满足"化神透干"条件 — 即合化后的五行必须在天干中透出，
 * 否则只是"合而不化"，仅代表牵绊、减力，不改变五行本质。
 *
 * 参考: 《子平真诠》第四章·论十干合而化之义
 */

import { BRANCH_WUXING, STEM_WUXING } from './constants'
import type { EarthlyBranch, HeavenlyStem, WuXing } from './types'

// ========================================
// 类型定义
// ========================================

/** 合化状态 */
export type CombinationStatus = '合化' | '合而不化' | '无合'

/** 天干合结果 */
export interface StemCombination {
  /** 参与合的两个天干 */
  stems: [HeavenlyStem, HeavenlyStem]
  /** 合化后的五行 */
  resultWuxing: WuXing
  /** 合化状态 */
  status: CombinationStatus
  /** 说明 */
  description: string
}

/** 地支合结果 */
export interface BranchCombination {
  /** 合的类型 */
  type: '六合' | '三合局' | '三会局'
  /** 参与合的地支 */
  branches: EarthlyBranch[]
  /** 合化后的五行 */
  resultWuxing: WuXing
  /** 合化状态 */
  status: CombinationStatus
  /** 说明 */
  description: string
}

/** 刑冲破害结果 */
export interface BranchClash {
  type: '冲' | '刑' | '害' | '破'
  branches: [EarthlyBranch, EarthlyBranch]
  description: string
}

// ========================================
// 天干五合
// ========================================

/** 天干五合映射: [干A, 干B] → 化后五行 */
const STEM_COMBINATION_MAP: ReadonlyArray<readonly [HeavenlyStem, HeavenlyStem, WuXing]> = [
  ['甲', '己', '土'],
  ['乙', '庚', '金'],
  ['丙', '辛', '水'],
  ['丁', '壬', '木'],
  ['戊', '癸', '火'],
] as const

/**
 * 查找天干合
 *
 * @param stemA 天干 A
 * @param stemB 天干 B
 * @returns 合化五行，若不合返回 null
 */
function findStemCombination(stemA: HeavenlyStem, stemB: HeavenlyStem): WuXing | null {
  for (const [a, b, wx] of STEM_COMBINATION_MAP) {
    if ((stemA === a && stemB === b) || (stemA === b && stemB === a)) {
      return wx
    }
  }
  return null
}

/**
 * 检查化神是否透干
 *
 * 合化成立的关键条件: 合化后的五行必须在四柱天干中透出
 * 例: 甲己合化土，天干中必须有戊或己透出才算真化
 *
 * @param resultWuxing 合化后的五行
 * @param allStems 四柱所有天干
 * @param excludeStems 排除参与合的天干（避免自证）
 */
function isTransformedGodTransparent(
  resultWuxing: WuXing,
  allStems: readonly HeavenlyStem[],
  excludeStems: readonly HeavenlyStem[]
): boolean {
  return allStems.some((stem) => STEM_WUXING[stem] === resultWuxing && !excludeStems.includes(stem))
}

/**
 * 分析四柱中所有天干五合关系
 *
 * 规则: 仅相邻柱位的天干可合（年-月、月-日、日-时）
 *
 * @param stems 四柱天干 [年干, 月干, 日干, 时干]
 * @returns 所有合化结果
 */
export function analyzeStemCombinations(
  stems: readonly [HeavenlyStem, HeavenlyStem, HeavenlyStem, HeavenlyStem]
): StemCombination[] {
  const results: StemCombination[] = []

  // 相邻柱位检查: 年-月(0-1), 月-日(1-2), 日-时(2-3)
  for (let i = 0; i < 3; i++) {
    const stemA = stems[i]!
    const stemB = stems[i + 1]!
    const resultWuxing = findStemCombination(stemA, stemB)

    if (resultWuxing) {
      const transparent = isTransformedGodTransparent(resultWuxing, stems, [stemA, stemB])

      results.push({
        stems: [stemA, stemB],
        resultWuxing,
        status: transparent ? '合化' : '合而不化',
        description: transparent
          ? `${stemA}${stemB}合化${resultWuxing}，化神透干，合化成立。`
          : `${stemA}${stemB}合${resultWuxing}，但化神未透，合而不化，仅作牵绊减力论。`,
      })
    }
  }

  return results
}

// ========================================
// 地支六合
// ========================================

/** 地支六合映射 */
const BRANCH_SIX_COMBINATION: ReadonlyArray<readonly [EarthlyBranch, EarthlyBranch, WuXing]> = [
  ['子', '丑', '土'],
  ['寅', '亥', '木'],
  ['卯', '戌', '火'],
  ['辰', '酉', '金'],
  ['巳', '申', '水'],
  ['午', '未', '火'],
] as const

/** 地支三合局 */
const BRANCH_THREE_COMBINATION: ReadonlyArray<
  readonly [EarthlyBranch, EarthlyBranch, EarthlyBranch, WuXing]
> = [
  ['申', '子', '辰', '水'],
  ['亥', '卯', '未', '木'],
  ['寅', '午', '戌', '火'],
  ['巳', '酉', '丑', '金'],
] as const

/** 地支三会局 */
const BRANCH_THREE_GATHERING: ReadonlyArray<
  readonly [EarthlyBranch, EarthlyBranch, EarthlyBranch, WuXing]
> = [
  ['亥', '子', '丑', '水'],
  ['寅', '卯', '辰', '木'],
  ['巳', '午', '未', '火'],
  ['申', '酉', '戌', '金'],
] as const

/**
 * 分析四柱中所有地支合化关系
 *
 * @param branches 四柱地支 [年支, 月支, 日支, 时支]
 * @param allStems 四柱天干（用于化神透干校验）
 * @returns 所有合化结果
 */
export function analyzeBranchCombinations(
  branches: readonly [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch],
  allStems: readonly [HeavenlyStem, HeavenlyStem, HeavenlyStem, HeavenlyStem]
): BranchCombination[] {
  const results: BranchCombination[] = []
  const branchSet = new Set(branches)

  // 六合检查（相邻柱位）
  for (let i = 0; i < 3; i++) {
    const branchA = branches[i]!
    const branchB = branches[i + 1]!

    for (const [a, b, wx] of BRANCH_SIX_COMBINATION) {
      if ((branchA === a && branchB === b) || (branchA === b && branchB === a)) {
        const transparent = allStems.some((s) => STEM_WUXING[s] === wx)
        results.push({
          type: '六合',
          branches: [branchA, branchB],
          resultWuxing: wx,
          status: transparent ? '合化' : '合而不化',
          description: transparent
            ? `${branchA}${branchB}六合化${wx}，化神透干，合化成立。`
            : `${branchA}${branchB}六合${wx}，化神未透，合而不化。`,
        })
      }
    }
  }

  // 三合局检查（可跨柱位）
  for (const [a, b, c, wx] of BRANCH_THREE_COMBINATION) {
    if (branchSet.has(a) && branchSet.has(b) && branchSet.has(c)) {
      const transparent = allStems.some((s) => STEM_WUXING[s] === wx)
      results.push({
        type: '三合局',
        branches: [a, b, c],
        resultWuxing: wx,
        status: transparent ? '合化' : '合而不化',
        description: transparent
          ? `${a}${b}${c}三合${wx}局，化神透干，合局成立。`
          : `${a}${b}${c}三合${wx}局，化神未透，合局减力。`,
      })
    }
  }

  // 三会局检查
  for (const [a, b, c, wx] of BRANCH_THREE_GATHERING) {
    if (branchSet.has(a) && branchSet.has(b) && branchSet.has(c)) {
      const transparent = allStems.some((s) => STEM_WUXING[s] === wx)
      results.push({
        type: '三会局',
        branches: [a, b, c],
        resultWuxing: wx,
        status: transparent ? '合化' : '合而不化',
        description: transparent
          ? `${a}${b}${c}三会${wx}局，化神透干，会局成立，${wx}势强盛。`
          : `${a}${b}${c}三会${wx}局，化神未透，会局不成。`,
      })
    }
  }

  return results
}

// ========================================
// 地支冲
// ========================================

/** 地支六冲 */
const BRANCH_CLASH_MAP: ReadonlyArray<readonly [EarthlyBranch, EarthlyBranch]> = [
  ['子', '午'],
  ['丑', '未'],
  ['寅', '申'],
  ['卯', '酉'],
  ['辰', '戌'],
  ['巳', '亥'],
] as const

/**
 * 分析四柱中的地支冲
 *
 * @param branches 四柱地支
 * @returns 所有冲的结果
 */
export function analyzeBranchClashes(
  branches: readonly [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch]
): BranchClash[] {
  const results: BranchClash[] = []

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const a = branches[i]!
      const b = branches[j]!

      for (const [clashA, clashB] of BRANCH_CLASH_MAP) {
        if ((a === clashA && b === clashB) || (a === clashB && b === clashA)) {
          results.push({
            type: '冲',
            branches: [a, b],
            description: `${a}${b}相冲（${BRANCH_WUXING[a]}克${BRANCH_WUXING[b]}），主变动、冲突。`,
          })
        }
      }
    }
  }

  return results
}

// ========================================
// 综合分析
// ========================================

/** 综合合化分析结果 */
export interface CombinationAnalysis {
  stemCombinations: StemCombination[]
  branchCombinations: BranchCombination[]
  branchClashes: BranchClash[]
}

/**
 * 综合分析四柱的所有合化冲关系
 *
 * @param stems 四柱天干 [年, 月, 日, 时]
 * @param branches 四柱地支 [年, 月, 日, 时]
 * @returns 完整的合化冲分析
 *
 * @example
 * ```ts
 * const result = analyzeCombinations(
 *   ['甲', '己', '壬', '丁'],
 *   ['子', '丑', '午', '未'],
 * )
 * // stemCombinations: [甲己合化土(化神透?), 壬丁合化木(化神透?)]
 * // branchCombinations: [子丑六合土, 午未六合火]
 * // branchClashes: [子午冲]
 * ```
 */
export function analyzeCombinations(
  stems: readonly [HeavenlyStem, HeavenlyStem, HeavenlyStem, HeavenlyStem],
  branches: readonly [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch]
): CombinationAnalysis {
  return {
    stemCombinations: analyzeStemCombinations(stems),
    branchCombinations: analyzeBranchCombinations(branches, stems),
    branchClashes: analyzeBranchClashes(branches),
  }
}
