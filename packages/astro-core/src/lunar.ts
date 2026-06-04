/**
 * @zhop/astro-core — 农历公历转换
 *
 * 使用压缩查表法覆盖 1900-2100 年。
 * 每个年份用一个 hex 数编码：
 * - Bit 0-3: 闰月月份 (0=无闰月)
 * - Bit 4-15: 12 个月的大小月标志 (1=30天大月, 0=29天小月)
 * - Bit 16: 闰月是否大月
 */

import {
  BRANCH_ZODIAC,
  EARTHLY_BRANCHES,
  HEAVENLY_STEMS,
  LUNAR_DAY_NAMES,
  LUNAR_MONTH_NAMES,
} from './constants'
import type { LunarDate } from './types'

// ========================================
// 农历数据表 (1900-2100)
// ========================================

/**
 * 压缩农历数据 (1900-2100)
 *
 * 编码规则:
 * - Bit 0-3: 闰月月份 (0=无闰月, 1-12=闰几月)
 * - Bit 4: 1月大小 (1=30天, 0=29天)
 * - Bit 5: 2月大小
 * - ...
 * - Bit 15: 12月大小
 * - Bit 16: 闰月大小 (1=30天, 0=29天)
 *
 * 每个正月初一对应的公历日期单独存储在 LUNAR_NEW_YEAR 表中。
 */
const LUNAR_DATA: readonly number[] = [
  /* 1900 */ 0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0,
  0x055d2, /* 1910 */ 0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2,
  0x095b0, 0x14977, /* 1920 */ 0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60,
  0x09570, 0x052f2, 0x04970, /* 1930 */ 0x06566, 0x0d4a0, 0x0ea50, 0x16a95, 0x05ad0, 0x02b60,
  0x186e3, 0x092e0, 0x1c8d7, 0x0c950, /* 1940 */ 0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4,
  0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, /* 1950 */ 0x06ca0, 0x0b550, 0x15355, 0x04da0,
  0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, /* 1960 */ 0x0aea6, 0x0ab50, 0x04b60,
  0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, /* 1970 */ 0x096d0, 0x04dd5,
  0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6, /* 1980 */ 0x095b0,
  0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  /* 1990 */ 0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5,
  0x092e0, /* 2000 */ 0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0,
  0x092d0, 0x0cab5, /* 2010 */ 0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0,
  0x15176, 0x052b0, 0x0a930, /* 2020 */ 0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6,
  0x0a4e0, 0x0d260, 0x0ea65, 0x0d530, /* 2030 */ 0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0,
  0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, /* 2040 */ 0x0b5a0, 0x056d0, 0x055b2, 0x049b0,
  0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, /* 2050 */ 0x14b63, 0x09370, 0x049f8,
  0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06aa0, 0x1a6c4, 0x0aae0, /* 2060 */ 0x092e0, 0x0d2e3,
  0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4, /* 2070 */ 0x052d0,
  0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  /* 2080 */ 0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4,
  0x0d160, /* 2090 */ 0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a4d0,
  0x0d150, 0x0f252, /* 2100 */ 0x0d520,
] as const

/**
 * 每年正月初一对应的公历（月-日），1900 起
 * 格式: [month, day]
 */
