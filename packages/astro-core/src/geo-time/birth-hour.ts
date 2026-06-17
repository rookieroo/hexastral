/**
 * @zhop/astro-core — 出生时刻解析 (Birth-Hour Resolver)
 *
 * 排盘前唯一的「出生时间 → 排盘小时」入口。客户端(solo)与服务端(合盘)共用同一份
 * 逻辑，保证同一个人在两处得到一致的时柱。
 *
 * 两种精度模式:
 *
 *  1. 时辰模式 (shichen) —— 用户只从十二时辰轮里选了一个时辰。
 *     用该时辰的「中点」作代表小时，**永不做真太阳时校准**。
 *     真太阳时修正需要精确钟点；时辰已经把分钟丢掉了，对一个粗粒度时辰再修正只会
 *     系统性地把它推到相邻时辰（旧实现的 bug）。中点距两侧边界各 1 小时，是「只知道
 *     时辰」时唯一稳健的代表点。
 *
 *  2. 精确模式 (clock) —— 用户录入了精确出生钟点 (clockMinutes)。
 *     这才是真太阳时校准有意义的唯一形态：拿真实钟点 → 经度/时差/DST 修正 → 时辰。
 *     calibrate 默认 true；仅当同时提供 longitude 时才真正执行。
 *
 * 跨午夜处理: 校准可能把午夜附近的时间推到前一/后一日，从而改变日柱。本解析器返回
 * 校准后的「真太阳时日历日期」，由 getFourPillars 在其上再套 23:00 起子时的换日约定。
 */

import { getTrueSolarTime } from '../solar-time'
import { calcGlobalTrueSolarTime, type GlobalSolarTimeResult } from './solar-time'

export interface BirthHourInput {
  /** 公历年 */
  year: number
  /** 公历月 1-12 */
  month: number
  /** 公历日 */
  day: number
  /** 时辰序号 0-12（0=早子时, 12=晚子时）。clockMinutes 存在时忽略此值。 */
  timeIndex?: number | null
  /** 精确出生时间：当天 00:00 起的分钟数 0-1439。存在 = 精确模式。 */
  clockMinutes?: number | null
  /** 是否对精确钟点做真太阳时校准（默认 true）。仅在精确模式 + 有经度时生效。 */
  calibrate?: boolean
  /** 经度（东经正、西经负）。校准必需。 */
  longitude?: number | null
  /** IANA 时区 ID。有则走全球引擎（含历史 DST）；无则退回纯经度修正。 */
  timezoneId?: string | null
  /** 城市名（仅用于 displayNote 展示）。 */
  city?: string | null
}

export type BirthTimeMode = 'shichen' | 'clock'

export interface ResolvedBirthHour {
  /** 排盘使用的公历年（校准跨午夜时可能与输入不同）。 */
  year: number
  /** 排盘使用的公历月 1-12。 */
  month: number
  /** 排盘使用的公历日。 */
  day: number
  /** 排盘使用的小时 0-23（已含校准），供 getFourPillars / hourGanZhi 使用。 */
  hour: number
  /** 排盘使用的分钟 0-59（展示用；排盘本身只用 hour）。 */
  minute: number
  /** 输入精度模式。 */
  mode: BirthTimeMode
  /** 是否实际执行了真太阳时校准。 */
  calibrated: boolean
  /** 校准明细（仅 calibrated 时存在），用于 UI「钟点 → 真太阳时」前后对比。 */
  solarTimeResult?: GlobalSolarTimeResult
}

/**
 * 时辰序号 → 该时辰的「中点」小时。
 *
 * 关键修复: 旧实现用 `2*idx - 1`（时辰左边界，如未时→13:00），任何负向修正都会把
 * 时辰推到前一格。中点（未时→14:00）距两侧边界各 1 小时。
 *
 * 0=早子(00-01)→0, 1=丑(01-03)→2, 2=寅(03-05)→4, ..., 7=未(13-15)→14,
 * ..., 11=亥(21-23)→22, 12=晚子(23-24)→23
 */
