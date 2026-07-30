/**
 * Server-side Yuun widget chrome + personalization labels for watch bootstrap.
 * Mirrors `apps/auspice-app/lib/i18n.ts` widgetChrome / personal / moonPhaseNames.
 */

import { STEM_WUXING, type HeavenlyStem, type PersonalFit } from '@zhop/astro-core'
import { getLunarPhase, getLunarPhaseName } from '@zhop/hexastral-tokens/lunar'

export type WidgetLocale = 'zh-Hans' | 'zh-Hant' | 'ja' | 'en'

const MOON_PHASE_ORDER = [
  'new',
  'waxing-crescent',
  'first-quarter',
  'waxing-gibbous',
  'full',
  'waning-gibbous',
  'last-quarter',
  'waning-crescent',
] as const

interface WidgetLabelSet {
  chrome: {
    good: string
    avoid: string
    forYou: string
    tip: string
    lunarFallback: string
    emptyHint: string
  }
  moonPhaseNames: Record<(typeof MOON_PHASE_ORDER)[number], string>
  fit: Record<PersonalFit, string>
  summary: Record<PersonalFit, string>
}

const LABELS: Record<WidgetLocale, WidgetLabelSet> = {
  'zh-Hans': {
    chrome: {
      good: '宜',
      avoid: '忌',
      forYou: '对你',
      tip: '日签',
      lunarFallback: '农历',
      emptyHint: '打开 Yuun 同步今日黄历',
    },
    moonPhaseNames: {
      new: '新月',
      'waxing-crescent': '娥眉月',
      'first-quarter': '上弦月',
      'waxing-gibbous': '盈凸月',
      full: '满月',
      'waning-gibbous': '亏凸月',
      'last-quarter': '下弦月',
      'waning-crescent': '残月',
    },
    fit: { 吉: '可留意', 平: '平稳', 凶: '宜谨慎' },
    summary: {
      吉: '今日五行对你偏顺（文化参考）——适合按自己的节奏推进想做的事。',
      平: '今日起伏不大（文化参考）——按计划稳步推进即可。',
      凶: '今日宜守不宜攻（文化参考）——低调收敛、避免冒进。',
    },
  },
  'zh-Hant': {
    chrome: {
      good: '宜',
      avoid: '忌',
      forYou: '對你',
      tip: '日簽',
      lunarFallback: '農曆',
      emptyHint: '打開 Yuun 同步今日黃曆',
    },
    moonPhaseNames: {
      new: '新月',
      'waxing-crescent': '娥眉月',
      'first-quarter': '上弦月',
      'waxing-gibbous': '盈凸月',
      full: '滿月',
      'waning-gibbous': '虧凸月',
      'last-quarter': '下弦月',
      'waning-crescent': '殘月',
    },
    fit: { 吉: '可留意', 平: '平穩', 凶: '宜謹慎' },
    summary: {
      吉: '今日五行對你偏順（文化參考）——適合按自己的節奏推進想做的事。',
      平: '今日起伏不大（文化參考）——按計畫穩步推進即可。',
      凶: '今日宜守不宜攻（文化參考）——低調收斂、避免冒進。',
    },
  },
  ja: {
    chrome: {
      good: '向く',
      avoid: '避ける',
      forYou: 'あなた',
      tip: '日签',
      lunarFallback: '旧暦',
      emptyHint: 'Yuun を開いて黄暦を同期',
    },
    moonPhaseNames: {
      new: '新月',
      'waxing-crescent': '三日月',
      'first-quarter': '上弦',
      'waxing-gibbous': '十三夜',
      full: '満月',
      'waning-gibbous': '寝待月',
      'last-quarter': '下弦',
      'waning-crescent': '有明月',
    },
    fit: { 吉: '好機', 平: '平穏', 凶: '慎重に' },
    summary: {
      吉: '今日は流れが良い読み（文化参考）——やりたいことを進めるのに向いています。',
      平: '今日は起伏が少ない読み（文化参考）——計画どおり着実に進めれば十分です。',
      凶: '今日は攻めより守り（文化参考）——控えめに、無理は避けましょう。',
    },
  },
  en: {
    chrome: {
      good: 'Good',
      avoid: 'Avoid',
      forYou: 'For you',
      tip: '',
      lunarFallback: 'Lunar',
      emptyHint: 'Open Yuun to sync today’s almanac',
    },
    moonPhaseNames: {
      new: 'New moon',
      'waxing-crescent': 'Waxing crescent',
      'first-quarter': 'First quarter',
      'waxing-gibbous': 'Waxing gibbous',
      full: 'Full moon',
      'waning-gibbous': 'Waning gibbous',
      'last-quarter': 'Last quarter',
      'waning-crescent': 'Waning crescent',
    },
    fit: { 吉: 'Favorable', 平: 'Neutral', 凶: 'Caution' },
    summary: {
      吉: "Today's chart reads supportive (cultural reference) — a steady day to move on what you have in mind.",
      平: 'An even day on the chart (cultural reference) — keep to your plan at a measured pace.',
      凶: "Today's chart reads cautious (cultural reference) — hold back and avoid overextending.",
    },
  },
}

export function widgetLabels(locale: WidgetLocale): WidgetLabelSet {
  return LABELS[locale]
}

export function widgetChrome(locale: WidgetLocale) {
  const labels = widgetLabels(locale)
  return {
    ...labels.chrome,
    moonPhaseNames: MOON_PHASE_ORDER.map((phase) => labels.moonPhaseNames[phase]),
  }
}

const ELEMENT_COLORS: Record<string, string> = {
  木: '#16A34A',
  火: '#DC2626',
  土: '#D97706',
  金: '#52525B',
  水: '#2563EB',
}

/** Day stem → hex color (matches auspice-app DailyCard). */
export function elementColorForGanZhi(ganZhi: string): string {
  const stem = ganZhi[0]
  if (!stem) return '#A0845C'
  const element = STEM_WUXING[stem as HeavenlyStem]
  return element ? (ELEMENT_COLORS[element] ?? '#A0845C') : '#A0845C'
}

/** Join almanac verbs with middle dot, capped at `max` items. */
export function compactVerbs(verbs: string[], max: number): string {
  return verbs.slice(0, max).join('·')
}

function moonPhaseForUtcNoon(year: number, month: number, day: number): number {
  return getLunarPhase(Date.UTC(year, month - 1, day, 12, 0, 0, 0))
}

/** Moon phase fraction at UTC noon for a YYYY-MM-DD civil date. */
export function moonPhaseForIsoDate(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return 0
  return moonPhaseForUtcNoon(y, m, d)
}

// Re-export for callers that need the phase name order check
export { getLunarPhaseName, MOON_PHASE_ORDER }