const LUNAR_NEW_YEAR: readonly [number, number][] = [
  [1, 31],
  [2, 19],
  [2, 8],
  [1, 29],
  [2, 16],
  [2, 4],
  [1, 25],
  [2, 13],
  [2, 2],
  [1, 22], // 1900-1909
  [2, 10],
  [1, 30],
  [2, 18],
  [2, 6],
  [1, 26],
  [2, 14],
  [2, 3],
  [1, 23],
  [2, 11],
  [2, 1], // 1910-1919
  [2, 20],
  [2, 8],
  [1, 28],
  [2, 16],
  [2, 5],
  [1, 24],
  [2, 13],
  [2, 2],
  [1, 23],
  [2, 10], // 1920-1929
  [1, 30],
  [2, 17],
  [2, 6],
  [1, 26],
  [2, 14],
  [2, 4],
  [1, 24],
  [2, 11],
  [1, 31],
  [2, 19], // 1930-1939
  [2, 8],
  [1, 27],
  [2, 15],
  [2, 5],
  [1, 25],
  [2, 13],
  [2, 2],
  [1, 22],
  [2, 10],
  [1, 29], // 1940-1949
  [2, 17],
  [2, 6],
  [1, 27],
  [2, 14],
  [2, 3],
  [1, 24],
  [2, 12],
  [1, 31],
  [2, 18],
  [2, 8], // 1950-1959
  [1, 28],
  [2, 15],
  [2, 5],
  [1, 25],
  [2, 13],
  [2, 2],
  [1, 21],
  [2, 9],
  [1, 30],
  [2, 17], // 1960-1969
  [2, 6],
  [1, 27],
  [2, 15],
  [2, 3],
  [1, 23],
  [2, 11],
  [1, 31],
  [2, 18],
  [2, 7],
  [1, 28], // 1970-1979
  [2, 16],
  [2, 5],
  [1, 25],
  [2, 13],
  [2, 2],
  [2, 20],
  [2, 9],
  [1, 29],
  [2, 17],
  [2, 6], // 1980-1989
  [1, 27],
  [2, 15],
  [2, 4],
  [1, 23],
  [2, 10],
  [1, 31],
  [2, 19],
  [2, 7],
  [1, 28],
  [2, 16], // 1990-1999
  [2, 5],
  [1, 24],
  [2, 12],
  [2, 1],
  [1, 22],
  [2, 9],
  [1, 29],
  [2, 18],
  [2, 7],
  [1, 26], // 2000-2009
  [2, 14],
  [2, 3],
  [1, 23],
  [2, 10],
  [1, 31],
  [2, 19],
  [2, 8],
  [1, 28],
  [2, 16],
  [2, 5], // 2010-2019
  [1, 25],
  [2, 12],
  [2, 1],
  [1, 22],
  [2, 10],
  [1, 29],
  [2, 17],
  [2, 6],
  [1, 26],
  [2, 13], // 2020-2029
  [2, 3],
  [1, 23],
  [2, 11],
  [1, 31],
  [2, 19],
  [2, 8],
  [1, 28],
  [2, 15],
  [2, 4],
  [1, 24], // 2030-2039
  [2, 12],
  [2, 1],
  [1, 22],
  [2, 10],
  [1, 30],
  [2, 17],
  [2, 6],
  [1, 26],
  [2, 14],
  [2, 2], // 2040-2049
  [1, 23],
  [2, 11],
  [1, 31],
  [2, 19],
  [2, 8],
  [1, 28],
  [2, 15],
  [2, 4],
  [1, 24],
  [2, 12], // 2050-2059
  [2, 2],
  [1, 21],
  [2, 9],
  [1, 29],
  [2, 17],
  [2, 6],
  [1, 26],
  [2, 14],
  [2, 3],
  [1, 23], // 2060-2069
  [2, 11],
  [1, 31],
  [2, 19],
  [2, 7],
  [1, 27],
  [2, 15],
  [2, 5],
  [1, 25],
  [2, 12],
  [2, 2], // 2070-2079
  [1, 22],
  [2, 9],
  [1, 29],
  [2, 17],
  [2, 6],
  [1, 26],
  [2, 14],
  [2, 3],
  [1, 24],
  [2, 10], // 2080-2089
  [1, 30],
  [2, 18],
  [2, 7],
  [1, 27],
  [2, 15],
  [2, 5],
  [1, 25],
  [2, 12],
  [2, 1],
  [1, 21], // 2090-2099
  [2, 9], // 2100
] as const

// ========================================
// 公开 API
// ========================================

/**
 * 公历转农历
 *
 * @param year 公历年 (1900-2100)
 * @param month 公历月 (1-12)
 * @param day 公历日 (1-31)
 * @returns 农历日期
 */
