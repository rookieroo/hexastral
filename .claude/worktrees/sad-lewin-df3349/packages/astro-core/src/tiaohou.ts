/**
 * @zhop/astro-core — 调候用神 (Climate Adjustment Gods)
 *
 * 调候是八字取用神的核心方法之一：
 * - 冬月（亥子丑）寒冷，优先用火（丙丁）暖局
 * - 夏月（巳午未）炎热，优先用水（壬癸）润局
 * - 春秋月令温和，根据日主五行灵活取用
 *
 * 基于《子平真诠》《穷通宝鉴》体系，建立日主×月支的 10×12 静态映射二维矩阵。
 *
 * 矩阵说明:
 * - 行 = 日主天干（甲乙丙丁戊己庚辛壬癸）
 * - 列 = 月支（子丑寅卯辰巳午未申酉戌亥）
 * - 值 = 调候用神天干（优先级从左到右递减）
 *
 * 参考: 《穷通宝鉴》各月用神提要
 */

import type { EarthlyBranch, HeavenlyStem, WuXing } from './types'
import { STEM_WUXING } from './constants'

/** 调候用神结果 */
export interface TiaohouResult {
  /** 日主天干 */
  dayMaster: HeavenlyStem
  /** 月支 */
  monthBranch: EarthlyBranch
  /** 调候用神优先级列表（从高到低） */
  gods: readonly HeavenlyStem[]
  /** 调候类型 */
  type: '暖局' | '润局' | '通关' | '扶抑'
  /** 调候说明 */
  description: string
}

/**
 * 调候用神二维矩阵
 *
 * 键: `${HeavenlyStem}` → 值: 按月支顺序（子丑寅卯辰巳午未申酉戌亥）的用神数组
 * 每个元素是该月份的调候用神天干列表（按优先级排序）
 *
 * 来源: 《穷通宝鉴》各月各日主用神提要
 */
