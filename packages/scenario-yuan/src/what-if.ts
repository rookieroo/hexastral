/**
 * what-if — deterministic forward 流月 decision windows for ONE chart.
 *
 * "假如我在未来某个窗口推进某件事，哪个时机最合？" Scans the next N months' 流月 against the
 * chart's 喜用神 (favorability) + 十神 relation and returns the ranked windows. Pure compute,
 * no LLM — the personal parallel of the 合盘 make-if, and forward-only by design (never past
 * rumination). The UI re-weights these windows per "move" (事业 / 求财 / …) using `relation`.
 *
 * Language policy mirrors the teaser / monthly: zh + en authored, zh-Hant → zh, ja → en; the
 * localised atoms (干支 / 五行) are consistent within one block.
 */

import {
  getFourPillars,
  STEM_WUXING,
  WUXING_GENERATE,
  WUXING_OVERCOME,
  type WuXing,
} from '@zhop/astro-core'
import { elementLabel, type Locale } from './components/reading-i18n'
import type { FateNatalChart } from './natal'

export type WhatIfRelation = 'self' | 'output' | 'wealth' | 'authority' | 'seal'
export type WhatIfFavor = 'good' | 'guard' | 'mixed'

export interface WhatIfWindow {
  /** YYYY-MM. */
  monthKey: string
  /** Localised month label, e.g. "2026年8月" / "Aug 2026". */
  monthLabel: string
  /** 流月干支, e.g. "甲午". */
  ganZhi: string
  /** 流月五行 label (localised). */
  element: string
  favor: WhatIfFavor
  relation: WhatIfRelation
  /** Base desirability (favorability only); the UI adds the per-move lean. */
  score: number
}

export interface WhatIfInput {
  chart: FateNatalChart
  locale: Locale
  /** Forward months to scan (default 12). */
  months?: number
  /** Scan start (default now). */
  from?: Date
}

export interface WhatIfResult {
  /** Localised 喜用神 element. */
  favorableElement: string
  windows: WhatIfWindow[]
}

type Lang = 'zh' | 'en'
const langOf = (l: Locale): Lang => (l === 'zh' || l === 'zh-Hant' ? 'zh' : 'en')

function relationOf(monthEl: WuXing, dayEl: WuXing): WhatIfRelation {
  if (monthEl === dayEl) return 'self'
  if (WUXING_GENERATE[dayEl] === monthEl) return 'output'
  if (WUXING_OVERCOME[dayEl] === monthEl) return 'wealth'
  if (WUXING_OVERCOME[monthEl] === dayEl) return 'authority'
  return 'seal' // monthEl 生 dayEl
}

function favorOf(monthEl: WuXing, chart: FateNatalChart): WhatIfFavor {
  if (monthEl === chart.geju.favorableElement) return 'good'
  if (monthEl === chart.geju.unfavorableElement) return 'guard'
  return 'mixed'
}

const FAVOR_SCORE: Record<WhatIfFavor, number> = { good: 3, mixed: 2, guard: 0 }

function monthLabel(d: Date, lang: Lang): string {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  return lang === 'zh'
    ? `${y}年${m}月`
    : new Date(y, m - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' })
}

export function composeWhatIf(input: WhatIfInput): WhatIfResult {
  const { chart, locale } = input
  const lang = langOf(locale)
  const elLang = lang === 'zh' ? 'zh' : 'en'
  const months = input.months ?? 12
  const start = input.from ?? new Date()
  const dayEl = chart.dayMasterWuXing as WuXing

  const windows: WhatIfWindow[] = []
  for (let i = 0; i < months; i++) {
    // Mid-month date keeps the 流月 off the 节气 boundary for a stable pillar.
    const d = new Date(start.getFullYear(), start.getMonth() + i, 15)
    const gz = getFourPillars({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() })
      .month
    const monthEl = STEM_WUXING[gz.stem]
    const favor = favorOf(monthEl, chart)
    windows.push({
      monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      monthLabel: monthLabel(d, lang),
      ganZhi: `${gz.stem}${gz.branch}`,
      element: elementLabel(monthEl, elLang),
      favor,
      relation: relationOf(monthEl, dayEl),
      score: FAVOR_SCORE[favor],
    })
  }

  return {
    favorableElement: elementLabel(chart.geju.favorableElement, elLang),
    windows,
  }
}
