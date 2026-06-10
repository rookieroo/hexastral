/**
 * 流月 — the 12 monthly pillars for ANY 流年, computed CLIENT-SIDE (no API).
 *
 * The drill-down timeline lets the user tap any 流年 and see that year's 流月; the
 * server only ships a rolling current-year window, so we derive the rest here.
 * astro-core gives the 干支 deterministically (五虎遁 via `monthGanZhi`), and we
 * read a LIGHT fit from each month's 五行 vs the chart's 用神 (favorable element)
 * — a reference read, NOT the server's full PeriodFit (clash/合 etc.).
 *
 * Month boundaries are Gregorian≈lunar (节气-accurate is a known TODO, matching
 * the server's current 流月 window). Index 0 = 寅 = 正月.
 */
import { HEAVENLY_STEMS, monthGanZhi, yearGanZhi } from '@zhop/astro-core'

export type WuXing = '木' | '火' | '土' | '金' | '水'
export type LiuyueFit = '吉' | '平' | '凶'

/** 甲乙→木, 丙丁→火, 戊己→土, 庚辛→金, 壬癸→水. */
const STEM_ELEMENT: readonly WuXing[] = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水']
/** What CONTROLS (克) each element — the month 五行 that harms the 用神. */
const CONTROLLED_BY: Record<WuXing, WuXing> = { 木: '金', 火: '水', 土: '木', 金: '火', 水: '土' }
/** 寅→正, 卯→二 … 子→冬月, 丑→腊月 (lunar month labels; index 0 = 寅 = 正月). */
const MONTH_LABEL = [
  '正',
  '二',
  '三',
  '四',
  '五',
  '六',
  '七',
  '八',
  '九',
  '十',
  '冬',
  '腊',
] as const

export interface LiuyueCell {
  /** Lunar month number 1..12 (1 = 正月 / 寅). */
  month: number
  label: string
  stem: string
  branch: string
  element: WuXing
  fit: LiuyueFit
}

/**
 * The 12 月柱 of a 流年, with a light 用神-based fit. `favEl` = the chart's
 * favorable element (from `analyzeGeJu().favorableElement`); null → all 平.
 */
export function computeLiuyue(year: number, favEl: WuXing | null): LiuyueCell[] {
  const yStemIdx = HEAVENLY_STEMS.indexOf(yearGanZhi(year).stem)
  return Array.from({ length: 12 }, (_, i) => {
    const gz = monthGanZhi(yStemIdx, i)
    const stemIdx = HEAVENLY_STEMS.indexOf(gz.stem)
    const element = STEM_ELEMENT[stemIdx] ?? '木'
    const fit: LiuyueFit = favEl
      ? element === favEl
        ? '吉'
        : element === CONTROLLED_BY[favEl]
          ? '凶'
          : '平'
      : '平'
    return {
      month: i + 1,
      label: MONTH_LABEL[i] ?? String(i + 1),
      stem: gz.stem,
      branch: gz.branch,
      element,
      fit,
    }
  })
}