export function solarToLunar(year: number, month: number, day: number): LunarDate {
  if (year < 1900 || year > 2100) {
    throw new RangeError('Year must be between 1900 and 2100')
  }

  // 计算距离 1900 年 1 月 31 日（1900 年正月初一）的天数
  const baseDate = new Date(1900, 0, 31) // 1900-01-31
  const targetDate = new Date(year, month - 1, day)
  let offset = Math.floor((targetDate.getTime() - baseDate.getTime()) / 86400000)

  if (offset < 0) {
    throw new RangeError('Date is before 1900-01-31')
  }

  // 逐年累减
  let lunarYear = 1900
  let yearDays: number

  for (let i = 1900; i < 2101 && offset > 0; i++) {
    yearDays = getLunarYearDays(i)
    if (offset >= yearDays) {
      offset -= yearDays
      lunarYear = i + 1
    } else {
      lunarYear = i
      break
    }
  }

  // 处理闰月
  const leapMonth = getLeapMonth(lunarYear)
  let lunarMonth = 1
  let isLeap = false
  let monthDays: number

  for (let i = 1; i <= 13 && offset > 0; i++) {
    if (leapMonth > 0 && i === leapMonth + 1) {
      // 闰月
      monthDays = getLeapMonthDays(lunarYear)
      if (offset >= monthDays) {
        offset -= monthDays
      } else {
        isLeap = true
        lunarMonth = leapMonth
        break
      }
    } else {
      // 正常月份
      const actualMonth = leapMonth > 0 && i > leapMonth ? i - 1 : i
      monthDays = getLunarMonthDays(lunarYear, actualMonth)
      if (offset >= monthDays) {
        offset -= monthDays
        lunarMonth = actualMonth + 1
      } else {
        lunarMonth = actualMonth
        break
      }
    }
  }

  // offset 就是日 (0-based)
  const lunarDay = offset + 1

  // 年干支
  const stemIdx = (((lunarYear - 4) % 10) + 10) % 10
  const branchIdx = (((lunarYear - 4) % 12) + 12) % 12
  const yearGanZhi = `${HEAVENLY_STEMS[stemIdx]}${EARTHLY_BRANCHES[branchIdx]}`
  const zodiac = BRANCH_ZODIAC[EARTHLY_BRANCHES[branchIdx]!]!

  return {
    year: lunarYear,
    month: lunarMonth,
    day: lunarDay,
    isLeap,
    monthName: isLeap
      ? `闰${LUNAR_MONTH_NAMES[lunarMonth - 1]}`
      : (LUNAR_MONTH_NAMES[lunarMonth - 1] ?? `${lunarMonth}月`),
    dayName: LUNAR_DAY_NAMES[lunarDay - 1] ?? `${lunarDay}`,
    yearGanZhi,
    zodiac,
  }
}

/**
 * 农历转公历
 *
 * @param lunarYear 农历年
 * @param lunarMonth 农历月 (1-12)
 * @param lunarDay 农历日 (1-30)
 * @param isLeap 是否闰月
 * @returns 公历 Date
 */
export function lunarToSolar(
  lunarYear: number,
  lunarMonth: number,
  lunarDay: number,
  isLeap = false
): Date {
  if (lunarYear < 1900 || lunarYear > 2100) {
    throw new RangeError('Year must be between 1900 and 2100')
  }

  // 计算从 1900-01-31 (庚午年正月初一) 到目标日的天数
  let offset = 0

  // 累加整年
  for (let y = 1900; y < lunarYear; y++) {
    offset += getLunarYearDays(y)
  }

  // 累加整月
  const leapMonth = getLeapMonth(lunarYear)
  for (let m = 1; m < lunarMonth; m++) {
    offset += getLunarMonthDays(lunarYear, m)
    // 如果存在闰月且闰月在当前月之前或等于
    if (leapMonth > 0 && m === leapMonth) {
      offset += getLeapMonthDays(lunarYear)
    }
  }

  // 如果目标就是闰月
  if (isLeap && lunarMonth === leapMonth) {
    offset += getLunarMonthDays(lunarYear, lunarMonth)
  }

  // 加日
  offset += lunarDay - 1

  const baseDate = new Date(1900, 0, 31)
  return new Date(baseDate.getTime() + offset * 86400000)
}

