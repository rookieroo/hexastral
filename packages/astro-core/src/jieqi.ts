/**
 * @zhop/astro-core — 二十四节气计算
 *
 * 基于太阳视黄经的精确节气推算。一个节气 = 太阳视黄经跨越某个 15° 倍数的瞬间
 * （春分 = 0°, 清明 = 15°, … 冬至 = 270°, 小寒 = 285°）。
 *
 * 用截断 VSOP87 + 章动 + 光行差求太阳视黄经（见 `solar-longitude.ts`），再以
 * 牛顿迭代求黄经过 15° 倍数的瞬间，精度可达秒级（取代旧版 ±1 天的寿星简化公式）。
 * 节气日按北京时间（UTC+8）取整 —— 与官方万年历一致。
 */

import { JIEQI_TABLE, MONTH_JIE } from './constants'
import {
  dateToJulianDay,
  deltaTSeconds,
  julianDayToDate,
  solarLongitudeCrossing,
} from './solar-longitude'
import type { JieQi } from './types'

/** 北京时间相对 UTC 的偏移（中国自 1949 年起统一使用 UTC+8）。 */
const CST_OFFSET_MS = 8 * 60 * 60 * 1000

/** jieQiInstant 结果缓存：key = year * 100 + index → 该节气瞬间的 UTC 毫秒。 */
const instantCache = new Map<number, number>()

/**
 * 计算某年某节气的**精确瞬间**（返回该瞬间对应的 UTC `Date`）。
 *
 * @param year 公历年
 * @param jieqiIndex 年历序索引 (0=小寒, 2=立春, …, 23=冬至)
 */
export function getJieQiInstant(year: number, jieqiIndex: number): Date | null {
  const info = JIEQI_ORDER_TABLE[jieqiIndex]
  if (!info) return null

  const cacheKey = year * 100 + jieqiIndex
  const cached = instantCache.get(cacheKey)
  if (cached !== undefined) return new Date(cached)

  // Initial guess: the term's approximate Gregorian date at ~CST noon (04:00 UTC).
  const [mm, dd] = info.approxDate.split('-').map((x) => Number.parseInt(x, 10))
  const guessUtcMs = Date.UTC(year, (mm ?? 1) - 1, dd ?? 1, 4, 0, 0)
  const deltaTDays = deltaTSeconds(year) / 86400

  // Solve for the longitude crossing in Dynamical Time (TT), then back to UT/UTC.
  const jdeGuess = dateToJulianDay(new Date(guessUtcMs)) + deltaTDays
  const jde = solarLongitudeCrossing(info.longitude, jdeGuess)
  const instant = julianDayToDate(jde - deltaTDays)

  instantCache.set(cacheKey, instant.getTime())
  return instant
}

/**
 * 计算某年某个节气的公历日（北京时间 UTC+8 的“几号”）。
 *
 * @param year 公历年份
 * @param jieqiIndex 年历序索引 (0=小寒, 23=冬至)
 * @returns 公历日 (几号)，索引非法时返回 0
 */
export function getJieQiDay(year: number, jieqiIndex: number): number {
  const instant = getJieQiInstant(year, jieqiIndex)
  if (!instant) return 0
  return new Date(instant.getTime() + CST_OFFSET_MS).getUTCDate()
}

/**
 * 获取某年某月的所有节气
 *
 * @param year 公历年
 * @param month 公历月 (1-12)
 * @returns 该月的节气（通常 2 个: 一节一气）
 */
export function getMonthJieQi(year: number, month: number): Array<{ jieqi: JieQi; day: number }> {
  const result: Array<{ jieqi: JieQi; day: number }> = []

  // month 1 → 小寒(0) + 大寒(1); month 2 → 立春(2) + 雨水(3); …
  const startIdx = (month - 1) * 2
  for (let i = startIdx; i < startIdx + 2 && i < 24; i++) {
    const day = getJieQiDay(year, i)
    const jieqiInfo = JIEQI_ORDER_TABLE[i]
    if (jieqiInfo && day > 0) {
      result.push({ jieqi: jieqiInfo, day })
    }
  }

  return result
}

