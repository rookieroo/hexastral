/**
 * @zhop/astro-core — 真太阳时修正
 *
 * 命理排盘必须用「真太阳时」而非北京时间。
 *
 * 真太阳时 = 地方平太阳时 + 时差方程
 * 地方平太阳时 = 北京时间 + (经度 - 120°) × 4分钟/度
 *
 * 时差方程 (Equation of Time) 由地球轨道偏心率和地轴倾斜导致,
 * 每年周期性变化, 范围约 -14 ~ +16 分钟。
 */

import type { TrueSolarTime } from './types'

/**
 * 计算真太阳时
 *
 * @param date 北京时间 (UTC+8) 的 Date 对象
 * @param longitude 观测点东经度数 (e.g. 北京=116.4, 上海=121.5, 成都=104.1)
 * @returns 真太阳时信息
 */
export function getTrueSolarTime(date: Date, longitude: number): TrueSolarTime {
  // 1. 经度修正: 以东经 120° (北京时间基准经线) 为参考
  // 每偏 1° = 4 分钟
  const longitudeCorrection = (longitude - 120) * 4

  // 2. 时差方程 (Equation of Time)
  const eot = equationOfTime(date)

  // 3. 总修正量 (分钟)
  const totalCorrection = longitudeCorrection + eot

  // 4. 修正后的时间
  const correctedDate = new Date(date.getTime() + totalCorrection * 60 * 1000)

  return {
    date: correctedDate,
    equationOfTime: eot,
    longitudeCorrection,
    totalCorrection,
  }
}

/**
 * 时差方程 (Equation of Time)
 *
 * 使用简化正弦近似公式 (Spencer, 1971):
 * EoT ≈ -7.655·sin(B) + 9.873·sin(2B + 3.5932)
 * 其中 B = 360/364 × (N - 81), N = 年中日序号
 *
 * 精度: ±30 秒, 对命理排盘完全足够
 *
 * @returns 时差方程值（分钟）
 */
export function equationOfTime(date: Date): number {
  const dayOfYear = getDayOfYear(date)
  const B = ((2 * Math.PI) / 364) * (dayOfYear - 81)
  return -7.655 * Math.sin(B) + 9.873 * Math.sin(2 * B + 3.5932)
}

/**
 * 便捷函数: 直接获取真太阳时的时辰
 *
 * @param date 北京时间
 * @param longitude 东经度数
 * @returns 真太阳时的小时 (0-23)
 */
export function getTrueSolarHour(date: Date, longitude: number): number {
  const { date: corrected } = getTrueSolarTime(date, longitude)
  return corrected.getHours()
}

/**
 * 中国主要城市经度表
 * 用于快速查询, 省去用户手动输入经度
 */
export const CITY_LONGITUDES: Record<string, number> = {
  // 直辖市
  北京: 116.407,
  上海: 121.474,
  天津: 117.19,
  重庆: 106.551,
  // 省会
  哈尔滨: 126.535,
  长春: 125.324,
  沈阳: 123.431,
  呼和浩特: 111.751,
  石家庄: 114.514,
  太原: 112.549,
  济南: 117.0,
  郑州: 113.665,
  西安: 108.94,
  兰州: 103.834,
  银川: 106.23,
  西宁: 101.778,
  乌鲁木齐: 87.617,
  成都: 104.066,
  贵阳: 106.713,
  昆明: 102.712,
  拉萨: 91.171,
  南京: 118.797,
  合肥: 117.283,
  杭州: 120.153,
  福州: 119.306,
  南昌: 115.892,
  长沙: 112.982,
  武汉: 114.305,
  广州: 113.264,
  南宁: 108.367,
  海口: 110.35,
  // 特别行政区
  香港: 114.174,
  澳门: 113.549,
  台北: 121.565,
}

/**
 * 根据城市名获取经度（找不到则返回 undefined）
 */
export function getCityLongitude(city: string): number | undefined {
  return CITY_LONGITUDES[city]
}

// ========================================
// 内部工具
// ========================================

/**
 * 获取年中日序号 (Day of Year, 1-366)
 */
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / 86400000)
}
