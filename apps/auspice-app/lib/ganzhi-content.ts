/**
 * 天干地支 — Glossary chunk 2 (ADR-0020).
 *
 * Reference data for the /glossary/ganzhi page's three-section UI:
 *   - 10 天干 reference strip
 *   - 12 地支 reference strip
 *   - 60-甲子 paired grid (10 cols × 6 rows)
 *
 * Year 1984 was 甲子 (the canonical cycle anchor) — this fact powers the
 * "what year was this combo?" lookup in the detail card. The 10×6 layout is
 * the standard scholarly arrangement: each COLUMN is a stem-family
 * (column 0 = 甲, column 1 = 乙, …), each ROW is a 10-step segment of the
 * cycle. Reading row-by-row from top-left walks the 60-year sequence in
 * order; reading column-by-column shows the same stem cycling through
 * branches.
 */

import type { Locale } from './i18n'

export type Wuxing = '木' | '火' | '土' | '金' | '水'

export interface StemEntry {
  /** 天干 character. */
  char: string
  /** 五行 of the stem. */
  element: Wuxing
  /** 阳 (yang) for 甲丙戊庚壬; 阴 (yin) for 乙丁己辛癸. */
  polarity: '阳' | '阴'
  /** Mandarin pinyin (with tone mark). Useful for non-CJK users. */
  pinyin: string
}

export interface BranchEntry {
  /** 地支 character. */
  char: string
  /** 五行 attribution (canonical 子=水 / 丑=土 / 寅=木 …). */
  element: Wuxing
  /** Mandarin pinyin (with tone mark). */
  pinyin: string
  /** Localized 生肖 (zodiac animal). */
  animal: Record<Locale, string>
}

export const TEN_STEMS: ReadonlyArray<StemEntry> = [
  { char: '甲', element: '木', polarity: '阳', pinyin: 'jiǎ' },
  { char: '乙', element: '木', polarity: '阴', pinyin: 'yǐ' },
  { char: '丙', element: '火', polarity: '阳', pinyin: 'bǐng' },
  { char: '丁', element: '火', polarity: '阴', pinyin: 'dīng' },
  { char: '戊', element: '土', polarity: '阳', pinyin: 'wù' },
  { char: '己', element: '土', polarity: '阴', pinyin: 'jǐ' },
  { char: '庚', element: '金', polarity: '阳', pinyin: 'gēng' },
  { char: '辛', element: '金', polarity: '阴', pinyin: 'xīn' },
  { char: '壬', element: '水', polarity: '阳', pinyin: 'rén' },
  { char: '癸', element: '水', polarity: '阴', pinyin: 'guǐ' },
]

export const TWELVE_BRANCHES: ReadonlyArray<BranchEntry> = [
  {
    char: '子',
    element: '水',
    pinyin: 'zǐ',
    animal: { 'zh-Hans': '鼠', 'zh-Hant': '鼠', ja: '子・鼠', en: 'Rat' },
  },
  {
    char: '丑',
    element: '土',
    pinyin: 'chǒu',
    animal: { 'zh-Hans': '牛', 'zh-Hant': '牛', ja: '丑・牛', en: 'Ox' },
  },
  {
    char: '寅',
    element: '木',
    pinyin: 'yín',
    animal: { 'zh-Hans': '虎', 'zh-Hant': '虎', ja: '寅・虎', en: 'Tiger' },
  },
  {
    char: '卯',
    element: '木',
    pinyin: 'mǎo',
    animal: { 'zh-Hans': '兔', 'zh-Hant': '兔', ja: '卯・兎', en: 'Rabbit' },
  },
  {
    char: '辰',
    element: '土',
    pinyin: 'chén',
    animal: { 'zh-Hans': '龙', 'zh-Hant': '龍', ja: '辰・龍', en: 'Dragon' },
  },
  {
    char: '巳',
    element: '火',
    pinyin: 'sì',
    animal: { 'zh-Hans': '蛇', 'zh-Hant': '蛇', ja: '巳・蛇', en: 'Snake' },
  },
  {
    char: '午',
    element: '火',
    pinyin: 'wǔ',
    animal: { 'zh-Hans': '马', 'zh-Hant': '馬', ja: '午・馬', en: 'Horse' },
  },
  {
    char: '未',
    element: '土',
    pinyin: 'wèi',
    animal: { 'zh-Hans': '羊', 'zh-Hant': '羊', ja: '未・羊', en: 'Goat' },
  },
  {
    char: '申',
    element: '金',
    pinyin: 'shēn',
    animal: { 'zh-Hans': '猴', 'zh-Hant': '猴', ja: '申・猿', en: 'Monkey' },
  },
  {
    char: '酉',
    element: '金',
    pinyin: 'yǒu',
    animal: { 'zh-Hans': '鸡', 'zh-Hant': '雞', ja: '酉・鶏', en: 'Rooster' },
  },
  {
    char: '戌',
    element: '土',
    pinyin: 'xū',
    animal: { 'zh-Hans': '狗', 'zh-Hant': '狗', ja: '戌・犬', en: 'Dog' },
  },
  {
    char: '亥',
    element: '水',
    pinyin: 'hài',
    animal: { 'zh-Hans': '猪', 'zh-Hant': '豬', ja: '亥・猪', en: 'Pig' },
  },
]

export interface JiaziCombo {
  /** 0..59 — 甲子=0, 乙丑=1, …, 癸亥=59. */
  index: number
  stem: StemEntry
  branch: BranchEntry
  /** Composite display: stem.char + branch.char (e.g. '甲子'). */
  label: string
}

/** All 60 干支 combos in canonical order. */
export const SIXTY_JIAZI: ReadonlyArray<JiaziCombo> = Array.from(
  { length: 60 },
  (_, i): JiaziCombo => {
    const stem = TEN_STEMS[i % 10]!
    const branch = TWELVE_BRANCHES[i % 12]!
    return { index: i, stem, branch, label: `${stem.char}${branch.char}` }
  }
)

/** Canonical anchor: year 1984 was 甲子. */
const JIAZI_ANCHOR_YEAR = 1984

/** Index in SIXTY_JIAZI corresponding to the given gregorian year's 立春-aware pillar. */
export function jiaziIndexForYear(year: number): number {
  return (((year - JIAZI_ANCHOR_YEAR) % 60) + 60) % 60
}

/**
 * Return the year (>= 1900, <= 2100) closest to `nowYear` that matches the
 * 60-cycle position at `comboIndex`. Used by the detail card to answer
 * "when was this combo last in effect?".
 */
export function nearestYearForCombo(comboIndex: number, nowYear: number): number {
  const baseYear = JIAZI_ANCHOR_YEAR + comboIndex
  const cyclesAhead = Math.floor((nowYear - baseYear) / 60)
  return baseYear + cyclesAhead * 60
}
