/**
 * @zhop/astro-core — 流日日运引擎
 *
 * 单人八字 × 今日干支 → 个性化日运评分
 * 纯 TS 同步计算，无网络，无副作用
 *
 * 算法:
 *  1. 日支 × 流日地支  → 地支关系 (六合/三合/冲/刑/害/比和)
 *  2. 年支 × 流日地支  → 年命关系 (权重低)
 *  3. 日主 × 流日天干  → 五行关系 (相生/被生/相克/被克/比和)
 *  4. 流日天干 × 日柱十神 → 流日十神 (推导宜忌领域)
 *  5. 综合 synergy/friction → starRating 1-5
 */

import { STEM_WUXING } from './constants'
import {
  type BranchRelation,
  getBranchRelation,
  getWuXingRelation,
  type WuXingRelation,
} from './hehun'
import { getShiShen } from './shishen'
import type { EarthlyBranch, HeavenlyStem, WuXing } from './types'

/** Minimal GanZhi shape accepted by calculateDailyFortune — avoids requiring the full indexed form. */
type GanZhiInput = { stem: string; branch: string }

/** Minimal FourPillars shape accepted by calculateDailyFortune. */
type PillarsInput = { year: GanZhiInput; month: GanZhiInput; day: GanZhiInput; hour: GanZhiInput }

// ── Public types ─────────────────────────────────────────────────────────────

/** 日运评分结果 */
export interface DailyFortuneResult {
  /**
   * 今日综合星级 1-5
   * 5 = 天时地利 (纯生合)
   * 1 = 逆流逢冲 (多刑冲)
   */
  starRating: 1 | 2 | 3 | 4 | 5

  /**
   * 今日最显著的干支互动
   * e.g. '六合', '三合', '冲', '刑', '害', '相生', '被生', '被克', '相克', '比和'
   */
  dominantInteraction: BranchRelation | WuXingRelation

  /** 日主与流日天干的五行关系 */
  dayMasterRelation: WuXingRelation

  /** 日支与流日地支的关系 */
  dayBranchInteraction: BranchRelation

  /** 年支与流日地支的关系 */
  yearBranchInteraction: BranchRelation

  /**
   * 流日天干对日主的十神关系
   * e.g. '正官', '偏财', '食神', '比肩', '正印'
   */
  dayGodName: string

  /**
   * 今日有利领域 (推导自十神 + 五行关系)
   * e.g. ['学习', '社交', '创作']
   */
  favorableAreas: readonly string[]

  /**
   * 今日需謹慎的领域
   * e.g. ['投资', '争论', '签约']
   */
  cautionAreas: readonly string[]

  /**
   * 今日用神五行 (来自命盘 geju.favorableElement, 透过五行生克展现为具体颜色/方位提示)
   * e.g. '木', '火', '土', '金', '水'
   */
  luckyElement: WuXing

  /**
   * 原始分数 (调试用)
   */
  _raw: { synergy: number; friction: number }
}

// ── 十神 → 领域映射 ──────────────────────────────────────────────────────────

const SHISHEN_FAVORABLE: Record<string, readonly string[]> = {
  正官: ['事业', '纪律', '谈判'],
  七杀: ['勇气', '创业', '突破'],
  正印: ['学习', '修复', '亲情'],
  偏印: ['研究', '独处', '灵感'],
  正财: ['理财', '稳健进展', '家庭'],
  偏财: ['社交', '机遇', '合作'],
  食神: ['创作', '享受', '人际'],
  伤官: ['表达', '艺术', '改革'],
  比肩: ['自主', '坚守', '竞技'],
  劫财: ['行动', '冒险', '变革'],
}

const SHISHEN_CAUTION: Record<string, readonly string[]> = {
  正官: ['冒进', '情绪化', '违规'],
  七杀: ['冲突', '意气用事', '孤注一掷'],
  正印: ['拖延', '过度依赖', '优柔寡断'],
  偏印: ['封闭', '多疑', '忽视人际'],
  正财: ['冲动消费', '贪心', '借贷'],
  偏财: ['轻信他人', '赌博', '分心'],
  食神: ['懒惰', '过度享乐', '拖延'],
  伤官: ['口是心非', '与上冲突', '孤傲'],
  比肩: ['固执', '争执', '竞争'],
  劫财: ['鲁莽', '破财', '争斗'],
}

// ── 五行关系 → 领域修正 ──────────────────────────────────────────────────────

const WUXING_REL_BONUS: Record<WuXingRelation, readonly string[]> = {
  相生: ['创新', '扩展'],
  被生: ['学习', '协作'],
  比和: ['稳健', '自主'],
  相克: [],
  被克: [],
}

const WUXING_REL_EXTRA_CAUTION: Record<WuXingRelation, readonly string[]> = {
  相生: [],
  被生: [],
  比和: [],
  相克: ['争执', '强攻'],
  被克: ['压力', '受限'],
}

// ── 地支关系 → 星级权重 ─────────────────────────────────────────────────────

const BRANCH_SYNERGY_POINTS: Partial<Record<BranchRelation, number>> = {
  六合: 18,
  三合: 14,
  比和: 5,
}

const BRANCH_FRICTION_POINTS: Partial<Record<BranchRelation, number>> = {
  冲: 22,
  刑: 12,
  害: 8,
}

const WUXING_SYNERGY_POINTS: Partial<Record<WuXingRelation, number>> = {
  相生: 12,
  被生: 10,
  比和: 6,
}

