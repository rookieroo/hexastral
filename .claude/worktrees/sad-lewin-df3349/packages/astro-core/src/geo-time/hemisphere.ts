/**
 * @zhop/astro-core — 南半球月令置换引擎
 *
 * 子平八字的调候底层逻辑是"气候与节气"，南北半球季节相差 6 个月（地支六冲）。
 * 若不置换，悉尼 7 月出生者被判"午月火旺极缺水"——完全南辕北辙。
 *
 * 置换规则: 月支六冲对换（其余三柱不变）
 * 叠加顺序: 南半球置换 → 调候用神（基于置换后新月支读表）→ 格局分析
 *
 * 参考: PRD §5.3.2
 */

import type { EarthlyBranch, FourPillars } from '../types'

// ========================================
// 类型定义
// ========================================

/** 南半球置换结果 */
export interface HemisphereAdjustmentResult {
  /** 校正后的四柱 */
  pillars: FourPillars
  /** 是否发生了置换 */
  adjusted: boolean
  /** 校正说明 */
  note: string
}

// ========================================
// 六冲对换映射
// ========================================

/**
 * 南半球月支置换表（六冲对换）
 *
 * | 北半球月支 | 南半球置换为 |
 * |-----------|------------|
 * | 子(冬至)   | 午(夏至)   |
 * | 丑(冬末)   | 未(夏末)   |
 * | 寅(孟春)   | 申(孟秋)   |
 * | 卯(仲春)   | 酉(仲秋)   |
 * | 辰(季春)   | 戌(季秋)   |
 * | 巳(孟夏)   | 亥(孟冬)   |
 * | 午-亥     | 子-巳(反向) |
 */
const SOUTHERN_MONTH_MAP: Readonly<Record<EarthlyBranch, EarthlyBranch>> = {
  子: '午',
  丑: '未',
  寅: '申',
  卯: '酉',
  辰: '戌',
  巳: '亥',
  午: '子',
  未: '丑',
  申: '寅',
  酉: '卯',
  戌: '辰',
  亥: '巳',
} as const

// ========================================
// 核心函数
// ========================================

/**
 * 检测是否为南半球
 *
 * @param latitude 纬度（负数 = 南半球）
 */
export function isSouthernHemisphere(latitude: number): boolean {
  return latitude < 0
}

/**
 * 获取南半球月支置换
 *
 * @param monthBranch 原始月支
 * @returns 六冲对换后的月支
 */
export function getSouthernMonthBranch(monthBranch: EarthlyBranch): EarthlyBranch {
  return SOUTHERN_MONTH_MAP[monthBranch]
}

/**
 * 对四柱应用南半球月令置换
 *
 * 仅当纬度 < 0 时执行置换；纬度 >= 0 时原样返回。
 * 仅置换月支，年/日/时柱不变。
 *
 * @param pillars 原始四柱
 * @param latitude 出生地纬度（负数 = 南半球）
 * @returns 校正结果（含说明）
 *
 * @example
 * ```ts
 * // 悉尼出生（纬度 -33.9），原月支 午
 * const result = applySouthernHemisphereAdjustment(pillars, -33.9)
 * // result.pillars.month.branch → '子'
 * // result.note → '南半球节气校准：月支「午」→「子」...'
 * ```
 */
export function applySouthernHemisphereAdjustment(
  pillars: FourPillars,
  latitude: number
): HemisphereAdjustmentResult {
  if (latitude >= 0) {
    return { pillars, adjusted: false, note: '' }
  }

  const original = pillars.month.branch
  const replaced = SOUTHERN_MONTH_MAP[original]

  return {
    pillars: {
      ...pillars,
      month: {
        ...pillars.month,
        branch: replaced,
        // 更新 label 中的地支部分
        label: pillars.month.stem + replaced,
      },
    },
    adjusted: true,
    note: `南半球节气校准：月支「${original}」→「${replaced}」（纬度 ${latitude.toFixed(1)}°，南半球季节与北半球相反）`,
  }
}
