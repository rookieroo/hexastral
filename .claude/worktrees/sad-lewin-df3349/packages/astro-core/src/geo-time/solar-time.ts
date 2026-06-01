/**
 * @zhop/astro-core — 全球真太阳时引擎 (Geo-Time Solar Time)
 *
 * 增强版真太阳时计算，支持:
 * - 任意经度（不限中国，覆盖全球 -180° ~ +180°）
 * - IANA 时区 ID（如 "America/New_York"）
 * - 历史 DST 自动处理（依赖 Intl.DateTimeFormat / Temporal）
 *
 * 流程: localTime → UTC → 经度修正 → 时差方程 → trueSolarTime
 *
 * 参考: PRD §5.3.1
 */

import { equationOfTime } from '../solar-time'

// ========================================
// 类型定义
// ========================================

/** 城市地理信息 */
export interface CityGeoInfo {
  /** 标准城市名（英文） */
  name: string
  /** 中文名（可选） */
  nameZh?: string
  /** 纬度（负数 = 南半球） */
  latitude: number
  /** 经度（负数 = 西经） */
  longitude: number
  /** IANA timezone ID，如 "America/New_York" */
  timezone: string
  /** ISO 3166-1 alpha-2 国家码 */
  country: string
}

/** 全球真太阳时计算结果 */
export interface GlobalSolarTimeResult {
  /** 用户输入的本地时间 */
  localTime: Date
  /** UTC 时间 */
  utcTime: Date
  /** 当地是否处于夏令时 */
  isDST: boolean
  /** DST 偏移（分钟） */
  dstOffsetMinutes: number
  /** 经度修正（分钟） */
  longitudeCorrectionMinutes: number
  /** 时差方程值（分钟） */
  equationOfTimeMinutes: number
  /** 最终真太阳时 */
  trueSolarTime: Date
  /** UI 展示说明 */
  displayNote: string
}

// ========================================
// 海外城市经纬度扩展表
// ========================================

/**
 * 海外华人高频城市经纬度 + 时区
 *
 * 按 PRD 目标市场优先级排列:
 * 1. 北美（美加）
 * 2. 东南亚
 * 3. 澳新
 * 4. 欧洲
 */
