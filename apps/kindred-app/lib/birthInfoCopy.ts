/**
 * Kindred-specific BirthInfoForm copy.
 *
 * Extends the shared core-ui defaults with Kindred's editorial tone AND the
 * field-importance hints the synastry reading relies on:
 *
 *   - 时辰 is required (drives the hour pillar — without it 八字 has only three
 *     pillars and the chart engine has to guess). The host passes `requireTime`.
 *   - 出生地 is NOT collected in the default 时辰 flow (the place step is
 *     skipped). True-solar-time correction only makes sense on a precise clock
 *     time, so the birth city lives inside the opt-in precise-time disclosure
 *     (`allowPreciseTime`) — picking a city there is what enables 真太阳时
 *     calibration of the hour pillar.
 */

import { type BirthInfoCopy, birthInfoCopyForLocale } from '@zhop/core-ui'

interface KindredOverride {
  timeSubtitle: string
  precisePrompt: string
  preciseTimeLabel: string
  preciseCityLabel: string
  preciseCityPlaceholder: string
  calibrateLabel: string
  trueSolarLabel: string
}

const OVERRIDES: Record<string, KindredOverride> = {
  en: {
    timeSubtitle: 'Twelve two-hour 时辰 windows. Required — your hour pillar depends on it.',
    precisePrompt: 'Know your exact birth time? More precise',
    preciseTimeLabel: 'Exact birth time',
    preciseCityLabel: 'Birth city (for true-solar-time)',
    preciseCityPlaceholder: 'Search birth city',
    calibrateLabel: 'True-solar-time calibration',
    trueSolarLabel: 'TST',
  },
  zh: {
    timeSubtitle: '十二时辰，每个对应两小时。必填——直接决定你的时柱。',
    precisePrompt: '知道确切出生时间？更精准',
    preciseTimeLabel: '确切出生时间',
    preciseCityLabel: '出生城市（用于真太阳时校准）',
    preciseCityPlaceholder: '搜索出生城市',
    calibrateLabel: '真太阳时校准',
    trueSolarLabel: '真太阳时',
  },
  'zh-Hant': {
    timeSubtitle: '十二時辰，每個對應兩小時。必填——直接決定你的時柱。',
    precisePrompt: '知道確切出生時間？更精準',
    preciseTimeLabel: '確切出生時間',
    preciseCityLabel: '出生城市（用於真太陽時校準）',
    preciseCityPlaceholder: '搜尋出生城市',
    calibrateLabel: '真太陽時校準',
    trueSolarLabel: '真太陽時',
  },
  ja: {
    timeSubtitle: '12 の時辰（2 時間単位）。必須 — 時柱の決定に必要です。',
    precisePrompt: '正確な出生時刻が分かる？より正確に',
    preciseTimeLabel: '正確な出生時刻',
    preciseCityLabel: '出生地（真太陽時補正用）',
    preciseCityPlaceholder: '出生地を検索',
    calibrateLabel: '真太陽時補正',
    trueSolarLabel: '真太陽時',
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
    precisePrompt: o.precisePrompt,
    preciseTimeLabel: o.preciseTimeLabel,
    preciseCityLabel: o.preciseCityLabel,
    preciseCityPlaceholder: o.preciseCityPlaceholder,
    calibrateLabel: o.calibrateLabel,
    trueSolarLabel: o.trueSolarLabel,
  }
}
