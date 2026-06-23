/**
 * 换视角 (perspective re-roll) presets — five authored "voices" the reader can
 * re-read a chapter through. The chapter TOPIC is fixed (性格 / 事业 …); a preset
 * changes the interpretive VOICE, not the subject. `seedZh`/`seedEn` are the short
 * (≤64 char) steers POSTed to the reroll endpoint; label/desc drive the picker UI.
 *
 * Voice presets (not topic switches) keep the re-reads feeling like "another way
 * to read the same chart", which is the right framing — never "the last one was
 * wrong". The seed picks zh vs en by the report's content language (matching the
 * generation-locale policy: zh/zh-Hant → zh, en/ja → en).
 */

import type { Locale } from '@/components/reading/reading-i18n'

export interface PerspectivePreset {
  id: string
  label: Record<Locale, string>
  desc: Record<Locale, string>
  /** ≤64-char prompt steer in the report's language. */
  seedZh: string
  seedEn: string
}

export const PERSPECTIVE_PRESETS: readonly PerspectivePreset[] = [
  {
    id: 'classical',
    label: { zh: '古法直断', 'zh-Hant': '古法直斷', ja: '古法・断', en: 'Classical Verdict' },
    desc: {
      zh: '碑拓式、简练、断语直接',
      'zh-Hant': '碑拓式、簡練、斷語直接',
      ja: '碑拓のように簡潔・断定的',
      en: 'Terse, classical, direct verdicts',
    },
    seedZh: '古法碑拓口吻：简练、断语直接、不铺陈',
    seedEn: 'Classical terse verdicts, no elaboration',
  },
  {
    id: 'confidant',
    label: { zh: '知己夜话', 'zh-Hant': '知己夜話', ja: '知己の語り', en: 'Confidant' },
    desc: {
      zh: '第二人称、温暖、戳情绪',
      'zh-Hant': '第二人稱、溫暖、戳情緒',
      ja: '二人称・温かく・感情に触れる',
      en: 'Second-person, warm, emotional',
    },
    seedZh: '知己夜话口吻：第二人称、温暖、戳情绪',
    seedEn: "Confidant's voice: second-person, warm, emotional",
  },
  {
    id: 'psychology',
    label: { zh: '现代心理', 'zh-Hant': '現代心理', ja: '現代心理', en: 'Modern Psychology' },
    desc: {
      zh: '用自我认知语言重述命理',
      'zh-Hant': '用自我認知語言重述命理',
      ja: '自己理解の言葉で命理を語り直す',
      en: 'Reframes the chart in self-understanding terms',
    },
    seedZh: '现代心理视角：用自我认知/心理语言重述命理',
    seedEn: 'Modern psychology framing of the chart',
  },
  {
    id: 'strategist',
    label: { zh: '谋略实战', 'zh-Hant': '謀略實戰', ja: '実戦の策', en: 'Strategist' },
    desc: {
      zh: '务实、给具体决策与行动',
      'zh-Hant': '務實、給具體決策與行動',
      ja: '実務的・具体的な判断と行動',
      en: 'Pragmatic, concrete decisions & actions',
    },
    seedZh: '谋略实战口吻：务实、给具体决策与行动',
    seedEn: "Strategist's voice: pragmatic, concrete actions",
  },
  {
    id: 'poetic',
    label: { zh: '诗意写意', 'zh-Hant': '詩意寫意', ja: '詩的・写意', en: 'Poetic' },
    desc: {
      zh: '隐喻、留白、文学化',
      'zh-Hant': '隱喻、留白、文學化',
      ja: '隠喩・余白・文学的',
      en: 'Metaphor-rich, spare, literary',
    },
    seedZh: '诗意写意口吻：隐喻、留白、文学化',
    seedEn: 'Poetic, metaphor-rich, literary',
  },
] as const

/** The ≤64-char seed for this preset in the report's content language. */
export function perspectiveSeed(p: PerspectivePreset, locale: Locale): string {
  return locale === 'zh' || locale === 'zh-Hant' ? p.seedZh : p.seedEn
}

const ORIGINAL_LABEL: Record<Locale, string> = {
  zh: '原版',
  'zh-Hant': '原版',
  ja: '原文',
  en: 'Original',
}
const CUSTOM_LABEL: Record<Locale, string> = {
  zh: '自定视角',
  'zh-Hant': '自定視角',
  ja: 'カスタム視点',
  en: 'Custom voice',
}

/** Label a saved version by its perspective seed (null = the first/原版 generation). */
export function labelForSeed(seed: string | null, locale: Locale): string {
  if (!seed) return ORIGINAL_LABEL[locale]
  const p = PERSPECTIVE_PRESETS.find((x) => x.seedZh === seed || x.seedEn === seed)
  return p ? p.label[locale] : CUSTOM_LABEL[locale]
}

/** UI copy for the 换视角 entry + picker + soft notices. */
export const REROLL_UI: Record<
  Locale,
  {
    button: string
    title: string
    subtitle: string
    rerolling: string
    exhausted: string
    failed: string
    remaining: (n: number) => string
    historyButton: string
    historyTitle: string
    historyEmpty: string
  }
> = {
  zh: {
    button: '换个视角',
    title: '换个视角重读',
    subtitle: '同一份命盘，换种声音再读一遍',
    rerolling: '正在以新视角重读…',
    exhausted: '本月换视角已用完，下月重置',
    failed: '重读失败，请稍后再试',
    remaining: (n) => `本月还剩 ${n} 次`,
    historyButton: '历史视角',
    historyTitle: '读过的视角',
    historyEmpty: '本章暂无其他视角',
  },
  'zh-Hant': {
    button: '換個視角',
    title: '換個視角重讀',
    subtitle: '同一份命盤，換種聲音再讀一遍',
    rerolling: '正在以新視角重讀…',
    exhausted: '本月換視角已用完，下月重置',
    failed: '重讀失敗，請稍後再試',
    remaining: (n) => `本月還剩 ${n} 次`,
    historyButton: '歷史視角',
    historyTitle: '讀過的視角',
    historyEmpty: '本章暫無其他視角',
  },
  ja: {
    button: '視点を変える',
    title: '別の視点で読み直す',
    subtitle: '同じ命盤を、別の声でもう一度',
    rerolling: '新しい視点で読み直し中…',
    exhausted: '今月の視点替えは上限に達しました（来月リセット）',
    failed: '読み直しに失敗しました。後でお試しください',
    remaining: (n) => `今月あと ${n} 回`,
    historyButton: '過去の視点',
    historyTitle: '読んだ視点',
    historyEmpty: 'この章に他の視点はまだありません',
  },
  en: {
    button: 'Another voice',
    title: 'Re-read in another voice',
    subtitle: 'The same chart, read through a different voice',
    rerolling: 'Re-reading in a new voice…',
    exhausted: "You've used this month's re-reads — resets next month",
    failed: 'Re-read failed — please try again',
    remaining: (n) => `${n} left this month`,
    historyButton: 'Past voices',
    historyTitle: 'Voices you’ve read',
    historyEmpty: 'No other voices for this chapter yet',
  },
}