export const GLOBAL_CITIES: ReadonlyArray<CityGeoInfo> = [
  // 北美
  {
    name: 'New York',
    nameZh: '纽约',
    latitude: 40.7128,
    longitude: -74.006,
    timezone: 'America/New_York',
    country: 'US',
  },
  {
    name: 'Los Angeles',
    nameZh: '洛杉矶',
    latitude: 34.0522,
    longitude: -118.2437,
    timezone: 'America/Los_Angeles',
    country: 'US',
  },
  {
    name: 'San Francisco',
    nameZh: '旧金山',
    latitude: 37.7749,
    longitude: -122.4194,
    timezone: 'America/Los_Angeles',
    country: 'US',
  },
  {
    name: 'Chicago',
    nameZh: '芝加哥',
    latitude: 41.8781,
    longitude: -87.6298,
    timezone: 'America/Chicago',
    country: 'US',
  },
  {
    name: 'Houston',
    nameZh: '休斯顿',
    latitude: 29.7604,
    longitude: -95.3698,
    timezone: 'America/Chicago',
    country: 'US',
  },
  {
    name: 'Seattle',
    nameZh: '西雅图',
    latitude: 47.6062,
    longitude: -122.3321,
    timezone: 'America/Los_Angeles',
    country: 'US',
  },
  {
    name: 'Boston',
    nameZh: '波士顿',
    latitude: 42.3601,
    longitude: -71.0589,
    timezone: 'America/New_York',
    country: 'US',
  },
  {
    name: 'Toronto',
    nameZh: '多伦多',
    latitude: 43.6532,
    longitude: -79.3832,
    timezone: 'America/Toronto',
    country: 'CA',
  },
  {
    name: 'Vancouver',
    nameZh: '温哥华',
    latitude: 49.2827,
    longitude: -123.1207,
    timezone: 'America/Vancouver',
    country: 'CA',
  },

  // 东南亚
  {
    name: 'Singapore',
    nameZh: '新加坡',
    latitude: 1.3521,
    longitude: 103.8198,
    timezone: 'Asia/Singapore',
    country: 'SG',
  },
  {
    name: 'Kuala Lumpur',
    nameZh: '吉隆坡',
    latitude: 3.139,
    longitude: 101.6869,
    timezone: 'Asia/Kuala_Lumpur',
    country: 'MY',
  },
  {
    name: 'Bangkok',
    nameZh: '曼谷',
    latitude: 13.7563,
    longitude: 100.5018,
    timezone: 'Asia/Bangkok',
    country: 'TH',
  },
  {
    name: 'Jakarta',
    nameZh: '雅加达',
    latitude: -6.2088,
    longitude: 106.8456,
    timezone: 'Asia/Jakarta',
    country: 'ID',
  },
  {
    name: 'Manila',
    nameZh: '马尼拉',
    latitude: 14.5995,
    longitude: 120.9842,
    timezone: 'Asia/Manila',
    country: 'PH',
  },
  {
    name: 'Ho Chi Minh City',
    nameZh: '胡志明市',
    latitude: 10.8231,
    longitude: 106.6297,
    timezone: 'Asia/Ho_Chi_Minh',
    country: 'VN',
  },

  // 澳新
  {
    name: 'Sydney',
    nameZh: '悉尼',
    latitude: -33.8688,
    longitude: 151.2093,
    timezone: 'Australia/Sydney',
    country: 'AU',
  },
  {
    name: 'Melbourne',
    nameZh: '墨尔本',
    latitude: -37.8136,
    longitude: 144.9631,
    timezone: 'Australia/Melbourne',
    country: 'AU',
  },
  {
    name: 'Auckland',
    nameZh: '奥克兰',
    latitude: -36.8485,
    longitude: 174.7633,
    timezone: 'Pacific/Auckland',
    country: 'NZ',
  },

  // 欧洲
  {
    name: 'London',
    nameZh: '伦敦',
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: 'Europe/London',
    country: 'GB',
  },
  {
    name: 'Paris',
    nameZh: '巴黎',
    latitude: 48.8566,
    longitude: 2.3522,
    timezone: 'Europe/Paris',
    country: 'FR',
  },

  // 东亚（补充）
  {
    name: 'Tokyo',
    nameZh: '东京',
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: 'Asia/Tokyo',
    country: 'JP',
  },
  {
    name: 'Seoul',
    nameZh: '首尔',
    latitude: 37.5665,
    longitude: 126.978,
    timezone: 'Asia/Seoul',
    country: 'KR',
  },
  {
    name: 'Taipei',
    nameZh: '台北',
    latitude: 25.033,
    longitude: 121.5654,
    timezone: 'Asia/Taipei',
    country: 'TW',
  },
  {
    name: 'Hong Kong',
    nameZh: '香港',
    latitude: 22.3193,
    longitude: 114.1694,
    timezone: 'Asia/Hong_Kong',
    country: 'HK',
  },
] as const

// ========================================
// 核心函数
// ========================================

/**
 * 按名称搜索城市（模糊匹配中英文）
 *
 * @param query 搜索文本
 * @returns 匹配的城市列表
 */
export function searchCity(query: string): CityGeoInfo[] {
  const q = query.toLowerCase().trim()
  if (!q) return []

  return GLOBAL_CITIES.filter(
    (city) =>
      city.name.toLowerCase().includes(q) ||
      (city.nameZh && city.nameZh.includes(q)) ||
      city.country.toLowerCase() === q
  )
}

/**
 * 获取指定日期和时区的 UTC 偏移量（含 DST）
 *
 * 利用 Intl.DateTimeFormat 获取历史时区信息，
 * 浏览器 / Node.js / Cloudflare Workers 均支持。
 *
 * @param date 本地日期
 * @param timezoneId IANA timezone ID
 * @returns UTC 偏移（分钟）和 DST 状态
 */
