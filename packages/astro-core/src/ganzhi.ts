/**
 * @zhop/astro-core — 天干地支计算
 *
 * 提供年/月/日/时柱计算、四柱排盘。
 * 所有术数（八字、紫微、六爻纳甲）的基础。
 *
 * 关键约定:
 * - 年柱以「立春」为界（非农历正月初一）
 * - 月柱以「节」为界（立春/惊蛰/清明...）
 * - 日柱以子时（23:00）为界
 * - 时柱以天干配地支
 */

import { EARTHLY_BRANCHES, HEAVENLY_STEMS, SEXAGENARY_CYCLE } from './constants'
import type { DateTimeInput, EarthlyBranch, FourPillars, GanZhi, HeavenlyStem } from './types'

// ========================================
// 基础干支运算
// ========================================

/**
 * 根据索引获取天干（0-based, 0=甲）
 */
export function getStem(index: number): HeavenlyStem {
  return HEAVENLY_STEMS[((index % 10) + 10) % 10]!
}

/**
 * 根据索引获取地支（0-based, 0=子）
 */
export function getBranch(index: number): EarthlyBranch {
  return EARTHLY_BRANCHES[((index % 12) + 12) % 12]!
}

/**
 * 构造干支对象
 */
export function makeGanZhi(stemIndex: number, branchIndex: number): GanZhi {
  const stem = getStem(stemIndex)
  const branch = getBranch(branchIndex)
  const label = `${stem}${branch}`
  const index = SEXAGENARY_CYCLE.indexOf(label) + 1
  return { stem, branch, index, label }
}

/**
 * 通过六十甲子序号 (1-60) 获取干支
 */
export function ganZhiFromIndex(idx: number): GanZhi {
  const i = (((idx - 1) % 60) + 60) % 60
  const label = SEXAGENARY_CYCLE[i]!
  const stem = label[0] as HeavenlyStem
  const branch = label[1] as EarthlyBranch
  return { stem, branch, index: i + 1, label }
}

// ========================================
// 年柱
// ========================================

/**
 * 计算年干支
 *
 * 公元年份 → 干支:
 * - 天干: (year - 4) % 10
 * - 地支: (year - 4) % 12
 *
 * 注意: 此函数不判断立春，调用方需根据节气调整年份。
 * 公元前 4 年 = 甲子年。
 */
export function yearGanZhi(year: number): GanZhi {
  const stemIdx = (((year - 4) % 10) + 10) % 10
  const branchIdx = (((year - 4) % 12) + 12) % 12
  return makeGanZhi(stemIdx, branchIdx)
}

/**
 * 获取生肖
 */
export function yearZodiac(year: number): string {
  const zodiac = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']
  return zodiac[(((year - 4) % 12) + 12) % 12]!
}

// ========================================
// 月柱
// ========================================

/**
 * 计算月干支
 *
 * @param yearStemIndex 年干索引 (0=甲)
 * @param monthBranchIndex 月地支索引 (0=寅月/正月, 1=卯月/二月, ...)
 *
 * 五虎遁月法:
 * - 甲/己年 → 丙寅月起
 * - 乙/庚年 → 戊寅月起
 * - 丙/辛年 → 庚寅月起
 * - 丁/壬年 → 壬寅月起
 * - 戊/癸年 → 甲寅月起
 */
export function monthGanZhi(yearStemIndex: number, monthBranchIndex: number): GanZhi {
  // 五虎遁起始天干: 年干 % 5 → 寅月天干偏移
  const startStem = ((yearStemIndex % 5) * 2 + 2) % 10
  const stemIdx = (startStem + monthBranchIndex) % 10
  // 月地支: 寅=2, 卯=3, ..., 丑=1 (寅月起始对应地支索引 2)
  const branchIdx = (monthBranchIndex + 2) % 12
  return makeGanZhi(stemIdx, branchIdx)
}

// ========================================
// 日柱
// ========================================

/**
 * 计算儒略日数 (Julian Day Number)
 * 用于日柱计算的中间步骤
 */
