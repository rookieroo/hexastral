/**
 * @zhop/astro-core — 类型定义
 *
 * 所有术数共用的基础类型。
 */

/** 天干 */
export type HeavenlyStem = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸'

/** 地支 */
export type EarthlyBranch =
  | '子'
  | '丑'
  | '寅'
  | '卯'
  | '辰'
  | '巳'
  | '午'
  | '未'
  | '申'
  | '酉'
  | '戌'
  | '亥'

/** 五行 */
export type WuXing = '木' | '火' | '土' | '金' | '水'

/** 阴阳 */
export type YinYang = '阳' | '阴'

/** 干支组合 */
export interface GanZhi {
  /** 天干 */
  stem: HeavenlyStem
  /** 地支 */
  branch: EarthlyBranch
  /** 干支序号 1-60 */
  index: number
  /** 完整名称 e.g. "甲子" */
  label: string
}

/** 四柱（八字） */
export interface FourPillars {
  /** 年柱 */
  year: GanZhi
  /** 月柱 */
  month: GanZhi
  /** 日柱 */
  day: GanZhi
  /** 时柱 */
  hour: GanZhi
}

/** 时辰信息 */
export interface ShiChen {
  /** 地支名称 e.g. "子" */
  branch: EarthlyBranch
  /** 时辰名称 e.g. "子时" */
  name: string
  /** 序号 0-11 */
  index: number
  /** 起始小时 (24h) */
  startHour: number
  /** 结束小时 (24h) */
  endHour: number
  /** 对应动物 */
  animal: string
}

/** 节气信息 */
export interface JieQi {
  /** 节气名称 */
  name: string
  /** 太阳黄经度数 */
  longitude: number
  /** 公历近似日期 (MM-DD) */
  approxDate: string
  /** 所属月份（以节为界） */
  monthIndex: number
  /** 是「节」还是「气」 */
  type: 'jie' | 'qi'
}

/** 农历日期 */
export interface LunarDate {
  /** 农历年 */
  year: number
  /** 农历月 (1-12) */
  month: number
  /** 农历日 (1-30) */
  day: number
  /** 是否闰月 */
  isLeap: boolean
  /** 农历月名 e.g. "正月" */
  monthName: string
  /** 农历日名 e.g. "初一" */
  dayName: string
  /** 年干支 e.g. "甲子" */
  yearGanZhi: string
  /** 生肖 */
  zodiac: string
}

/** 真太阳时结果 */
export interface TrueSolarTime {
  /** 校正后的 Date */
  date: Date
  /** 与地方平太阳时的偏差（分钟） */
  equationOfTime: number
  /** 经度修正（分钟） */
  longitudeCorrection: number
  /** 总修正量（分钟） */
  totalCorrection: number
}

/** 日期时间输入（统一所有模块的入参） */
export interface DateTimeInput {
  /** 年 */
  year: number
  /** 月 (1-12) */
  month: number
  /** 日 (1-31) */
  day: number
  /** 时 (0-23) */
  hour?: number
  /** 分 (0-59) */
  minute?: number
  /** 经度（用于真太阳时修正，东经为正） */
  longitude?: number
}
