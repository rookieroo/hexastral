/**
 * Deterministic node detail for Life axis (Yuun resolveNodeDetail — slim 4-locale).
 */

import {
  analyzeGeJu,
  type EarthlyBranch,
  getFourPillars,
  getFourPillarsShiShen,
  type HeavenlyStem,
  type WuXing,
} from '@zhop/astro-core'

import type { Locale } from './i18n'
import type { NodeDetail, PersonalFit, TimelinePayload } from './cycle-types'

const ADVICE: Record<Locale, Record<PersonalFit, string>> = {
  zh: {
    吉: '气机偏顺，宜留意展开与协作的窗口。',
    平: '气机平稳，宜守常、微调节奏。',
    凶: '气机偏紧，宜留意收束与调养。',
  },
  'zh-Hant': {
    吉: '氣機偏順，宜留意展開與協作的窗口。',
    平: '氣機平穩，宜守常、微調節奏。',
    凶: '氣機偏緊，宜留意收束與調養。',
  },
  en: {
    吉: 'Qi runs smoother — windows for opening and collaboration.',
    平: 'Steady qi — keep rhythm, fine-tune.',
    凶: 'Tighter qi — favor closure and recovery.',
  },
  ja: {
    吉: '気の流れが穏やか。展開と協働の窓に留意。',
    平: '平稳。常を守り、リズムを整える。',
    凶: 'やや緊張。収斂と養生に留意。',
  },
}

const FIT_LABEL: Record<Locale, Record<PersonalFit, string>> = {
  zh: { 吉: '吉', 平: '平', 凶: '凶' },
  'zh-Hant': { 吉: '吉', 平: '平', 凶: '凶' },
  en: { 吉: 'Favorable', 平: 'Neutral', 凶: 'Tight' },
  ja: { 吉: '吉', 平: '平', 凶: '凶' },
}

const CLASH: Record<Locale, string> = {
  zh: '冲太岁宜留意。',
  'zh-Hant': '沖太歲宜留意。',
  en: 'Year clash — worth noting.',
  ja: '冲太歳に留意。',
}

const DAY_MASTER: Record<Locale, string> = {
  zh: '日主',
  'zh-Hant': '日主',
  en: 'Day master',
  ja: '日主',
}

const BIRTH_HINT: Record<Locale, string> = {
  zh: '本命通线：形气与八字对照的起点。',
  'zh-Hant': '本命通線：形氣與八字對照的起點。',
  en: 'Natal through-line — form × BaZi starting point.',
  ja: '本命の幹線。形気と八字対照の起点。',
}

export function chartFavorableElement(payload: TimelinePayload): WuXing | null {
  const [y, m, d] = payload.birth.date.split('-').map(Number)
  if (!y || !m || !d) return null
  const hour = payload.birth.hour < 0 ? 12 : payload.birth.hour
  const pillars = getFourPillars({ year: y, month: m, day: d, hour })
  return analyzeGeJu(pillars, getFourPillarsShiShen(pillars)).favorableElement
}

export function resolveNodeDetail(
  payload: TimelinePayload,
  selectedId: string | null,
  locale: Locale
): NodeDetail | null {
  const cjk = locale.startsWith('zh')
  const advice = ADVICE[locale]
  const fitLabel = FIT_LABEL[locale]
  if (!selectedId) return null

  if (selectedId === 'source') {
    return {
      heading: cjk
        ? `${payload.pillars.day.stem}${payload.pillars.day.branch} · ${DAY_MASTER[locale]}`
        : DAY_MASTER[locale],
      fit: null,
      body: BIRTH_HINT[locale],
    }
  }

  if (selectedId.startsWith('dayun-')) {
    const idx = Number(selectedId.slice('dayun-'.length))
    const row = payload.dayun.find((d) => d.index === idx)
    if (!row) return null
    const clash = row.reasons.includes('personal_clash') ? ` ${CLASH[locale]}` : ''
    return {
      heading: cjk
        ? `${row.pillar.stem}${row.pillar.branch} · ${row.startAge}–${row.endAge} · ${fitLabel[row.fit]}`
        : `${row.startAge}–${row.endAge} · ${fitLabel[row.fit]}`,
      fit: row.fit,
      body: `${advice[row.fit]}${clash}`,
    }
  }

  if (selectedId.startsWith('liuyue-')) {
    const parts = selectedId.split('-')
    const y = Number(parts[1])
    const m = Number(parts[2])
    const row = payload.liuyue.find((r) => r.year === y && r.month === m)
    if (!row) return null
    const clash = row.reasons.includes('personal_clash') ? ` ${CLASH[locale]}` : ''
    return {
      heading: cjk
        ? `${row.year}.${row.month} · ${row.pillar.stem}${row.pillar.branch} · ${fitLabel[row.fit]}`
        : `${row.year}.${row.month} · ${fitLabel[row.fit]}`,
      fit: row.fit,
      body: `${advice[row.fit]}${clash}`,
    }
  }

  if (selectedId.startsWith('liunian-')) {
    const year = Number(selectedId.slice('liunian-'.length))
    const row =
      payload.dayun.flatMap((d) => d.liunian).find((r) => r.year === year) ??
      payload.liunian.find((r) => r.year === year)
    if (!row) return null
    const clash = row.reasons.includes('personal_clash') ? ` ${CLASH[locale]}` : ''
    return {
      heading: cjk
        ? `${row.year} · ${row.pillar.stem}${row.pillar.branch} · ${fitLabel[row.fit]}`
        : `${row.year} · ${fitLabel[row.fit]}`,
      fit: row.fit,
      body: `${advice[row.fit]}${clash}`,
    }
  }

  return null
}

export function isHeavenlyStem(s: string): s is HeavenlyStem {
  return s.length === 1
}

export function isEarthlyBranch(s: string): s is EarthlyBranch {
  return s.length === 1
}
