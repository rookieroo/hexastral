/**
 * Client-side 流月 cells for a 流年 (Yuun liuyue.ts — light 用神 fit).
 */

import { HEAVENLY_STEMS, monthGanZhi, yearGanZhi } from '@zhop/astro-core'

import type { LiuyueCell, PersonalFit } from './cycle-types'

type WuXing = '木' | '火' | '土' | '金' | '水'

const STEM_ELEMENT: readonly WuXing[] = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水']
const CONTROLLED_BY: Record<WuXing, WuXing> = { 木: '金', 火: '水', 土: '木', 金: '火', 水: '土' }
const MONTH_LABEL = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'] as const

export function computeLiuyue(year: number, favEl: WuXing | null): LiuyueCell[] {
  const yStemIdx = HEAVENLY_STEMS.indexOf(yearGanZhi(year).stem)
  return Array.from({ length: 12 }, (_, i) => {
    const gz = monthGanZhi(yStemIdx, i)
    const stemIdx = HEAVENLY_STEMS.indexOf(gz.stem)
    const element = STEM_ELEMENT[stemIdx] ?? '木'
    const fit: PersonalFit = favEl
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

export function forwardLiuyue(
  year: number,
  favEl: WuXing | null,
  now: Date = new Date()
): LiuyueCell[] | null {
  const absNow = now.getFullYear() * 12 + now.getMonth()
  const cells = computeLiuyue(year, favEl).filter((c) => {
    const abs = year * 12 + (c.month - 1)
    return abs >= absNow && abs <= absNow + 11
  })
  return cells.length > 0 ? cells : null
}
