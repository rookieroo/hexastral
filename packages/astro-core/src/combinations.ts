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

// ========================================
// 进盘交互（流年 / 大运 vs 本命四柱）
// ========================================

/** 地支三刑对 — 寅巳申、丑戌未、子卯 (任意两两相刑). */
const BRANCH_PUNISHMENT_PAIRS: ReadonlyArray<readonly [EarthlyBranch, EarthlyBranch]> = [
  ['寅', '巳'],
  ['巳', '申'],
  ['寅', '申'],
  ['丑', '戌'],
  ['戌', '未'],
  ['丑', '未'],
  ['子', '卯'],
] as const

/** 自刑地支 — 辰辰、午午、酉酉、亥亥. */
const SELF_PUNISHMENT_BRANCHES: ReadonlySet<EarthlyBranch> = new Set(['辰', '午', '酉', '亥'])

/** 地支六害 — 子未、丑午、寅巳、卯辰、申亥、酉戌. */
const BRANCH_HARM_PAIRS: ReadonlyArray<readonly [EarthlyBranch, EarthlyBranch]> = [
  ['子', '未'],
  ['丑', '午'],
  ['寅', '巳'],
  ['卯', '辰'],
  ['申', '亥'],
  ['酉', '戌'],
] as const

/**
 * 进盘地支 vs 本命四柱的交互类型。
 *
 * - 三合局 / 三会局 / 六合：正向；
 * - 冲 / 三刑 / 六害 / 自刑：负向。
 *
 * 当进盘地支同时与本命构成多种关系时，只返回最显著的一项（详见 priority 顺序）。
 */
export type IncomingBranchInteractionKind =
  | 'sanhe-ju'
  | 'sanhui-ju'
  | 'liuhe'
  | 'chong'
  | 'sanxing'
  | 'liuhai'
  | 'zixing'

export interface IncomingBranchInteraction {
  kind: IncomingBranchInteractionKind
  /** 参与本次交互的地支（含进盘地支）。 */
  branches: EarthlyBranch[]
  /** 合化后的五行（仅 sanhe-ju / sanhui-ju / liuhe 有）。 */
  resultWuxing?: WuXing
  /** 合化状态（仅在传入 natalStems 时填充）。 */
  status?: CombinationStatus
  /** 简短描述，便于上层提取。 */
  description: string
}

/**
 * 分析「进盘地支」与本命四柱地支的最显著交互。
 *
 * 进盘地支 = 流年支 / 大运支 / 流月支 等任何外来支。本命四柱 = [年, 月, 日, 时]。
 *
 * 优先级（由强到弱）:
 *   sanhe-ju → sanhui-ju → chong → liuhe → sanxing → liuhai → zixing → null
 *
 * 说明:
 * - 三合局/三会局要求进盘支与本命中另外两支共同构成完整三支组合（半合不算）。
 * - 六合返回与本命中任一支构成六合的情况；优先匹配日支（最贴身），其次月支。
 * - 冲/三刑/六害检查进盘支与本命任一支的两两关系。
 * - 自刑仅在进盘支落在 SELF_PUNISHMENT_BRANCHES 且本命存在同支时触发。
 * - natalStems 可选，仅用于补全 `status`（合化 / 合而不化）。
 *
 * @param incoming   进盘地支
 * @param natal      本命四柱地支 [年支, 月支, 日支, 时支]
 * @param natalStems 本命四柱天干（可选，用于判断化神透干）
 * @returns 最显著交互；若无任何匹配返回 null
 */
