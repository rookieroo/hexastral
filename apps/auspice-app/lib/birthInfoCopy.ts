/**
 * Auspice precise-time copy — 时辰 / exact-time mode labels + 真太阳时 strings.
 * Synced with kindred so both apps share the same language.
 */

export interface AuspicePreciseCopy {
  /** Segment: 时辰-only mode. */
  modeShichen: string
  /** Segment: exact clock + city mode. */
  modePrecise: string
  /** Legacy disclosure prompt (kept for fallbacks). */
  precisePrompt: string
  /** BirthClockField placeholder — "确切出生时间". */
  preciseTimeLabel: string
  /** Dynamic birth-city label — "出生城市（用于真太阳时校准）". */
  preciseCityLabel: string
  preciseCityPlaceholder: string
  /** Calibration switch — "真太阳时校准". */
  calibrateLabel: string
  /** Short 真太阳时 tag for the before→after preview line. */
  trueSolarLabel: string
  /** Clock sheet confirm. */
  done: string
}

const EN: AuspicePreciseCopy = {
  modeShichen: 'Birth hour',
  modePrecise: 'Exact time',
  precisePrompt: 'Know your exact birth time? More precise',
  preciseTimeLabel: 'Exact birth time',
  preciseCityLabel: 'Birth city (for true-solar-time)',
  preciseCityPlaceholder: 'Search birth city',
  calibrateLabel: 'True-solar-time calibration',
  trueSolarLabel: 'TST',
  done: 'Done',
}
const ZH_HANS: AuspicePreciseCopy = {
  modeShichen: '时辰',
  modePrecise: '精确时间',
  precisePrompt: '知道确切出生时间？更精准',
  preciseTimeLabel: '确切出生时间',
  preciseCityLabel: '出生城市（用于真太阳时校准）',
  preciseCityPlaceholder: '搜索出生城市',
  calibrateLabel: '真太阳时校准',
  trueSolarLabel: '真太阳时',
  done: '完成',
}
const ZH_HANT: AuspicePreciseCopy = {
  modeShichen: '時辰',
  modePrecise: '精確時間',
  precisePrompt: '知道確切出生時間？更精準',
  preciseTimeLabel: '確切出生時間',
  preciseCityLabel: '出生城市（用於真太陽時校準）',
  preciseCityPlaceholder: '搜尋出生城市',
  calibrateLabel: '真太陽時校準',
  trueSolarLabel: '真太陽時',
  done: '完成',
}
const JA: AuspicePreciseCopy = {
  modeShichen: '時辰',
  modePrecise: '正確な時刻',
  precisePrompt: '正確な出生時刻が分かる？より正確に',
  preciseTimeLabel: '正確な出生時刻',
  preciseCityLabel: '出生地（真太陽時補正用）',
  preciseCityPlaceholder: '出生地を検索',
  calibrateLabel: '真太陽時補正',
  trueSolarLabel: '真太陽時',
  done: '完了',
}

export function auspiceBirthCopy(locale: string): AuspicePreciseCopy {
  if (locale.startsWith('zh-Hant') || locale === 'zh-TW' || locale === 'zh-HK') return ZH_HANT
  if (locale.startsWith('zh')) return ZH_HANS
  if (locale.startsWith('ja')) return JA
  return EN
}