export function getTimezoneOffset(
  date: Date,
  timezoneId: string
): { offsetMinutes: number; isDST: boolean } {
  // 利用 Intl 格式化获取时区信息
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezoneId,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const get = (type: string) =>
    Number.parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10)

  // 构造该时区的本地时间
  const localYear = get('year')
  const localMonth = get('month') - 1
  const localDay = get('day')
  const localHour = get('hour') === 24 ? 0 : get('hour')
  const localMinute = get('minute')
  const localSecond = get('second')

  const localAsUtc = Date.UTC(localYear, localMonth, localDay, localHour, localMinute, localSecond)
  const utcTime = date.getTime()

  // offset = local - UTC (分钟)
  const offsetMinutes = Math.round((localAsUtc - utcTime) / 60000)

  // DST 检测: 比较 1 月和 7 月的偏移量
  const jan = new Date(date.getFullYear(), 0, 1)
  const jul = new Date(date.getFullYear(), 6, 1)
  const janOffset = getBasicOffset(jan, timezoneId)
  const julOffset = getBasicOffset(jul, timezoneId)
  const standardOffset = Math.min(janOffset, julOffset)
  const isDST = offsetMinutes !== standardOffset

  return { offsetMinutes, isDST }
}

/**
 * 获取基础偏移量（内部辅助）
 */
function getBasicOffset(date: Date, timezoneId: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezoneId,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const get = (type: string) =>
    Number.parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10)

  const localAsUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') === 24 ? 0 : get('hour'),
    get('minute'),
    get('second')
  )

  return Math.round((localAsUtc - date.getTime()) / 60000)
}

/**
 * 全球真太阳时计算
 *
 * 完整流程:
 * 1. localTime → UTC（使用 IANA 时区 + 历史 DST）
 * 2. UTC → 经度修正
 * 3. 时差方程 (Equation of Time)
 * 4. → 真太阳时
 *
 * @param params 输入参数
 * @returns 真太阳时计算结果
 *
 * @example
 * ```ts
 * const result = calcGlobalTrueSolarTime({
 *   localDatetime: new Date('1995-07-15T14:30:00'),
 *   timezoneId: 'America/New_York',
 *   longitude: -74.006,
 * })
 * // result.trueSolarTime → 约 13:42 (真太阳时)
 * // result.isDST → true (1995 年 7 月纽约实行夏令时)
 * ```
 */
export function calcGlobalTrueSolarTime(params: {
  localDatetime: Date
  timezoneId: string
  longitude: number
  cityName?: string
}): GlobalSolarTimeResult {
  const { localDatetime, timezoneId, longitude, cityName } = params

  // 1. 获取时区偏移（含 DST）
  const { offsetMinutes, isDST } = getTimezoneOffset(localDatetime, timezoneId)
  const dstOffsetMinutes = isDST ? 60 : 0 // 标准 DST 偏移为 1 小时

  // 2. 推算 UTC 时间
  // localTime = UTC + offsetMinutes
  // UTC = localTime - offsetMinutes
  const utcTime = new Date(localDatetime.getTime() - offsetMinutes * 60000)

  // 3. 经度修正
  // 标准子午线 = 时区偏移 / 60 * 15°
  const standardMeridian = (offsetMinutes / 60) * 15
  const longitudeCorrectionMinutes = ((longitude - standardMeridian) / 15) * 60

  // 4. 时差方程
  const eotMinutes = equationOfTime(utcTime)

  // 5. 真太阳时 = UTC + 经度修正 + 时差方程
  const trueSolarTime = new Date(
    utcTime.getTime() + (longitudeCorrectionMinutes + eotMinutes) * 60000
  )

  // 6. 生成展示说明
  const absLng = Math.abs(longitude).toFixed(2)
  const lngDir = longitude >= 0 ? 'E' : 'W'
  const location = cityName ?? `${absLng}° ${lngDir}`
  const dstNote = isDST ? ', DST applied' : ''
  const originalTime = formatTime(localDatetime)
  const correctedTime = formatTime(trueSolarTime)

  const displayNote = `Based on ${location} (${absLng}° ${lngDir}${dstNote}), birth time ${originalTime} → True Solar Time ${correctedTime}.`

  return {
    localTime: localDatetime,
    utcTime,
    isDST,
    dstOffsetMinutes,
    longitudeCorrectionMinutes,
    equationOfTimeMinutes: eotMinutes,
    trueSolarTime,
    displayNote,
  }
}

// ========================================
// 内部工具
// ========================================

/** 格式化时间为 HH:MM */
function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}
