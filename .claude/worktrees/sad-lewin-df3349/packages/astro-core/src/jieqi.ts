/**
 * @zhop/astro-core — 二十四节气计算
 *
 * 基于太阳黄经的节气推算。
 * 使用寿星天文历的简化算法（精度 ±1 天）。
 *
 * 原理:
 * - 太阳黄经每 15° 为一个节气
 * - 春分 = 0°, 清明 = 15°, ... 冬至 = 270°
 * - 通过平均日期 + 修正量得到具体日期
 */

import { JIEQI_TABLE, MONTH_JIE } from './constants'
import type { JieQi } from './types'

/**
 * 节气近似日期表（公历）
 * 基于 1900-2100 年平均值，精度 ±1 天
 *
 * 格式: [月份][节气在该月中的序号 0/1][世纪修正]
 * 简化为: 直接给出每年每个节气的公历日计算公式
 */

/**
 * 计算某年某个节气的公历日期
 *
 * 使用寿星天文历简化公式:
 * D = [Y * D0 + C] - L
 * 其中 Y = 年份后两位, D0 = 0.2422, C = 世纪常数, L = 闰年数
 *
 * @param year 公历年份 (1900-2100)
 * @param jieqiIndex 节气索引 (按 JIEQI_ORDER 排序, 0=小寒, 23=冬至)
 * @returns 公历日 (几号)
 */
export function getJieQiDay(year: number, jieqiIndex: number): number {
  const Y = year % 100
  const L = Math.floor(Y / 4)

  // 世纪常数 C 和基础值 D0
  // 基于 20 世纪和 21 世纪的实测数据（表注释：c20=1900–1999，c21=2000–2099）
  // 注意：不得使用 Math.floor(year/100) 选表 — 2000–2099 的 floor 为 20，会误用 c20。
  const jieqiData = JIEQI_C_TABLE[jieqiIndex]
  if (!jieqiData) return 0

  const C = year >= 1900 && year <= 1999 ? jieqiData.c20 : jieqiData.c21
  const D = Math.floor(Y * 0.2422 + C) - L

  return D
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

  // 每月有 2 个节气
  // month 1 → 小寒(index 0) + 大寒(index 1)
  // month 2 → 立春(index 2) + 雨水(index 3)
  // ...
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

  // 如果日 >= 当月节，则属于当月
  // 否则属于上一个月
  if (day >= jieDay) {
    // 当月的节后 → 对应的月地支
    return jieToMonthBranchIndex(jieIdx)
  }

  // 当月节前 → 上个月
  const prevJieIdx = (jieIdx - 2 + 24) % 24
  return jieToMonthBranchIndex(prevJieIdx)
}

/**
 * 节气索引(按年历序) → 月地支索引(寅=0)
 */
function jieToMonthBranchIndex(jieIdx: number): number {
  // 小寒(0)→丑月(11), 立春(2)→寅月(0), 惊蛰(4)→卯月(1), ...
  // 每个「节」对应: jieIdx/2 对应的月 → 转为寅月起的索引
  const monthNum = Math.floor(jieIdx / 2) // 0=1月, 1=2月, ...
  // 寅月=2月, 索引 = (monthNum - 1 + 12) % 12
  // 1月→11(丑), 2月→0(寅), 3月→1(卯), ...
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

  const rows: Array<{ name: string; y: number; mo: number; d: number }> = []
  for (const jq of getYearJieQi(targetYear - 1).slice(-2)) {
    rows.push({ name: jq.jieqi.name, y: targetYear - 1, mo: jq.month, d: jq.day })
  }
  for (const jq of getYearJieQi(targetYear)) {
    rows.push({ name: jq.jieqi.name, y: targetYear, mo: jq.month, d: jq.day })
  }
  for (const jq of getYearJieQi(targetYear + 1).slice(0, 2)) {
    rows.push({ name: jq.jieqi.name, y: targetYear + 1, mo: jq.month, d: jq.day })
  }

  /** 该公历日中午（UTC+8）对应的 UTC 时刻，避免仅按 UTC 子夜错位 */
  const atShanghaiNoonUtc = (y: number, mo: number, d: number): Date =>
    new Date(Date.UTC(y, mo - 1, d, 4, 0, 0, 0))

  let prevJQ = { name: '冬至', y: targetYear - 1, mo: 12, d: 22 }
  let nextJQ = { name: '小寒', y: targetYear + 1, mo: 1, d: 6 }

  for (const row of rows) {
    const k = solarYmdKey(row.y, row.mo, row.d)
    if (k <= targetKey) {
      prevJQ = row
    } else {
      nextJQ = row
      break
    }
  }

  return {
    prev: { name: prevJQ.name, date: atShanghaiNoonUtc(prevJQ.y, prevJQ.mo, prevJQ.d) },
    next: { name: nextJQ.name, date: atShanghaiNoonUtc(nextJQ.y, nextJQ.mo, nextJQ.d) },
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

/**
 * 节气世纪常数表
 * C20 = 20世纪 (1900-1999), C21 = 21世纪 (2000-2099)
 * 基于寿星天文历数据
 */
const JIEQI_C_TABLE: readonly { c20: number; c21: number }[] = [
  { c20: 6.11, c21: 5.4055 }, // 小寒
  { c20: 20.84, c21: 20.12 }, // 大寒
  { c20: 4.15, c21: 3.87 }, // 立春
  { c20: 19.04, c21: 18.73 }, // 雨水
  { c20: 6.11, c21: 5.63 }, // 惊蛰
  { c20: 21.17, c21: 20.646 }, // 春分
  { c20: 5.59, c21: 4.81 }, // 清明
  { c20: 20.88, c21: 20.1 }, // 谷雨
  { c20: 6.318, c21: 5.52 }, // 立夏
  { c20: 21.86, c21: 21.04 }, // 小满
  { c20: 6.5, c21: 5.678 }, // 芒种
  { c20: 22.2, c21: 21.37 }, // 夏至
  { c20: 7.928, c21: 7.108 }, // 小暑
  { c20: 23.65, c21: 22.83 }, // 大暑
  { c20: 8.35, c21: 7.5 }, // 立秋
  { c20: 23.95, c21: 23.13 }, // 处暑
  { c20: 8.44, c21: 7.646 }, // 白露
  { c20: 23.822, c21: 23.042 }, // 秋分
  { c20: 8.95, c21: 8.318 }, // 寒露
  { c20: 24.12, c21: 23.438 }, // 霜降
  { c20: 8.08, c21: 7.438 }, // 立冬
  { c20: 22.83, c21: 22.36 }, // 小雪
  { c20: 7.9, c21: 7.18 }, // 大雪
  { c20: 22.6, c21: 21.94 }, // 冬至
] as const