const TIAOHOU_MATRIX: Record<HeavenlyStem, readonly (readonly HeavenlyStem[])[]> = {
  // 甲木
  甲: [
    ['丁', '庚'], // 子月: 寒木向阳，先取丁火，次用庚金劈甲引丁
    ['丁', '庚'], // 丑月: 寒冻之极，仍取丁火暖局，庚金佐之
    ['丙', '癸'], // 寅月: 初春木旺，用丙火泄秀，癸水润土
    ['庚', '丙', '丁'], // 卯月: 木旺极，先用庚金修剪，丙丁暖局
    ['壬', '庚'], // 辰月: 土旺木折，用壬水滋养，庚金疏土
    ['癸', '丁'], // 巳月: 火旺木焚，优先癸水救护，丁火留存
    ['癸', '丁'], // 午月: 火旺极，先取癸水润局
    ['癸', '丁'], // 未月: 土燥木枯，癸水润之
    ['庚', '丁'], // 申月: 金旺克木，用丁火制金
    ['庚', '丁', '壬'], // 酉月: 金旺极，丁火制之，壬水化金生木
    ['庚', '甲', '壬'], // 戌月: 土旺木弱，庚甲劈土，壬水滋养
    ['庚', '丁'], // 亥月: 水旺木浮，庚金劈甲，丁火暖局
  ],

  // 乙木
  乙: [
    ['丙', '戊'], // 子月: 寒木需阳光，丙火暖局，戊土培根
    ['丙', '戊'], // 丑月: 寒冻极，丙火为先
    ['丙', '癸'], // 寅月: 木旺用丙泄秀，癸水润土
    ['丙', '癸'], // 卯月: 木旺极，丙火泄秀
    ['癸', '丙'], // 辰月: 土旺需癸水滋养
    ['癸', '丙'], // 巳月: 火旺木焚，癸水救护
    ['癸', '丙'], // 午月: 火旺极，癸水为先
    ['癸', '丙'], // 未月: 土燥用癸水
    ['丙', '癸'], // 申月: 金旺克木，用丙火佐之
    ['丙', '癸'], // 酉月: 金旺，丙火制金
    ['丙', '戊'], // 戌月: 土旺培根，丙火暖之
    ['丙', '戊'], // 亥月: 水旺木浮，丙火暖局
  ],

  // 丙火
  丙: [
    ['壬', '甲'], // 子月: 水旺克火，用甲木化水生火
    ['壬', '甲'], // 丑月: 寒土晦火，壬水辉映，甲木生火
    ['壬', '庚'], // 寅月: 木旺火相，壬水制之
    ['壬', '己'], // 卯月: 木旺火旺，壬水调和
    ['壬', '甲'], // 辰月: 土旺晦火，壬水辉映
    ['壬', '庚'], // 巳月: 火旺需壬水制之
    ['壬', '庚'], // 午月: 火旺极，壬水制之
    ['壬', '庚'], // 未月: 土燥火炎，壬水润之
    ['壬', '甲'], // 申月: 金旺泄火，壬水辉映
    ['壬', '甲'], // 酉月: 金旺极，甲木生火
    ['甲', '壬'], // 戌月: 土旺晦火，甲木疏土生火
    ['甲', '壬'], // 亥月: 水旺克火，甲木化水生火
  ],

  // 丁火
  丁: [
    ['甲', '庚'], // 子月: 水旺克火，甲木生火为先
    ['甲', '庚'], // 丑月: 寒土晦火，甲木生火
    ['甲', '庚'], // 寅月: 甲木引丁，庚金劈甲助丁
    ['甲', '庚'], // 卯月: 甲木生火
    ['甲', '壬'], // 辰月: 土旺用甲木疏土
    ['甲', '壬'], // 巳月: 火旺需壬水制之
    ['甲', '壬'], // 午月: 火旺极，壬水制之
    ['甲', '壬'], // 未月: 土燥，壬水润之
    ['甲', '庚'], // 申月: 金旺，甲庚配合
    ['甲', '庚'], // 酉月: 金旺克木，庚劈甲引丁
    ['甲', '庚'], // 戌月: 土旺，甲木疏之
    ['甲', '庚'], // 亥月: 水旺，甲木化水生火
  ],

  // 戊土
  戊: [
    ['丙', '甲'], // 子月: 寒土需丙火暖局，甲木疏土
    ['丙', '甲'], // 丑月: 寒土极，丙火为先
    ['丙', '甲', '癸'], // 寅月: 木旺克土，丙火通关，癸水润之
    ['丙', '甲', '癸'], // 卯月: 木旺极，丙火通关
    ['丙', '甲', '癸'], // 辰月: 比劫旺，甲木疏土
    ['丙', '甲', '癸'], // 巳月: 火旺土燥，癸水润之
    ['壬', '甲', '丙'], // 午月: 火旺极，壬水为先
    ['癸', '丙', '甲'], // 未月: 土旺燥，癸水润之
    ['丙', '癸'], // 申月: 金旺泄土，丙火暖之
    ['丙', '癸'], // 酉月: 金旺极，丙火制金暖土
    ['甲', '丙', '癸'], // 戌月: 土旺极，甲木疏之
    ['丙', '甲'], // 亥月: 水旺，丙火暖局
  ],

  // 己土
  己: [
    ['丙', '甲'], // 子月: 寒湿之土，丙火暖局
    ['丙', '甲'], // 丑月: 寒冻极，丙火为先
    ['丙', '癸'], // 寅月: 木旺克土，丙火通关
    ['丙', '甲', '癸'], // 卯月: 木旺极
    ['丙', '癸'], // 辰月: 湿土，丙火暖之
    ['癸', '丙'], // 巳月: 火旺土燥，癸水润之
    ['癸', '丙'], // 午月: 火旺极，癸水为先
    ['癸', '丙'], // 未月: 土旺燥，癸水润之
    ['丙', '癸'], // 申月: 金旺泄土
    ['丙', '癸'], // 酉月: 金旺极
    ['甲', '丙'], // 戌月: 土旺，甲木疏之
    ['丙', '甲'], // 亥月: 水旺寒土，丙火为先
  ],

  // 庚金
  庚: [
    ['丁', '甲'], // 子月: 寒金需丁火锻炼
    ['丁', '甲'], // 丑月: 寒金极，丁火为先
    ['丁', '甲', '壬'], // 寅月: 木旺，丁火炼金
    ['丁', '壬'], // 卯月: 木旺克金，丁壬配合
    ['壬', '丁', '甲'], // 辰月: 土旺埋金，壬水洗之
    ['壬', '丁'], // 巳月: 火旺克金，壬水制火
    ['壬', '癸'], // 午月: 火旺极，壬癸救护
    ['壬', '丁'], // 未月: 土燥埋金，壬水洗之
    ['丁', '甲'], // 申月: 金旺，丁火炼之
    ['丁', '甲', '壬'], // 酉月: 金旺极，丁火为先
    ['壬', '丁'], // 戌月: 土旺埋金，壬水洗之
    ['丁', '甲'], // 亥月: 水旺泄金，丁火暖之
  ],

  // 辛金
  辛: [
    ['壬', '丙'], // 子月: 寒金，壬水洗淘，丙火暖局
    ['壬', '丙'], // 丑月: 寒土埋金，壬水洗之
    ['壬', '甲'], // 寅月: 木旺，壬水通关
    ['壬', '甲'], // 卯月: 木旺极
    ['壬', '甲'], // 辰月: 湿土，壬水洗之
    ['壬', '癸', '甲'], // 巳月: 火旺，壬癸制之
    ['壬', '癸'], // 午月: 火旺极，壬癸优先
    ['壬', '癸'], // 未月: 土燥，壬水润之
    ['壬', '丙'], // 申月: 金旺，壬水泄秀
    ['壬', '丙'], // 酉月: 金旺极，壬水洗之
    ['壬', '丙'], // 戌月: 土旺埋金，壬水为先
    ['壬', '丙'], // 亥月: 水旺，丙火暖之
  ],

  // 壬水
  壬: [
    ['戊', '丙'], // 子月: 水旺极，戊土制之，丙火暖局
    ['丙', '甲'], // 丑月: 寒冻，丙火暖局
    ['庚', '壬'], // 寅月: 木旺泄水，庚金生水
    ['戊', '辛'], // 卯月: 木旺极泄水，戊土制之
    ['甲', '庚'], // 辰月: 土旺克水，甲木疏土
    ['壬', '辛', '甲'], // 巳月: 火旺蒸水，壬水为根
    ['壬', '辛', '甲'], // 午月: 火旺极
    ['辛', '甲'], // 未月: 土燥克水，辛金生水
    ['戊', '丁'], // 申月: 金旺生水太过，戊土制之
    ['甲', '戊'], // 酉月: 金旺生水，甲木泄水
    ['甲', '丙'], // 戌月: 土旺克水，甲木疏土
    ['戊', '丙'], // 亥月: 水旺极，戊土制之
  ],

  // 癸水
  癸: [
    ['丙', '辛'], // 子月: 水旺极寒，丙火暖局
    ['丙', '辛'], // 丑月: 寒冻，丙火为先
    ['辛', '丙'], // 寅月: 木旺泄水，辛金生水
    ['庚', '辛'], // 卯月: 木旺极泄水，金生水
    ['丙', '辛'], // 辰月: 土旺克水，丙火暖之
    ['辛', '壬'], // 巳月: 火旺蒸水，辛金生水
    ['庚', '辛', '壬'], // 午月: 火旺极
    ['庚', '辛'], // 未月: 土燥克水
    ['丁', '丙'], // 申月: 金旺生水，丁火炼金
    ['辛', '丙'], // 酉月: 金旺生水，丙火暖之
    ['甲', '丙'], // 戌月: 土旺克水，甲木疏之
    ['丙', '庚'], // 亥月: 水旺寒极，丙火暖局
  ],
} as const

