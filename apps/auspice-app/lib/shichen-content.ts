/**
 * 十二时辰 (Twelve Shichen) — 子午流注 educational content.
 *
 * Each 时辰 maps to a 2-hour window when one of the body's 12 主要经络
 * (meridians) is most active. The traditional 中医 prescription is to align
 * daily activity with the meridian schedule — sleep when the liver detoxes
 * (丑时), eat breakfast when the stomach opens (辰时), nap briefly when the
 * heart fire peaks (午时), etc.
 *
 * This module is the data source for `/glossary/shichen` (ADR-0020
 * glossary track). Content is FREE (no paywall), authored per-locale.
 * Subsequent glossary sections (天干地支, 四柱八字, 紫微) follow the same
 * `Record<Locale, string>` per-field pattern.
 */

import type { Locale } from './i18n'

export interface ShichenEntry {
  /** 0-11 — mirrors core-ui ShichenPicker encoding. */
  index: number
  /** 地支 character: 子/丑/.../亥. */
  branch: string
  /** Composite name shown in the wheel: 子时/丑时/.../亥时. */
  name: string
  /** Local-clock range hint. */
  range: string
  /** 五行 element this hour belongs to. */
  element: '木' | '火' | '土' | '金' | '水'
  /** Localized 主管器官 / meridian name. */
  organ: Record<Locale, string>
  /** Localized 1-line guidance — what the tradition suggests for this hour. */
  activity: Record<Locale, string>
}