/**
 * 获取某年所有 24 节气的日期
 */
export function getYearJieQi(year: number): Array<{ jieqi: JieQi; month: number; day: number }> {
  const result: Array<{ jieqi: JieQi; month: number; day: number }> = []

  for (let i = 0; i < 24; i++) {
    const day = getJieQiDay(year, i)
    const jieqiInfo = JIEQI_ORDER_TABLE[i]
    if (jieqiInfo && day > 0) {
      const month = Math.floor(i / 2) + 1
      result.push({ jieqi: jieqiInfo, month, day })
    }
  }

  return result
}

/**
 * 判断某日期之前最近的「节」是哪个
 * 用于确定月干支
 *
 * @returns 月地支索引 (0=寅月, 仅 jie 类型节气)
 */
export function getMonthByJie(year: number, month: number, day: number): number {
  // 获取当月的「节」（每月第一个节气是「节」）
  const jieIdx = (month - 1) * 2 // 小寒=0,立春=2,惊蛰=4...
  const jieDay = getJieQiDay(year, jieIdx)

  // 如果日 >= 当月节，则属于当月；否则属于上一个月
  if (day >= jieDay) {
    return jieToMonthBranchIndex(jieIdx)
  }

  const prevJieIdx = (jieIdx - 2 + 24) % 24
  return jieToMonthBranchIndex(prevJieIdx)
}

/**
 * 节气索引(按年历序) → 月地支索引(寅=0)
 */
function jieToMonthBranchIndex(jieIdx: number): number {
  // 小寒(0)→丑月(11), 立春(2)→寅月(0), 惊蛰(4)→卯月(1), ...
  const monthNum = Math.floor(jieIdx / 2) // 0=1月, 1=2月, ...
  return (monthNum + 11) % 12
}

/** 公历日比较键（同公历年序） */
function solarYmdKey(y: number, m: number, d: number): number {
  return y * 10_000 + m * 100 + d
}

/**
 * 纯公历日比较：不依赖 `Date` 的本地时区解释，用于节气段判定。
 * `targetYear` 为目标日期所在公历年（与 `getNearestJieQi(date)` 中 `date.getFullYear()` 一致）。
 */
export function getNearestJieQiForGregorianDate(
  targetYear: number,
  targetMonth: number,
  targetDay: number
): {
  prev: { name: string; date: Date }
  next: { name: string; date: Date }
} {
  const targetKey = solarYmdKey(targetYear, targetMonth, targetDay)

  // Rows across 3 years so the search always brackets the target date.
  const rows: Array<{ name: string; idx: number; jqYear: number; key: number }> = []
  const pushRow = (jqYear: number, idx: number) => {
    const info = JIEQI_ORDER_TABLE[idx]
    if (!info) return
    const day = getJieQiDay(jqYear, idx)
    const month = Math.floor(idx / 2) + 1
    rows.push({ name: info.name, idx, jqYear, key: solarYmdKey(jqYear, month, day) })
  }
  pushRow(targetYear - 1, 22) // 大雪
  pushRow(targetYear - 1, 23) // 冬至
  for (let i = 0; i < 24; i++) pushRow(targetYear, i)
  pushRow(targetYear + 1, 0) // 小寒
  pushRow(targetYear + 1, 1) // 大寒

  let prevRow = rows[0]!
  let nextRow = rows[rows.length - 1]!
  for (const row of rows) {
    if (row.key <= targetKey) {
      prevRow = row
    } else {
      nextRow = row
      break
    }
  }

  const instantOf = (row: { jqYear: number; idx: number }): Date =>
    getJieQiInstant(row.jqYear, row.idx) ?? new Date(Date.UTC(row.jqYear, 0, 1))

  return {
    prev: { name: prevRow.name, date: instantOf(prevRow) },
    next: { name: nextRow.name, date: instantOf(nextRow) },
  }
}

/**
 * 将任意时刻映射到 IANA 时区下的公历年月日（用于「以东八区历日」定节气等）。
 */
