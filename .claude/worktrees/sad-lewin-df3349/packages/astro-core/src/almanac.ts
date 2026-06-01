/**
 * @zhop/astro-core — 日历通书 (Daily Almanac)
 *
 * 基于当日天干五行推算宜忌、吉色、吉方。
 * 纯数学计算，无网络请求，可同步执行。
 */

import { BRANCH_WUXING, STEM_WUXING, WUXING_GENERATE, WUXING_OVERCOME } from './constants'
import { getFourPillars } from './ganzhi'
import type { HeavenlyStem, WuXing } from './types'

// ── 五行辅助 ─────────────────────────────────────────────────

/** 五行 → 生我的元素 (母元素) */
const WUXING_MOTHER: Record<WuXing, WuXing> = {
  木: '水',
  火: '木',
  土: '火',
  金: '土',
  水: '金',
}

/** 五行 → 吉色 */
const ELEMENT_COLOR: Record<WuXing, string> = {
  木: '绿色',
  火: '红色',
  土: '黄色',
  金: '白色',
  水: '黑色',
}

/** 五行 → 吉方 */
const ELEMENT_DIRECTION: Record<WuXing, string> = {
  木: '东方',
  火: '南方',
  土: '中央',
  金: '西方',
  水: '北方',
}

/** 今日宜 */
const ELEMENT_DOS: Record<WuXing, string[]> = {
  木: ['学习进修', '制定计划', '植树园艺'],
  火: ['社交拓展', '展示推广', '喜庆宴会'],
  土: ['房产事务', '商业谈判', '整理收纳'],
  金: ['财务决策', '签署合同', '购置器物'],
  水: ['研究学问', '旅行远行', '静思内观'],
}

/** 今日忌 */
const ELEMENT_DONTS: Record<WuXing, string[]> = {
  木: ['动刀剪锋器', '与人争执冲突'],
  火: ['急躁冒进', '用火不慎'],
  土: ['拖延懈怠', '挖土动土'],
  金: ['流血外科手术', '口舌是非'],
  水: ['涉水弄湿', '犹豫不决'],
}

/** 无命盘时的默认运势评分 */
const DEFAULT_RATING: Record<WuXing, 1 | 2 | 3 | 4 | 5> = {
  木: 4,
  火: 4,
  土: 3,
  金: 3,
  水: 4,
}

// ── 类型 ─────────────────────────────────────────────────────

export type ElementRelation = '生我' | '克我' | '我生' | '我克' | '同类'

export interface DailyAlmanac {
  /** 当日干支，e.g. "甲子" */
  todayGanZhi: string
  /** 当日天干五行 */
  todayElement: WuXing
  /** 日主五行（仅当传入 dayMasterStem 时有值） */
  dayMasterElement?: WuXing
  /** 日主与当日元素关系 */
  elementRelation?: ElementRelation
  /** 吉色 */
  luckyColor: string
  /** 吉方 */
  luckyDirection: string
  /** 今日宜 */
  dos: string[]
  /** 今日忌 */
  donts: string[]
  /** 综合吉凶指数 1-5，5 最吉 */
  overallRating: 1 | 2 | 3 | 4 | 5
}

// ── 主函数 ────────────────────────────────────────────────────

/**
 * 计算当日日历通书
 *
 * @param dateInput 公历日期 { year, month, day }
 * @param dayMasterStem 日主天干（来自用户四柱日柱天干），可选
 */
export function calculateDailyAlmanac(
  dateInput: { year: number; month: number; day: number },
  dayMasterStem?: HeavenlyStem
): DailyAlmanac {
  const pillars = getFourPillars({ ...dateInput, hour: 0 })
  const todayGanZhi = pillars.day.label
  const todayElement = STEM_WUXING[pillars.day.stem]

  let dayMasterElement: WuXing | undefined
  let elementRelation: ElementRelation | undefined
  let overallRating: 1 | 2 | 3 | 4 | 5

  if (dayMasterStem) {
    dayMasterElement = STEM_WUXING[dayMasterStem]

    if (dayMasterElement === todayElement) {
      elementRelation = '同类'
      overallRating = 4
    } else if (WUXING_GENERATE[todayElement] === dayMasterElement) {
      // Today's element generates dayMaster
      elementRelation = '生我'
      overallRating = 5
    } else if (WUXING_OVERCOME[todayElement] === dayMasterElement) {
      // Today's element controls dayMaster
      elementRelation = '克我'
      overallRating = 2
    } else if (WUXING_GENERATE[dayMasterElement] === todayElement) {
      // DayMaster generates today's element (draining)
      elementRelation = '我生'
      overallRating = 3
    } else {
      // DayMaster controls today's element
      elementRelation = '我克'
      overallRating = 3
    }
  } else {
    overallRating = DEFAULT_RATING[todayElement]
  }

  // Lucky element: element that generates dayMaster, or today's element if no personal chart
  const luckyElement: WuXing = dayMasterElement ? WUXING_MOTHER[dayMasterElement] : todayElement

  return {
    todayGanZhi,
    todayElement,
    dayMasterElement,
    elementRelation,
    luckyColor: ELEMENT_COLOR[luckyElement],
    luckyDirection: ELEMENT_DIRECTION[luckyElement],
    dos: ELEMENT_DOS[todayElement],
    donts: ELEMENT_DONTS[todayElement],
    overallRating,
  }
}