/** 月支索引映射 */
const BRANCH_INDEX: Record<EarthlyBranch, number> = {
  子: 0,
  丑: 1,
  寅: 2,
  卯: 3,
  辰: 4,
  巳: 5,
  午: 6,
  未: 7,
  申: 8,
  酉: 9,
  戌: 10,
  亥: 11,
}

/** 判断调候类型 */
function getTiaohouType(
  monthBranch: EarthlyBranch,
  gods: readonly HeavenlyStem[]
): TiaohouResult['type'] {
  const winterBranches: EarthlyBranch[] = ['亥', '子', '丑']
  const summerBranches: EarthlyBranch[] = ['巳', '午', '未']

  const firstGodWuxing = STEM_WUXING[gods[0]!]

  if (winterBranches.includes(monthBranch) && firstGodWuxing === '火') {
    return '暖局'
  }
  if (summerBranches.includes(monthBranch) && firstGodWuxing === '水') {
    return '润局'
  }

  // 如果出现生克链传导，属于通关用神
  const firstGod = gods[0]!
  const secondGod = gods[1]
  if (secondGod) {
    const firstWx = STEM_WUXING[firstGod]
    const secondWx = STEM_WUXING[secondGod]
    if (firstWx !== secondWx) {
      return '通关'
    }
  }

  return '扶抑'
}