export function toJulianDay(year: number, month: number, day: number): number {
  let y = year
  let m = month
  if (m <= 2) {
    y -= 1
    m += 12
  }
  const A = Math.floor(y / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5
}

/**
 * 计算日干支
 *
 * 基于儒略日的推算法:
 * 以 2000-01-07 (JD 2451551.5) 为甲子日基准
 */
export function dayGanZhi(year: number, month: number, day: number): GanZhi {
  const jd = toJulianDay(year, month, day)
  // 2000-01-07 = 甲子日, JD = 2451551.5 (noon) → 取整 2451551
  const baseJD = 2451550.5 // 2000-01-06 midnight (甲子日起始)
  const diff = Math.floor(jd - baseJD)
  const idx = ((diff % 60) + 60) % 60
  const stemIdx = idx % 10
  const branchIdx = idx % 12
  return makeGanZhi(stemIdx, branchIdx)
}

// ========================================
// 时柱
// ========================================

/**
 * 计算时干支
 *
 * @param dayStemIndex 日干索引 (0=甲)
 * @param hour 24小时制 (0-23)
 *
 * 五鼠遁时法:
 * - 甲/己日 → 甲子时起
 * - 乙/庚日 → 丙子时起
 * - 丙/辛日 → 戊子时起
 * - 丁/壬日 → 庚子时起
 * - 戊/癸日 → 壬子时起
 */
export function hourGanZhi(dayStemIndex: number, hour: number): GanZhi {
  // 时辰地支索引: 23-1→子(0), 1-3→丑(1), ...
  const branchIdx = hour === 23 ? 0 : Math.floor((hour + 1) / 2)
  // 五鼠遁起始天干
  const startStem = ((dayStemIndex % 5) * 2) % 10
  const stemIdx = (startStem + branchIdx) % 10
  return makeGanZhi(stemIdx, branchIdx)
}

// ========================================
// 四柱排盘
// ========================================

/**
 * 获取四柱（简化版 — 不做真太阳时/节气精确修正）
 *
 * 如需精确排盘, 应先用 solar-time 模块做真太阳时修正,
 * 再用 jieqi 模块判断年/月边界。
 *
 * @param input 日期时间输入
 * @returns 四柱
 */
export function getFourPillars(input: DateTimeInput): FourPillars {
  const { year, month, day, hour = 12 } = input

  // 年柱 — 简化：以公历年份直接算（精确版应判断立春）
  const yearPillar = yearGanZhi(year)

  // 月柱 — 简化：以公历月份近似（精确版应以节为界）
  // 寅月(正月)=公历约2月, 月地支索引 = (month - 2 + 12) % 12 → 但要用 month
  // 1月→丑(11), 2月→寅(0), 3月→卯(1), ...
  const monthBranchIdx = (month + 10) % 12
  const yearStemIdx = HEAVENLY_STEMS.indexOf(yearPillar.stem)
  const monthPillar = monthGanZhi(yearStemIdx, monthBranchIdx)

  // 日柱
  // 注意: 子时(23:00-01:00)跨日，23点算次日日柱
  const adjustedYear = hour >= 23 ? (month === 12 && day === 31 ? year + 1 : year) : year
  const adjustedMonth =
    hour >= 23 ? (day === daysInMonth(year, month) ? (month % 12) + 1 : month) : month
  const adjustedDay = hour >= 23 ? (day === daysInMonth(year, month) ? 1 : day + 1) : day
  const dayPillar = dayGanZhi(adjustedYear, adjustedMonth, adjustedDay)

  // 时柱
  const dayStemIdx = HEAVENLY_STEMS.indexOf(dayPillar.stem)
  const hourPillar = hourGanZhi(dayStemIdx, hour)

  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
  }
}

/**
 * 某月有多少天
 */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

// ========================================
// 生肖与纳音
// ========================================

/**
 * 六十甲子纳音五行
 * 每两对共一纳音，共 30 组
 */
const NAYIN_TABLE: readonly string[] = [
  '海中金',
  '海中金',
  '炉中火',
  '炉中火',
  '大林木',
  '大林木',
  '路旁土',
  '路旁土',
  '剑锋金',
  '剑锋金',
  '山头火',
  '山头火',
  '涧下水',
  '涧下水',
  '城头土',
  '城头土',
  '白蜡金',
  '白蜡金',
  '杨柳木',
  '杨柳木',
  '泉中水',
  '泉中水',
  '屋上土',
  '屋上土',
  '霹雳火',
  '霹雳火',
  '松柏木',
  '松柏木',
  '长流水',
  '长流水',
  '砂石金',
  '砂石金',
  '山下火',
  '山下火',
  '平地木',
  '平地木',
  '壁上土',
  '壁上土',
  '金箔金',
  '金箔金',
  '覆灯火',
  '覆灯火',
  '天河水',
  '天河水',
  '大驿土',
  '大驿土',
  '钗钏金',
  '钗钏金',
  '桑拓木',
  '桑拓木',
  '大溪水',
  '大溪水',
  '沙中土',
  '沙中土',
  '天上火',
  '天上火',
  '石榴木',
  '石榴木',
  '大海水',
  '大海水',
] as const

/**
 * 获取纳音五行
 * @param gz 干支对象
 */
export function getNaYin(gz: GanZhi): string {
  return NAYIN_TABLE[(gz.index - 1) % 60] ?? ''
}