export function analyzeBranchAgainstNatal(
  incoming: EarthlyBranch,
  natal: readonly [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch],
  natalStems?: readonly [HeavenlyStem, HeavenlyStem, HeavenlyStem, HeavenlyStem]
): IncomingBranchInteraction | null {
  const natalSet = new Set(natal)
  const transparent = (wx: WuXing): CombinationStatus | undefined => {
    if (!natalStems) return undefined
    return natalStems.some((s) => STEM_WUXING[s] === wx) ? '合化' : '合而不化'
  }

  // 1. 三合局 — incoming 与本命中另两支构成完整三合
  for (const [a, b, c, wx] of BRANCH_THREE_COMBINATION) {
    const trio: EarthlyBranch[] = [a, b, c]
    if (!trio.includes(incoming)) continue
    const others = trio.filter((x) => x !== incoming)
    if (others.every((x) => natalSet.has(x))) {
      return {
        kind: 'sanhe-ju',
        branches: [incoming, ...others],
        resultWuxing: wx,
        status: transparent(wx),
        description: `${a}${b}${c}三合${wx}局，流盘地支引动本命合局。`,
      }
    }
  }

  // 2. 三会局
  for (const [a, b, c, wx] of BRANCH_THREE_GATHERING) {
    const trio: EarthlyBranch[] = [a, b, c]
    if (!trio.includes(incoming)) continue
    const others = trio.filter((x) => x !== incoming)
    if (others.every((x) => natalSet.has(x))) {
      return {
        kind: 'sanhui-ju',
        branches: [incoming, ...others],
        resultWuxing: wx,
        status: transparent(wx),
        description: `${a}${b}${c}三会${wx}局，方局当令。`,
      }
    }
  }

  // 3. 冲 — incoming 与本命任一支六冲（"冲太岁"类）
  for (const n of natal) {
    for (const [a, b] of BRANCH_CLASH_MAP) {
      if ((incoming === a && n === b) || (incoming === b && n === a)) {
        return {
          kind: 'chong',
          branches: [incoming, n],
          description: `${incoming}${n}相冲，主变动。`,
        }
      }
    }
  }

  // 4. 六合 — 优先匹配日支，其次月支、年支、时支
  const sixHePartner = (b: EarthlyBranch): { partner: EarthlyBranch; wx: WuXing } | null => {
    for (const [x, y, wx] of BRANCH_SIX_COMBINATION) {
      if (b === x) return { partner: y, wx }
      if (b === y) return { partner: x, wx }
    }
    return null
  }
  {
    const liuhePartner = sixHePartner(incoming)
    if (liuhePartner) {
      const priority: ReadonlyArray<number> = [2, 1, 0, 3] // day, month, year, hour
      for (const idx of priority) {
        if (natal[idx] === liuhePartner.partner) {
          return {
            kind: 'liuhe',
            branches: [incoming, liuhePartner.partner],
            resultWuxing: liuhePartner.wx,
            status: transparent(liuhePartner.wx),
            description: `${incoming}${liuhePartner.partner}六合化${liuhePartner.wx}。`,
          }
        }
      }
    }
  }

  // 5. 三刑 — incoming 与本命任一支构成三刑对
  for (const n of natal) {
    for (const [a, b] of BRANCH_PUNISHMENT_PAIRS) {
      if ((incoming === a && n === b) || (incoming === b && n === a)) {
        return {
          kind: 'sanxing',
          branches: [incoming, n],
          description: `${incoming}${n}相刑，主磨擦、官非、小破财。`,
        }
      }
    }
  }

  // 6. 六害
  for (const n of natal) {
    for (const [a, b] of BRANCH_HARM_PAIRS) {
      if ((incoming === a && n === b) || (incoming === b && n === a)) {
        return {
          kind: 'liuhai',
          branches: [incoming, n],
          description: `${incoming}${n}相害，暗中消耗，宜耐心。`,
        }
      }
    }
  }

  // 7. 自刑 — incoming 是自刑地支且本命同支
  if (SELF_PUNISHMENT_BRANCHES.has(incoming) && natalSet.has(incoming)) {
    return {
      kind: 'zixing',
      branches: [incoming, incoming],
      description: `${incoming}${incoming}自刑，自找烦扰，宜放下执念。`,
    }
  }

  return null
}