const WUXING_FRICTION_POINTS: Partial<Record<WuXingRelation, number>> = {
  相克: 14,
  被克: 10,
}

// Max possible: synergy 18+14+12 = 44, friction 22+22+14 = 58
const MAX_SYNERGY = 44
const MAX_FRICTION = 58

// ── Star rating mapping ───────────────────────────────────────────────────────

function toStarRating(synergy: number, friction: number): 1 | 2 | 3 | 4 | 5 {
  const net = synergy - friction
  // net range: roughly -58 to +44
  if (net >= 28) return 5
  if (net >= 12) return 4
  if (net >= -4) return 3
  if (net >= -20) return 2
  return 1
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * 计算单人八字与今日干支的日运互动评分。
 *
 * @param pillars      - 用户四柱 (via getFourPillars)
 * @param todayGanZhi  - 今日干支 (via dayGanZhi)
 * @param favorableElement - 用神五行 (来自命盘 geju.favorableElement，可选)
 */
export function calculateDailyFortune(
  pillars: PillarsInput,
  todayGanZhi: GanZhiInput,
  favorableElement?: string
): DailyFortuneResult {
  // 1. 地支互动
  const dayBranchInteraction = getBranchRelation(
    pillars.day.branch as EarthlyBranch,
    todayGanZhi.branch as EarthlyBranch
  )
  const yearBranchInteraction = getBranchRelation(
    pillars.year.branch as EarthlyBranch,
    todayGanZhi.branch as EarthlyBranch
  )

  // 2. 日主 × 流日天干五行
  const dayMasterWuXing: WuXing = STEM_WUXING[pillars.day.stem as HeavenlyStem]
  const todayStemWuXing: WuXing = STEM_WUXING[todayGanZhi.stem as HeavenlyStem]
  const dayMasterRelation = getWuXingRelation(todayStemWuXing, dayMasterWuXing)

  // 3. 流日天干对日主的十神关系
  const shiShenInfo = getShiShen(pillars.day.stem as HeavenlyStem, todayGanZhi.stem as HeavenlyStem)
  const dayGodName = shiShenInfo.name

  // 4. 评分 — 主要计日支 + 年支 + 五行各贡献
  let synergy = 0
  let friction = 0

  // 日支权重最高
  synergy += BRANCH_SYNERGY_POINTS[dayBranchInteraction] ?? 0
  friction += BRANCH_FRICTION_POINTS[dayBranchInteraction] ?? 0

  // 年支权重次之
  synergy += Math.round((BRANCH_SYNERGY_POINTS[yearBranchInteraction] ?? 0) * 0.6)
  friction += Math.round((BRANCH_FRICTION_POINTS[yearBranchInteraction] ?? 0) * 0.6)

  // 五行
  synergy += WUXING_SYNERGY_POINTS[dayMasterRelation] ?? 0
  friction += WUXING_FRICTION_POINTS[dayMasterRelation] ?? 0

  // 5. 用神加持：若今日天干五行 === 用神，额外 +6 synergy
  if (favorableElement && todayStemWuXing === (favorableElement as WuXing)) {
    synergy += 6
  }

  const starRating = toStarRating(synergy, friction)

  // 6. 找最显著互动
  const dominantInteraction: BranchRelation | WuXingRelation = pickDominant(
    dayBranchInteraction,
    dayMasterRelation,
    synergy,
    friction
  )

  // 7. 宜/忌：十神为主，五行关系为补充
  const baseFavorable = SHISHEN_FAVORABLE[dayGodName] ?? []
  const baseCaution = SHISHEN_CAUTION[dayGodName] ?? []
  const bonusFavorable = WUXING_REL_BONUS[dayMasterRelation] ?? []
  const bonusCaution = WUXING_REL_EXTRA_CAUTION[dayMasterRelation] ?? []

  const favorableAreas = dedup([...baseFavorable, ...bonusFavorable]).slice(0, 3)
  const cautionAreas = dedup([...baseCaution, ...bonusCaution]).slice(0, 3)

  const luckyElement: WuXing = (favorableElement as WuXing | undefined) ?? dayMasterWuXing

  return {
    starRating,
    dominantInteraction,
    dayMasterRelation,
    dayBranchInteraction,
    yearBranchInteraction,
    dayGodName,
    favorableAreas,
    cautionAreas,
    luckyElement,
    _raw: { synergy, friction },
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function dedup<T>(arr: readonly T[]): T[] {
  return [...new Set(arr)]
}

/**
 * 从地支关系和五行关系中挑最具影响力的一个返回给前端展示。
 * 规则：冲/刑/六合 优先于 五行关系。
 */
function pickDominant(
  branchRel: BranchRelation,
  wuXingRel: WuXingRelation,
  synergy: number,
  friction: number
): BranchRelation | WuXingRelation {
  // High-signal branch relations take priority
  if (
    branchRel === '冲' ||
    branchRel === '六合' ||
    branchRel === '三合' ||
    branchRel === '刑' ||
    branchRel === '害'
  ) {
    return branchRel
  }
  // Otherwise pick based on the larger magnitude (synergy vs friction)
  if (synergy >= friction) {
    return wuXingRel === '相生' || wuXingRel === '被生' ? wuXingRel : branchRel
  }
  return wuXingRel === '相克' || wuXingRel === '被克' ? wuXingRel : branchRel
}