export function getCalendarYMDInTimeZone(
  date: Date,
  timeZone: string
): { year: number; month: number; day: number } {
  const s = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
  const parts = s.split('-').map((x) => Number.parseInt(x, 10))
  const y = parts[0] ?? date.getUTCFullYear()
  const m = parts[1] ?? 1
  const d = parts[2] ?? 1
  return { year: y, month: m, day: d }
}

/**
 * 获取距今最近的上一个节气和下一个节气（按运行环境**本地日历日**解释 `date`）。
 */
export function getNearestJieQi(date: Date): {
  prev: { name: string; date: Date }
  next: { name: string; date: Date }
} {
  return getNearestJieQiForGregorianDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

/**
 * 查找节气信息
 */
export function findJieQi(name: string): JieQi | undefined {
  return JIEQI_TABLE.find((j) => j.name === name) as JieQi | undefined
}

/**
 * 获取所有「节」（用于月柱界限）
 */
export function getAllJie(): readonly string[] {
  return MONTH_JIE
}

// ========================================
// 内部数据表
// ========================================

/**
 * 节气年历序数据表 (从小寒到冬至)
 * longitude = 太阳视黄经 (°); approxDate = 牛顿迭代初值用的近似公历日期 (MM-DD)
 */
const JIEQI_ORDER_TABLE: readonly JieQi[] = [
  { name: '小寒', longitude: 285, approxDate: '01-06', monthIndex: 0, type: 'jie' },
  { name: '大寒', longitude: 300, approxDate: '01-20', monthIndex: 0, type: 'qi' },
  { name: '立春', longitude: 315, approxDate: '02-04', monthIndex: 1, type: 'jie' },
  { name: '雨水', longitude: 330, approxDate: '02-19', monthIndex: 1, type: 'qi' },
  { name: '惊蛰', longitude: 345, approxDate: '03-06', monthIndex: 2, type: 'jie' },
  { name: '春分', longitude: 0, approxDate: '03-20', monthIndex: 2, type: 'qi' },
  { name: '清明', longitude: 15, approxDate: '04-05', monthIndex: 3, type: 'jie' },
  { name: '谷雨', longitude: 30, approxDate: '04-20', monthIndex: 3, type: 'qi' },
  { name: '立夏', longitude: 45, approxDate: '05-06', monthIndex: 4, type: 'jie' },
  { name: '小满', longitude: 60, approxDate: '05-21', monthIndex: 4, type: 'qi' },
  { name: '芒种', longitude: 75, approxDate: '06-06', monthIndex: 5, type: 'jie' },
  { name: '夏至', longitude: 90, approxDate: '06-21', monthIndex: 5, type: 'qi' },
  { name: '小暑', longitude: 105, approxDate: '07-07', monthIndex: 6, type: 'jie' },
  { name: '大暑', longitude: 120, approxDate: '07-23', monthIndex: 6, type: 'qi' },
  { name: '立秋', longitude: 135, approxDate: '08-07', monthIndex: 7, type: 'jie' },
  { name: '处暑', longitude: 150, approxDate: '08-23', monthIndex: 7, type: 'qi' },
  { name: '白露', longitude: 165, approxDate: '09-08', monthIndex: 8, type: 'jie' },
  { name: '秋分', longitude: 180, approxDate: '09-23', monthIndex: 8, type: 'qi' },
  { name: '寒露', longitude: 195, approxDate: '10-08', monthIndex: 9, type: 'jie' },
  { name: '霜降', longitude: 210, approxDate: '10-23', monthIndex: 9, type: 'qi' },
  { name: '立冬', longitude: 225, approxDate: '11-07', monthIndex: 10, type: 'jie' },
  { name: '小雪', longitude: 240, approxDate: '11-22', monthIndex: 10, type: 'qi' },
  { name: '大雪', longitude: 255, approxDate: '12-07', monthIndex: 11, type: 'jie' },
  { name: '冬至', longitude: 270, approxDate: '12-22', monthIndex: 11, type: 'qi' },
] as const