export function shichenMidpointHour(timeIndex: number): number {
  if (timeIndex <= 0) return 0 // 早子时 00:00-01:00
  if (timeIndex >= 12) return 23 // 晚子时 23:00-24:00
  return timeIndex * 2 // 丑=1→2, 寅=2→4, ..., 未=7→14, ..., 亥=11→22
}

/**
 * Clock hour (0–23) → shichen timeIndex (0–12) — the inverse of
 * {@link shichenMidpointHour}. 0:00 = 早子(0), 23:00 = 晚子(12); each other shichen
 * spans two hours (h ∈ {2i−1, 2i} → i). Used to排盘 紫微 (which keys on timeIndex)
 * from a clock-hour-based birth input.
 */
export function timeIndexFromHour(hour: number): number {
  const h = Math.max(0, Math.min(23, Math.floor(hour)))
  if (h === 0) return 0 // 早子
  if (h === 23) return 12 // 晚子
  return Math.floor((h + 1) / 2) // 1,2→丑(1); 3,4→寅(2); … 21,22→亥(11)
}

/**
 * 解析出生时刻 → 排盘小时 (+ 可能位移的日历日期)。
 *
 * @example 时辰模式（永不校准）
 * resolveBirthHour({ year: 1995, month: 7, day: 15, timeIndex: 7 })
 * // → { hour: 14, mode: 'shichen', calibrated: false }  (未时中点)
 *
 * @example 精确模式 + 校准（纽约夏季 14:30 → 真太阳时约 13:38）
 * resolveBirthHour({
 *   year: 1995, month: 7, day: 15, clockMinutes: 14 * 60 + 30,
 *   longitude: -74.006, timezoneId: 'America/New_York',
 * })
 * // → { hour: 13, mode: 'clock', calibrated: true, solarTimeResult: {...} }
 */
export function resolveBirthHour(input: BirthHourInput): ResolvedBirthHour {
  const { year, month, day, clockMinutes } = input

  // ── 精确模式: clockMinutes 存在 ──────────────────────────────────────────
  if (clockMinutes != null) {
    const baseHour = Math.floor(clockMinutes / 60)
    const baseMinute = clockMinutes % 60
    const calibrate = input.calibrate !== false // 默认开

    if (calibrate && input.longitude != null) {
      const localDatetime = new Date(year, month - 1, day, baseHour, baseMinute, 0)

      if (input.timezoneId) {
        // 全球引擎: IANA 时区 + 历史 DST + 经度 + 时差方程
        const solarTimeResult = calcGlobalTrueSolarTime({
          localDatetime,
          timezoneId: input.timezoneId,
          longitude: input.longitude,
          cityName: input.city ?? undefined,
        })
        const t = solarTimeResult.trueSolarTime
        return {
          year: t.getFullYear(),
          month: t.getMonth() + 1,
          day: t.getDate(),
          hour: t.getHours(),
          minute: t.getMinutes(),
          mode: 'clock',
          calibrated: true,
          solarTimeResult,
        }
      }

      // 退回: 纯经度修正（无时区 → 无历史 DST，按 120°E 基准）
      const { date: corrected } = getTrueSolarTime(localDatetime, input.longitude)
      return {
        year: corrected.getFullYear(),
        month: corrected.getMonth() + 1,
        day: corrected.getDate(),
        hour: corrected.getHours(),
        minute: corrected.getMinutes(),
        mode: 'clock',
        calibrated: true,
      }
    }

    // 精确但不校准: 直接用钟点
    return {
      year,
      month,
      day,
      hour: baseHour,
      minute: baseMinute,
      mode: 'clock',
      calibrated: false,
    }
  }

  // ── 时辰模式: 用中点，永不校准 ───────────────────────────────────────────
  const hour = shichenMidpointHour(input.timeIndex ?? 0)
  return { year, month, day, hour, minute: 0, mode: 'shichen', calibrated: false }
}