// ========================================
// 辅助函数
// ========================================

/**
 * 获取农历某年的闰月月份 (0=无闰月)
 */
export function getLeapMonth(lunarYear: number): number {
  const data = LUNAR_DATA[lunarYear - 1900]
  if (data === undefined) return 0
  return data & 0xf
}

/**
 * 获取闰月天数 (29 或 30)
 */
export function getLeapMonthDays(lunarYear: number): number {
  const data = LUNAR_DATA[lunarYear - 1900]
  if (data === undefined) return 0
  return data & 0x10000 ? 30 : 29
}

/**
 * 获取农历某月天数 (29 或 30)
 */
export function getLunarMonthDays(lunarYear: number, month: number): number {
  const data = LUNAR_DATA[lunarYear - 1900]
  if (data === undefined) return 0
  return data & (0x10000 >> month) ? 30 : 29
}

/**
 * 获取农历某年总天数
 */
export function getLunarYearDays(lunarYear: number): number {
  let total = 0
  for (let m = 1; m <= 12; m++) {
    total += getLunarMonthDays(lunarYear, m)
  }
  const leapMonth = getLeapMonth(lunarYear)
  if (leapMonth > 0) {
    total += getLeapMonthDays(lunarYear)
  }
  return total
}

/**
 * 获取某年正月初一的公历日期
 */
export function getLunarNewYear(year: number): Date {
  const entry = LUNAR_NEW_YEAR[year - 1900]
  if (!entry) throw new RangeError(`No data for year ${year}`)
  return new Date(year, entry[0] - 1, entry[1])
}

// ========================================
// 六曜 (Rokuyo — Japanese six-day cycle)
// ========================================

/** 六曜の名称（旧暦由来の暦注） */
export type RokuyoName = '先勝' | '友引' | '先負' | '仏滅' | '大安' | '赤口'

export interface Rokuyo {
  /** 0-5, computed as (lunarMonth + lunarDay) % 6 */
  index: number
  /** 漢字表記 */
  name: RokuyoName
  /** ふりがな */
  reading: string
}

const ROKUYO_TABLE: ReadonlyArray<{ name: RokuyoName; reading: string }> = [
  { name: '大安', reading: 'たいあん' },
  { name: '赤口', reading: 'しゃっこう' },
  { name: '先勝', reading: 'せんしょう' },
  { name: '友引', reading: 'ともびき' },
  { name: '先負', reading: 'せんぶ' },
  { name: '仏滅', reading: 'ぶつめつ' },
]

/**
 * 六曜（ろくよう）— the Japanese six-day calendar cycle traditionally printed on
 * 日めくり / カレンダー to annotate each day. Determined purely from the
 * lunisolar (旧暦) month + day:
 *
 *   index = (lunarMonth + lunarDay) mod 6
 *
 * with 0=大安, 1=赤口, 2=先勝, 3=友引, 4=先負, 5=仏滅. Each 旧暦 month resets the
 * cycle (旧暦1月1日 is fixed at 先勝 → (1 + 1) mod 6 = 2), so leap months reuse
 * the same ordinal as their base month. This is a deterministic calendar
 * annotation — no astronomy beyond the 旧暦 conversion itself.
 *
 * @param lunarMonth 旧暦の月 (1-12; leap months use the same ordinal)
 * @param lunarDay   旧暦の日 (1-30)
 */
export function getRokuyo(lunarMonth: number, lunarDay: number): Rokuyo {
  const index = (((lunarMonth + lunarDay) % 6) + 6) % 6
  const entry = ROKUYO_TABLE[index] ?? { name: '大安' as const, reading: 'たいあん' }
  return { index, name: entry.name, reading: entry.reading }
}