export const TWELVE_SHICHEN: ReadonlyArray<ShichenEntry> = [
  {
    index: 0,
    branch: '子',
    name: '子时',
    range: '23:00 – 01:00',
    element: '水',
    organ: {
      'zh-Hans': '胆经',
      'zh-Hant': '膽經',
      ja: '胆経',
      en: 'Gallbladder',
    },
    activity: {
      'zh-Hans': '子时阳气始生，宜入深睡，养胆气。',
      'zh-Hant': '子時陽氣始生，宜入深睡，養膽氣。',
      ja: '子の刻は陽気が始まる。深い眠りで胆気を養う。',
      en: 'Yang energy begins rising. Deep sleep restores the gallbladder.',
    },
  },
  {
    index: 1,
    branch: '丑',
    name: '丑时',
    range: '01:00 – 03:00',
    element: '土',
    organ: {
      'zh-Hans': '肝经',
      'zh-Hant': '肝經',
      ja: '肝経',
      en: 'Liver',
    },
    activity: {
      'zh-Hans': '丑时肝经当令，深睡养肝解毒。',
      'zh-Hant': '丑時肝經當令，深睡養肝解毒。',
      ja: '丑の刻は肝経が活発。深い睡眠で肝が解毒する。',
      en: 'Liver meridian peaks; deepest-sleep detox window.',
    },
  },
  {
    index: 2,
    branch: '寅',
    name: '寅时',
    range: '03:00 – 05:00',
    element: '木',
    organ: {
      'zh-Hans': '肺经',
      'zh-Hant': '肺經',
      ja: '肺経',
      en: 'Lung',
    },
    activity: {
      'zh-Hans': '寅时肺主气，宜安睡，勿强行起床。',
      'zh-Hant': '寅時肺主氣，宜安睡，勿強行起床。',
      ja: '寅の刻は肺が気を司る。無理に起きず眠る。',
      en: 'Lung governs qi distribution; remain at rest, do not force waking.',
    },
  },
  {
    index: 3,
    branch: '卯',
    name: '卯时',
    range: '05:00 – 07:00',
    element: '木',
    organ: {
      'zh-Hans': '大肠经',
      'zh-Hant': '大腸經',
      ja: '大腸経',
      en: 'Large Intestine',
    },
    activity: {
      'zh-Hans': '卯时大肠蠕动，宜起床如厕，温水一杯。',
      'zh-Hant': '卯時大腸蠕動，宜起床如廁，溫水一杯。',
      ja: '卯の刻は大腸の蠕動が活発。起床し白湯を一杯。',
      en: 'Large intestine peristalsis; rise, eliminate, a warm cup of water.',
    },
  },
  {
    index: 4,
    branch: '辰',
    name: '辰时',
    range: '07:00 – 09:00',
    element: '土',
    organ: {
      'zh-Hans': '胃经',
      'zh-Hant': '胃經',
      ja: '胃経',
      en: 'Stomach',
    },
    activity: {
      'zh-Hans': '辰时胃经当令，养胃早餐为一日之基。',
      'zh-Hant': '辰時胃經當令，養胃早餐為一日之基。',
      ja: '辰の刻は胃経が当令。胃に優しい朝食を。',
      en: 'Stomach meridian peaks; a nourishing breakfast sets the day.',
    },
  },
  {
    index: 5,
    branch: '巳',
    name: '巳时',
    range: '09:00 – 11:00',
    element: '火',
    organ: {
      'zh-Hans': '脾经',
      'zh-Hant': '脾經',
      ja: '脾経',
      en: 'Spleen',
    },
    activity: {
      'zh-Hans': '巳时脾运精微，专心做最重要的工作。',
      'zh-Hant': '巳時脾運精微，專心做最重要的工作。',
      ja: '巳の刻は脾が精微を運ぶ。最も大事な仕事を集中して。',
      en: 'Spleen distributes essence; do your highest-focus work now.',
    },
  },
  {
    index: 6,
    branch: '午',
    name: '午时',
    range: '11:00 – 13:00',
    element: '火',
    organ: {
      'zh-Hans': '心经',
      'zh-Hant': '心經',
      ja: '心経',
      en: 'Heart',
    },
    activity: {
      'zh-Hans': '午时心火最旺，宜小憩二十分钟养心。',
      'zh-Hant': '午時心火最旺，宜小憩二十分鐘養心。',
      ja: '午の刻は心火が最も盛ん。20分の短い昼寝を。',
      en: 'Heart fire peaks; a 20-minute nap restores it.',
    },
  },
  {
    index: 7,
    branch: '未',
    name: '未时',
    range: '13:00 – 15:00',
    element: '土',
    organ: {
      'zh-Hans': '小肠经',
      'zh-Hant': '小腸經',
      ja: '小腸経',
      en: 'Small Intestine',
    },
    activity: {
      'zh-Hans': '未时小肠化食，宜午餐已消化完毕。',
      'zh-Hant': '未時小腸化食，宜午餐已消化完畢。',
      ja: '未の刻は小腸が消化する。昼食はこの前に終える。',
      en: 'Small intestine separates clear from turbid; lunch should be finishing.',
    },
  },
  {
    index: 8,
    branch: '申',
    name: '申时',
    range: '15:00 – 17:00',
    element: '金',
    organ: {
      'zh-Hans': '膀胱经',
      'zh-Hant': '膀胱經',
      ja: '膀胱経',
      en: 'Bladder',
    },
    activity: {
      'zh-Hans': '申时膀胱主气化，多饮水，思维清明。',
      'zh-Hant': '申時膀胱主氣化，多飲水，思維清明。',
      ja: '申の刻は膀胱が気化を司る。水を多めに、頭は冴える。',
      en: 'Bladder transforms; drink water generously, mind stays sharp.',
    },
  },
  {
    index: 9,
    branch: '酉',
    name: '酉时',
    range: '17:00 – 19:00',
    element: '金',
    organ: {
      'zh-Hans': '肾经',
      'zh-Hant': '腎經',
      ja: '腎経',
      en: 'Kidney',
    },
    activity: {
      'zh-Hans': '酉时肾经主藏，宜静思晚餐清淡。',
      'zh-Hant': '酉時腎經主藏，宜靜思晚餐清淡。',
      ja: '酉の刻は腎が蔵を司る。静かに省みて夕食は軽く。',
      en: 'Kidney stores essence; reflective time, a light dinner.',
    },
  },
  {
    index: 10,
    branch: '戌',
    name: '戌时',
    range: '19:00 – 21:00',
    element: '土',
    organ: {
      'zh-Hans': '心包经',
      'zh-Hant': '心包經',
      ja: '心包経',
      en: 'Pericardium',
    },
    activity: {
      'zh-Hans': '戌时心包主乐，宜散步、家人相聚。',
      'zh-Hant': '戌時心包主樂，宜散步、家人相聚。',
      ja: '戌の刻は心包が楽を司る。散歩や家族との時間を。',
      en: 'Pericardium brings joy; a walk or time with family.',
    },
  },
  {
    index: 11,
    branch: '亥',
    name: '亥时',
    range: '21:00 – 23:00',
    element: '水',
    organ: {
      'zh-Hans': '三焦经',
      'zh-Hant': '三焦經',
      ja: '三焦経',
      en: 'Triple Burner',
    },
    activity: {
      'zh-Hans': '亥时三焦通百脉，宜静卧准备入睡。',
      'zh-Hant': '亥時三焦通百脈，宜靜臥準備入睡。',
      ja: '亥の刻は三焦が経脈を通す。静かに横になり眠りの準備を。',
      en: 'Triple Burner opens the channels; settle in for sleep.',
    },
  },
]

/**
 * 五行 palette — modern designer hues (Tailwind 600-level), keeping the
 * traditional semantic mapping but trading the muted 中国画 originals for a
 * vivid, distinguishable set that reads on both light + dark themes.
 *
 * - 木 (Wood)  emerald-600 — alive, growing
 * - 火 (Fire)  red-600 — cardinal cinnabar
 * - 土 (Earth) amber-600 — warm clay-gold
 * - 金 (Metal) zinc-600 — modern gunmetal (distinguishable from 土's amber)
 * - 水 (Water) blue-600 — deep ocean
 *
 * Used everywhere 五行 surfaces in UI: timeline + make-if dots, 干支 grids, 八字
 * pillars, 时辰 wheel. Changing values here propagates by import (5 call sites).
 */
export const ELEMENT_COLORS: Record<ShichenEntry['element'], string> = {
  木: '#16A34A',
  火: '#DC2626',
  土: '#D97706',
  金: '#52525B',
  水: '#2563EB',
}

/** Compute the active 时辰 index from a wall-clock hour. 23:00 belongs to 子时 (next day). */
export function activeShichenIndex(hour: number): number {
  // 子时 (0) covers 23:00–00:59. Other hours are 2h windows starting at 01:00 (丑时 = 1).
  if (hour === 23) return 0
  return Math.floor((hour + 1) / 2)
}
