/**
 * teaser-narrator — the deterministic, no-LLM 命书 taste.
 *
 * The free tier never calls the LLM (that's the paid chapters). But "free" must
 * still hand back something real, not a "生成中…" placeholder that never resolves.
 * This composes ch1 (人格 / who-you-are) and ch4 (现运 / current-cycle) purely
 * from the computed chart — 日主五行 · 旺衰 · 格局 · 喜用神 · 当前大运十神 — plus
 * the deterministic 命理词库 (personality-presets.ts, the same library Yuun's
 * push and the server LLM-fallback draw on). Same input → same prose, offline.
 *
 * Language policy mirrors the preset library (and the server's normLang): the
 * 词库 is authored in zh + en only, so the whole teaser block commits to ONE of
 * the two — zh / zh-Hant → Chinese, ja / en → English — labels included. Keeping
 * one script per block avoids the jarring mix of, say, Japanese 干支 labels glued
 * to English trait prose, and matches exactly what a ja reader already gets from
 * the server fallback today.
 */

import { STEM_WUXING, type WuXing } from '@zhop/astro-core'
import {
  dayMasterLabel,
  elementLabel,
  gejuLabel,
  type Locale,
  strengthLabel,
} from './components/reading-i18n'
import type { FateNatalChart } from './natal'
import { getPresetPersonality } from './personality-presets'
import type { DayunRelation, DayunVisible } from './reading'

export interface TeaserNarratorInput {
  chart: FateNatalChart
  /** Active 大运 + its 十神 relation to the day master (from analyzeDayunRelation). */
  dayun: { active: DayunVisible | null; relation: DayunRelation | null }
  /** 命宫 major stars, already joined ("紫微 天府"); folded into the ch1 opener. */
  soulPalaceStars?: string | null
  locale: Locale
}

export interface TeaserNarration {
  /** 人格 chapter body — day-master identity + the 词库 personality read. */
  ch1: string
  /** 现运 chapter body — the active 大运, its 十神 framing, 喜忌 of the period. */
  ch4: string
}

/** The 词库 is authored in two languages; the display locale picks one. */
type Lang = 'zh' | 'en'
function langOf(locale: Locale): Lang {
  return locale === 'zh' || locale === 'zh-Hant' ? 'zh' : 'en'
}
/** Render data-atom labels (日主 / 格局 / 五行 / 旺衰) in the block's language, so
 *  the labels match the prose script rather than the display locale. */
function labelLocaleOf(lang: Lang): Locale {
  return lang === 'zh' ? 'zh' : 'en'
}

/** 喜用神 → one line of grounded, non-fatalistic direction (no LLM). */
const ELEMENT_ADVICE: Record<WuXing, Record<Lang, string>> = {
  木: {
    zh: '宜向生长、教育、企划、与人协作的方向用力，主动开局比固守更得力',
    en: 'lean toward growth, learning, planning and collaboration — opening a path serves you better than holding one',
  },
  火: {
    zh: '宜向表达、展示、文化、连接人群的方向用力，被看见之处即是你的运势出口',
    en: 'lean toward expression, visibility, culture and connecting people — being seen is where your luck opens',
  },
  土: {
    zh: '宜向稳健、信任、积累、地产与中介的方向用力，慢即是稳，稳即是进',
    en: 'lean toward stability, trust, accumulation and acting as the middle ground — slow is steady, and steady is progress',
  },
  金: {
    zh: '宜向规则、决断、技术、精工与金融的方向用力，锋利处即是你的长处',
    en: 'lean toward structure, decisiveness, craft, precision and finance — your edge is exactly where your strength lives',
  },
  水: {
    zh: '宜向流动、谋略、跨界、研究与远行的方向用力，越是变化越能成全你',
    en: 'lean toward movement, strategy, crossing boundaries, research and travel — the more things shift, the more they favour you',
  },
}

/** 十神 framing for the active 大运 — one grounded line per category, per language. */
const RELATION_PROSE: Record<DayunRelation['kind'], Record<Lang, string>> = {
  self: {
    zh: '同气相求，是立身扎根之运。结盟、自立皆可成，唯须防同途相争、与人耗力',
    en: 'kindred force gathers — a cycle for standing on your own. Alliances and self-reliance both take root; only guard against rivalry with your own kind',
  },
  output: {
    zh: '日主泄秀，才华外显，宜创作、宜表达、宜被看见，唯须节用其才，不可逞强',
    en: 'your talent flows outward — a cycle to create, express and be seen; only spend that brilliance with measure',
  },
  wealth: {
    zh: '财来就我，进取有得，宜谋划、宜落地，唯须脚踏实地，重情义而不吝',
    en: 'wealth turns toward you — initiative pays here; only stay grounded, and keep loyalty above ledgers',
  },
  authority: {
    zh: '受官受名，是承位担责之运，当受则受、不必躲，唯忌躁进、不可越权',
    en: 'rank and name arrive — a cycle of taking your seat and its weight; accept what is yours, but never overreach or rush it',
  },
  seal: {
    zh: '得贵人提携，受人之恩，宜读书、宜签约立契，事业有上行之挽',
    en: 'mentors and support reach you — a cycle to study, to sign and formalise; your work gets pulled upward',
  },
}

