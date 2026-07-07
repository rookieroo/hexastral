/**
 * monthly-fortune — deterministic monthly rhythm reference (this-month cultural read).
 *
 * The home monthly reference card's always-on taste: composed purely from the current 流月
 * (this month's 月柱) against the user's 命盘 (日主五行 · 喜用神 · 十神关系) — no LLM,
 * so it's instant, free, and refreshes on its own each month (the 流月 changes). The
 * Pro depth (an LLM-enriched read) layers on top of this same computation later.
 *
 * Same language policy as the teaser narrator: zh + en authored, zh-Hant → zh,
 * ja → en, with the localised data atoms (干支/五行) consistent within one block.
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

export interface MonthlyFortuneInput {
  chart: FateNatalChart
  /** Defaults to now. The 流月 (month pillar) is taken from this date. */
  date?: Date
  locale: Locale
}

export interface MonthlyFortune {
  /** YYYY-MM (UTC-ish, local month) — drives the "已更新" dot + per-month caching. */
  monthKey: string
  /** Localised month label, e.g. "2026年6月" / "June 2026". */
  monthLabel: string
  /** 流月干支, e.g. "甲午". */
  ganZhi: string
  /** 流月五行 label (localised), e.g. "木" / "Wood". */
  element: string
  /** One-line tone for the month. */
  headline: string
  /** The forecast body (2 short paragraphs). */
  body: string
}

type Lang = 'zh' | 'en'
const langOf = (l: Locale): Lang => (l === 'zh' || l === 'zh-Hant' ? 'zh' : 'en')

type Relation = 'self' | 'output' | 'wealth' | 'authority' | 'seal'

function relationOf(monthEl: WuXing, dayEl: WuXing): Relation {
  if (monthEl === dayEl) return 'self'
  if (WUXING_GENERATE[dayEl] === monthEl) return 'output'
  if (WUXING_OVERCOME[dayEl] === monthEl) return 'wealth'
  if (WUXING_OVERCOME[monthEl] === dayEl) return 'authority'
  return 'seal' // monthEl 生 dayEl
}

/** The month's 十神 framing — one grounded line per relation, per language. */
const RELATION_LINE: Record<Relation, Record<Lang, string>> = {
  self: {
    zh: '本月同气当令，是立身、结盟、定方向的参考月份；唯防与人争锋、白耗心力（文化参考）。',
    en: 'This month your own force is in season — a cultural reference for anchoring and direction; guard against rivalry that drains you.',
  },
  output: {
    zh: '本月才华外显，表达与创作能量偏强；想法多时宜收口落地（文化参考，非建议）。',
    en: 'Your talent flows outward this month — a cultural reference for expression and visibility; land a few ideas rather than starting many.',
  },
  wealth: {
    zh: '本月财气向你，进取有得的文化参考；脚踏实地，重情义而不吝（非财务建议）。',
    en: 'Opportunity turns toward you this month — a cultural reference for initiative; stay grounded (not financial advice).',
  },
  authority: {
    zh: '本月受名受责，是承位担事的文化参考；当受则受，唯忌躁进、不可越权（非建议）。',
    en: 'Name and responsibility arrive this month — a cultural reference for taking your seat; accept what is yours, but don’t rush or overreach.',
  },
  seal: {
    zh: '本月得贵人提携、受人之助，宜读书、签约、立约的文化参考；事有上行之挽（非建议）。',
    en: 'Support and mentors reach you this month — a cultural reference for study and formalising; your work may get pulled upward.',
  },
}

/** 流月五行 vs 喜忌 → the month's headline tone. */
function favorability(
  monthEl: WuXing,
  chart: FateNatalChart,
  lang: Lang
): 'good' | 'guard' | 'mixed' {
  if (monthEl === chart.geju.favorableElement) return 'good'
  if (monthEl === chart.geju.unfavorableElement) return 'guard'
  return 'mixed'
}

const HEADLINE: Record<'good' | 'guard' | 'mixed', Record<Lang, string>> = {
  good: { zh: '顺势之月 · 文化参考', en: 'A month with the wind — cultural reference' },
  guard: { zh: '守成之月 · 文化参考', en: 'A month to hold — cultural reference' },
  mixed: { zh: '取舍之月 · 文化参考', en: 'A month of choices — cultural reference' },
}

const NOTE: Record<'good' | 'guard' | 'mixed', Record<Lang, string>> = {
  good: {
    zh: '此月五行正合你的喜用，主动开局、借人成事在古典读法里较顺（文化参考，非建议）。',
    en: 'The month runs on your favourable element — in classical reading, opening a path and leaning on others read as supportive (cultural reference, not advice).',
  },
  guard: {
    zh: '此月五行偏忌，古典读法宜守不宜进，避免硬碰，养精蓄锐待下一程（文化参考）。',
    en: 'The month leans against your chart — classical reading suggests holding rather than pushing (cultural reference, not advice).',
  },
  mixed: {
    zh: '此月与你互有牵引，得失参半，关键不在时运而在你的选择（文化参考）。',
    en: 'The month pulls both ways — gains and costs in balance; the turning point is your choice, not the timing (cultural reference).',
  },
}

function monthLabel(d: Date, lang: Lang): string {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  return lang === 'zh'
    ? `${y}年${m}月`
    : new Date(y, m - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

export function composeMonthlyFortune(input: MonthlyFortuneInput): MonthlyFortune {
  const { chart, locale } = input
  const d = input.date ?? new Date()
  const lang = langOf(locale)

  const pillars = getFourPillars({
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  })
  const monthGz = pillars.month
  const monthEl = STEM_WUXING[monthGz.stem]
  const dayEl = chart.dayMasterWuXing as WuXing

  const fav = favorability(monthEl, chart, lang)
  const relation = relationOf(monthEl, dayEl)
  const favEl = elementLabel(chart.geju.favorableElement, lang === 'zh' ? 'zh' : 'en')

  const headline = HEADLINE[fav][lang]
  const relLine = RELATION_LINE[relation][lang]
  const note = NOTE[fav][lang]
  const body =
    lang === 'zh'
      ? `流月${monthGz.stem}${monthGz.branch}（${elementLabel(monthEl, 'zh')}）入你命盘。${relLine}\n\n${note}（你的喜用是${favEl}。）`
      : `This month's pillar is ${monthGz.stem}${monthGz.branch} (${elementLabel(monthEl, 'en')}). ${relLine}\n\n${note} (Your favourable element is ${favEl}.)`

  return {
    monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    monthLabel: monthLabel(d, lang),
    ganZhi: `${monthGz.stem}${monthGz.branch}`,
    element: elementLabel(monthEl, lang === 'zh' ? 'zh' : 'en'),
    headline,
    body,
  }
}