/** 生成调候说明 */
function getTiaohouDescription(
  dayMaster: HeavenlyStem,
  monthBranch: EarthlyBranch,
  type: TiaohouResult['type'],
  gods: readonly HeavenlyStem[]
): string {
  const dayWuxing = STEM_WUXING[dayMaster]
  const godsStr = gods.join('、')

  switch (type) {
    case '暖局':
      return `${dayMaster}${dayWuxing}日主生于${monthBranch}月（冬令），天寒地冻，急需${godsStr}暖局驱寒。`
    case '润局':
      return `${dayMaster}${dayWuxing}日主生于${monthBranch}月（夏令），炎热燥烈，急需${godsStr}润局降温。`
    case '通关':
      return `${dayMaster}${dayWuxing}日主生于${monthBranch}月，五行偏枯，以${godsStr}通关调和。`
    case '扶抑':
      return `${dayMaster}${dayWuxing}日主生于${monthBranch}月，取${godsStr}为用神，扶抑平衡。`
  }
}

/**
 * 获取调候用神
 *
 * @param dayMaster 日主天干
 * @param monthBranch 月支
 * @returns 调候用神结果
 *
 * @example
 * ```ts
 * const result = getTiaohou('甲', '子')
 * // { dayMaster: '甲', monthBranch: '子', gods: ['丁', '庚'], type: '暖局', ... }
 * ```
 */
export function getTiaohou(dayMaster: HeavenlyStem, monthBranch: EarthlyBranch): TiaohouResult {
  const monthIndex = BRANCH_INDEX[monthBranch]
  const gods = TIAOHOU_MATRIX[dayMaster][monthIndex]!

  const type = getTiaohouType(monthBranch, gods)
  const description = getTiaohouDescription(dayMaster, monthBranch, type, gods)

  return {
    dayMaster,
    monthBranch,
    gods,
    type,
    description,
  }
}

/**
 * 判断八字中是否具有调候用神
 *
 * @param dayMaster 日主天干
 * @param monthBranch 月支
 * @param allStems 八字四柱所有天干（年月日时）
 * @returns 是否满足调候条件及匹配详情
 */
export function hasTiaohouGod(
  dayMaster: HeavenlyStem,
  monthBranch: EarthlyBranch,
  allStems: readonly HeavenlyStem[]
): { satisfied: boolean; matched: HeavenlyStem[]; missing: HeavenlyStem[] } {
  const tiaohou = getTiaohou(dayMaster, monthBranch)
  const matched: HeavenlyStem[] = []
  const missing: HeavenlyStem[] = []

  for (const god of tiaohou.gods) {
    if (allStems.includes(god)) {
      matched.push(god)
    } else {
      missing.push(god)
    }
  }

  return {
    satisfied: matched.length > 0,
    matched,
    missing,
  }
}