/** 大运五行 vs 喜忌 → whether the period runs with or against the day master. */
function periodNote(dayunElement: WuXing, chart: FateNatalChart, lang: Lang): string {
  const fav = chart.geju.favorableElement
  const unfav = chart.geju.unfavorableElement
  if (dayunElement === fav) {
    return lang === 'zh'
      ? '此运行的正是你的喜用之气，顺势而为，借力比独力更易成事。'
      : 'This cycle runs on your favourable element — move with it; leverage will carry you further than force alone.'
  }
  if (dayunElement === unfav) {
    return lang === 'zh'
      ? '此运五行偏忌，宜守不宜进，避免硬碰，养精蓄锐待下一程。'
      : 'This cycle leans against your chart — hold rather than push, avoid head-on contests, and bank your strength for the next leg.'
  }
  return lang === 'zh'
    ? '此运与你日主互有牵引，得失参半，关键不在时运而在选择。'
    : 'This cycle pulls both with and against you — gains and costs in equal measure; the turning point is your choice, not the timing.'
}

/** Join the three personality bullets into one flowing sentence per language. */
function personalityProse(bullets: readonly [string, string, string], lang: Lang): string {
  if (lang === 'zh') return `${bullets[0]}；${bullets[1]}。${bullets[2]}。`
  return `${bullets[0]}. ${bullets[1]}. ${bullets[2]}.`
}

export function composeTeaserNarrator(input: TeaserNarratorInput): TeaserNarration {
  const { chart, dayun, soulPalaceStars } = input
  const lang = langOf(input.locale)
  const ll = labelLocaleOf(lang)

  const dmWuxing = chart.dayMasterWuXing as WuXing
  const dm = dayMasterLabel(chart.dayMaster, dmWuxing, ll)
  const strength = strengthLabel(chart.geju.dayMasterStrength, ll)
  const geju = gejuLabel(chart.geju.primary, ll)
  const favLabel = elementLabel(chart.geju.favorableElement, ll)
  const advice = ELEMENT_ADVICE[chart.geju.favorableElement][lang]

  const preset = getPresetPersonality(chart.dayMaster, chart.pillars.month.branch, ll)
  const traits = personalityProse(preset.personalityBullets, lang)

  // ── ch1 — who you are ────────────────────────────────────────────────────
  const soulClause = soulPalaceStars
    ? lang === 'zh'
      ? `，命宫坐${soulPalaceStars}`
      : `, with ${soulPalaceStars} seated in your Soul palace`
    : ''

  const ch1 =
    lang === 'zh'
      ? `你以${dm}立命，日主${strength}，命格属${geju}${soulClause}。\n\n${traits}\n\n五行喜${favLabel}：${advice}。${preset.fateTease}`
      : `Your day master is ${dm}, ${strength}, structured as a ${geju} chart${soulClause}.\n\n${traits}\n\nYour favourable element is ${favLabel} — ${advice}. ${preset.fateTease}`

  // ── ch4 — your current cycle ─────────────────────────────────────────────
  let ch4: string
  if (dayun.active && dayun.relation) {
    const a = dayun.active
    const gz = `${a.ganZhi.stem}${a.ganZhi.branch}`
    const dayunElement = STEM_WUXING[a.ganZhi.stem]
    const relProse = RELATION_PROSE[dayun.relation.kind][lang]
    const note = periodNote(dayunElement, chart, lang)
    // The 十神 short label (e.g. 「比劫之运 · 立身」) is authored Simplified only;
    // show it just for zh, the relProse carries the meaning for the rest.
    const relTag = input.locale === 'zh' ? `，${dayun.relation.label}` : ''
    ch4 =
      lang === 'zh'
        ? `你正行${gz}大运（${a.startAge}–${a.endAge}岁）${relTag}。${relProse}。\n\n${note}`
        : `You are in the ${gz} decade cycle (ages ${a.startAge}–${a.endAge}) — ${relProse}.\n\n${note}`
  } else {
    // No usable 大运 window (rare: compute fell back). Stay honest, stay grounded.
    ch4 =
      lang === 'zh'
        ? `你正处在两段大运的交接处，气场尚未完全落定。此刻最值得做的不是急于推进，而是看清自己真正想去的方向——${preset.warning}`
        : `You are at the handover between two decade cycles, and the field has not fully settled. The work right now is less about pushing forward and more about seeing where you actually want to go — ${preset.warning}`
  }

  return { ch1, ch4 }
}
