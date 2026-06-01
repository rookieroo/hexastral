/**
 * @zhop/astro-core — 时辰计算
 *
 * 十二时辰系统：地支对应时段 + 天干配时辰。
 */

import { SHI_CHEN_TABLE } from './constants'
import { hourGanZhi } from './ganzhi'
import type { EarthlyBranch, GanZhi, ShiChen } from './types'

/**
 * 根据小时获取时辰
 *
 * @param hour 24小时制 (0-23)
 * @returns 时辰信息
 */
export function getShiChen(hour: number): ShiChen {
  // 23:00-00:59 → 子时, 01:00-02:59 → 丑时, ...
  if (hour === 23 || hour === 0) {
    return SHI_CHEN_TABLE[0]!
  }
  const idx = Math.floor((hour + 1) / 2)
  return SHI_CHEN_TABLE[idx]!
}

/**
 * 获取当前时辰名称（兼容旧版 getCurrentShiChen）
 */
export function getCurrentShiChen(): string {
  return getShiChen(new Date().getHours()).name
}

/**
 * 获取时辰的天干地支（需要日干索引）
 *
 * @param dayStemIndex 日干索引 (0=甲)
 * @param hour 24小时制
 * @returns 时干支
 */
export function getShiChenGanZhi(dayStemIndex: number, hour: number): GanZhi {
  return hourGanZhi(dayStemIndex, hour)
}

/**
 * 获取完整时辰信息（含干支）
 */
export function getFullShiChen(dayStemIndex: number, hour: number): ShiChen & { ganZhi: GanZhi } {
  const shiChen = getShiChen(hour)
  const ganZhi = hourGanZhi(dayStemIndex, hour)
  return { ...shiChen, ganZhi }
}

/**
 * 根据地支获取时辰
 */
export function shiChenByBranch(branch: EarthlyBranch): ShiChen {
  const found = SHI_CHEN_TABLE.find((s) => s.branch === branch)
  if (!found) throw new Error(`Invalid branch: ${branch}`)
  return found
}

/**
 * 所有十二时辰（用于 UI 展示）
 */
export function allShiChen(): readonly ShiChen[] {
  return SHI_CHEN_TABLE
}
