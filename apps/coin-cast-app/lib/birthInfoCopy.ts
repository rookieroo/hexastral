/**
 * CoinCast precise-time copy — shared HexAstral standard strings (Fēng / Yuun / Yuel).
 */

export type CoincastUiLocale = 'en' | 'zh' | 'zh-Hant' | 'ja' | 'ko'

export interface CoincastPreciseCopy {
  precisePrompt: string
  preciseTimeLabel: string
  preciseCityLabel: string
  preciseCityPlaceholder: string
  calibrateLabel: string
  trueSolarLabel: string
  done: string
}

const EN: CoincastPreciseCopy = {
  precisePrompt: 'Know your exact birth time? More precise',
  preciseTimeLabel: 'Exact birth time',
  preciseCityLabel: 'Birth city (for true-solar-time)',
  preciseCityPlaceholder: 'Search birth city',
  calibrateLabel: 'True-solar-time calibration',
  trueSolarLabel: 'TST',
  done: 'Done',
}

const ZH: CoincastPreciseCopy = {
  precisePrompt: '知道确切出生时间？更精准',
  preciseTimeLabel: '确切出生时间',
  preciseCityLabel: '出生城市（用于真太阳时校准）',
  preciseCityPlaceholder: '搜索出生城市',
  calibrateLabel: '真太阳时校准',
  trueSolarLabel: '真太阳时',
  done: '完成',
}

const ZH_HANT: CoincastPreciseCopy = {
  precisePrompt: '知道確切出生時間？更精準',
  preciseTimeLabel: '確切出生時間',
  preciseCityLabel: '出生城市（用於真太陽時校準）',
  preciseCityPlaceholder: '搜尋出生城市',
  calibrateLabel: '真太陽時校準',
  trueSolarLabel: '真太陽時',
  done: '完成',
}

const JA: CoincastPreciseCopy = {
  precisePrompt: '正確な出生時刻が分かる？より正確に',
  preciseTimeLabel: '正確な出生時刻',
  preciseCityLabel: '出生地（真太陽時補正用）',
  preciseCityPlaceholder: '出生地を検索',
  calibrateLabel: '真太陽時補正',
  trueSolarLabel: '真太陽時',
  done: '完了',
}

const KO: CoincastPreciseCopy = {
  precisePrompt: '정확한 출생 시간을 아시나요? 더 정밀하게',
  preciseTimeLabel: '정확한 출생 시간',
  preciseCityLabel: '출생 도시 (진태양시 보정용)',
  preciseCityPlaceholder: '출생 도시 검색',
  calibrateLabel: '진태양시 보정',
  trueSolarLabel: '진태양시',
  done: '완료',
}

const TABLE: Record<CoincastUiLocale, CoincastPreciseCopy> = {
  en: EN,
  zh: ZH,
  'zh-Hant': ZH_HANT,
  ja: JA,
  ko: KO,
}

export function coincastBirthCopy(locale: CoincastUiLocale): CoincastPreciseCopy {
  return TABLE[locale] ?? EN
}
