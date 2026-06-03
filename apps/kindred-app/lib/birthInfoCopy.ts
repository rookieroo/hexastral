/**
 * Kindred-specific BirthInfoForm copy.
 *
 * Extends the shared core-ui defaults with Kindred's editorial tone AND the
 * field-importance hints that the synastry reading relies on:
 *
 *   - 时辰 is required (drives the hour pillar — without it 八字 has only
 *     three pillars and the chart engine has to guess). The host therefore
 *     passes `requireTime` and we drop the "I don't know" subtitle that the
 *     shared default carries.
 *   - 出生地 is optional but recommended — the city's longitude lets the
 *     engine apply 真太阳时 correction to the hour pillar; skipping it is
 *     OK, but the user should know the tradeoff. The host passes
 *     `placeOptional` and we render a "later" skip with the explanation in
 *     the subtitle.
 */

import { birthInfoCopyForLocale, type BirthInfoCopy } from '@zhop/core-ui'

interface KindredOverride {
  timeSubtitle: string
  placeSubtitle: string
  placeSkipLabel: string
}

const OVERRIDES: Record<string, KindredOverride> = {
  en: {
    timeSubtitle:
      'Twelve two-hour 时辰 windows. Required — your hour pillar depends on it.',
    placeSubtitle:
      'Optional. Your birth city sharpens the hour pillar via true-solar time; skip if unknown.',
    placeSkipLabel: 'Skip for now',
  },
  zh: {
    timeSubtitle: '十二时辰，每个对应两小时。必填——直接决定你的时柱。',
    placeSubtitle: '选填。出生城市用于真太阳时修正，会让时柱更准；不清楚可以跳过。',
    placeSkipLabel: '暂时跳过',
  },
  'zh-Hant': {
    timeSubtitle: '十二時辰，每個對應兩小時。必填——直接決定你的時柱。',
    placeSubtitle: '選填。出生城市用於真太陽時修正，會讓時柱更準；不清楚可以跳過。',
    placeSkipLabel: '暫時跳過',
  },
  ja: {
    timeSubtitle: '12 の時辰（2 時間単位）。必須 — 時柱の決定に必要です。',
    placeSubtitle:
      '任意。出生地は真太陽時補正に使い、時柱の精度が上がります。不明なら省略可。',
    placeSkipLabel: '後で',
  },
}

function pickOverride(locale: string): KindredOverride {
  const exact = OVERRIDES[locale]
  if (exact) return exact
  const base = locale.split('-')[0] ?? 'en'
  return OVERRIDES[base] ?? OVERRIDES.en!
}

export function kindredBirthCopy(locale: string): BirthInfoCopy {
  const base = birthInfoCopyForLocale(locale)
  const o = pickOverride(locale)
  return {
    ...base,
    timeSubtitle: o.timeSubtitle,
    placeSubtitle: o.placeSubtitle,
    placeSkipLabel: o.placeSkipLabel,
  }
}
