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
 * Locale policy mirrors the preset library: structural frames are authored in all
 * four reading locales; the personality 词库 is authored zh + en (zh-Hant → zh,
 * ja → en), so a reader always gets chart-grounded content, never a generic
 * string. The localised data atoms (日主 / 格局 / 五行 / 旺衰) come from the same
 * label helpers the identity line already uses, so the teaser reads in one voice
 * with the rest of the report.
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

/** zh / zh-Hant share authored CJK frames; en / ja share the English ones. */
type Lang = 'zh' | 'en'
function lang(locale: Locale): Lang {
  return locale === 'zh' || locale === 'zh-Hant' ? 'zh' : 'en'
}

/** 喜用神 → one line of grounded, non-fatalistic direction (no LLM). */
const ELEMENT_ADVICE: Record<WuXing, Record<Locale, string>> = {
  木: {
    zh: '宜向生长、教育、企划、与人协作的方向用力，主动开局比固守更得力',
    'zh-Hant': '宜向生長、教育、企劃、與人協作的方向用力，主動開局比固守更得力',
    ja: '成長・教育・企画・協働の方向に力を注ぐとよく、守りより自ら動くほうが活きる',
    en: 'lean toward growth, learning, planning and collaboration — opening a path serves you better than holding one',
  },
  火: {
    zh: '宜向表达、展示、文化、连接人群的方向用力，被看见之处即是你的运势出口',
    'zh-Hant': '宜向表達、展示、文化、連接人群的方向用力，被看見之處即是你的運勢出口',
    ja: '表現・発信・文化・人とのつながりに向かうとよく、見られる場こそ運の出口になる',
    en: 'lean toward expression, visibility, culture and connecting people — being seen is where your luck opens',
  },
  土: {
    zh: '宜向稳健、信任、积累、地产与中介的方向用力，慢即是稳，稳即是进',
    'zh-Hant': '宜向穩健、信任、積累、地產與中介的方向用力，慢即是穩，穩即是進',
    ja: '堅実さ・信頼・蓄積・不動産や仲介の方向に力を。ゆっくりが安定、安定が前進',
    en: 'lean toward stability, trust, accumulation and acting as the middle ground — slow is steady, and steady is progress',
  },
  金: {
    zh: '宜向规则、决断、技术、精工与金融的方向用力，锋利处即是你的长处',
    'zh-Hant': '宜向規則、決斷、技術、精工與金融的方向用力，鋒利處即是你的長處',
    ja: 'ルール・決断・技術・精緻さ・金融の方向に力を。鋭さこそあなたの強み',
    en: 'lean toward structure, decisiveness, craft, precision and finance — your edge is exactly where your strength lives',
  },
  水: {
    zh: '宜向流动、谋略、跨界、研究与远行的方向用力，越是变化越能成全你',
    'zh-Hant': '宜向流動、謀略、跨界、研究與遠行的方向用力，越是變化越能成全你',
    ja: '流動・戦略・越境・研究・遠行の方向に力を。変化が多いほどあなたを活かす',
    en: 'lean toward movement, strategy, crossing boundaries, research and travel — the more things shift, the more they favour you',
  },
}

/** 十神 framing for the active 大运 — one grounded line per category, per locale. */
const RELATION_PROSE: Record<DayunRelation['kind'], Record<Locale, string>> = {
  self: {
    zh: '同气相求，是立身扎根之运。结盟、自立皆可成，唯须防同途相争、与人耗力',
    'zh-Hant': '同氣相求，是立身扎根之運。結盟、自立皆可成，唯須防同途相爭、與人耗力',
    ja: '同気が集まる、自立と地固めの運。連携も独立も成りやすいが、同類との競合に注意',
    en: 'kindred force gathers — a cycle for standing on your own. Alliances and self-reliance both take root; only guard against rivalry with your own kind',
  },
  output: {
    zh: '日主泄秀，才华外显，宜创作、宜表达、宜被看见，唯须节用其才，不可逞强',
    'zh-Hant': '日主洩秀，才華外顯，宜創作、宜表達、宜被看見，唯須節用其才，不可逞強',
    ja: '才が外へ流れ出る運。創作・表現・発信に向くが、力を使い切らず加減を保つこと',
    en: 'your talent flows outward — a cycle to create, express and be seen; only spend that brilliance with measure',
  },
  wealth: {
    zh: '财来就我，进取有得，宜谋划、宜落地，唯须脚踏实地，重情义而不吝',
    'zh-Hant': '財來就我，進取有得，宜謀劃、宜落地，唯須腳踏實地，重情義而不吝',
    ja: '財がこちらに向く運。攻めれば得るが、地に足をつけ、損得より情義を重く',
    en: 'wealth turns toward you — initiative pays here; only stay grounded, and keep loyalty above ledgers',
  },
  authority: {
    zh: '受官受名，是承位担责之运，当受则受、不必躲，唯忌躁进、不可越权',
    'zh-Hant': '受官受名，是承位擔責之運，當受則受、不必躲，唯忌躁進、不可越權',
    ja: '地位と名が来る、責を担う運。受けるべきは受けてよいが、焦りと越権は禁物',
    en: 'rank and name arrive — a cycle of taking your seat and its weight; accept what is yours, but never overreach or rush it',
  },
  seal: {
    zh: '得贵人提携，受人之恩，宜读书、宜签约立契，事业有上行之挽',
    'zh-Hant': '得貴人提攜，受人之恩，宜讀書、宜簽約立契，事業有上行之挽',
    ja: '引き立てと恩を受ける運。学び・契約・正式な結びに向き、事は上へ引かれる',
    en: 'mentors and support reach you — a cycle to study, to sign and formalise; your work gets pulled upward',
  },
}

/** 大运五行 vs 喜忌 → whether the period runs with or against the day master. */
function periodNote(dayunElement: WuXing, chart: FateNatalChart, locale: Locale): string {
  const fav = chart.geju.favorableElement
  const unfav = chart.geju.unfavorableElement
  if (dayunElement === fav) {
    return {
      zh: '此运行的正是你的喜用之气，顺势而为，借力比独力更易成事。',
      'zh-Hant': '此運行的正是你的喜用之氣，順勢而為，借力比獨力更易成事。',
      ja: 'この運はまさにあなたの喜用の気。流れに乗り、独力より借力で進めると成りやすい。',
      en: 'This cycle runs on your favourable element — move with it; leverage will carry you further than force alone.',
    }[locale]
  }
  if (dayunElement === unfav) {
    return {
      zh: '此运五行偏忌，宜守不宜进，避免硬碰，养精蓄锐待下一程。',
      'zh-Hant': '此運五行偏忌，宜守不宜進，避免硬碰，養精蓄銳待下一程。',
      ja: 'この運の五行はやや忌。攻めより守り、無理を避け、力を蓄えて次の運を待つ。',
      en: 'This cycle leans against your chart — hold rather than push, avoid head-on contests, and bank your strength for the next leg.',
    }[locale]
  }
  return {
    zh: '此运与你日主互有牵引，得失参半，关键不在时运而在选择。',
    'zh-Hant': '此運與你日主互有牽引，得失參半，關鍵不在時運而在選擇。',
    ja: 'この運は日主と引き合い、得失は半ば。鍵は運そのものより、あなたの選択にある。',
    en: 'This cycle pulls both with and against you — gains and costs in equal measure; the turning point is your choice, not the timing.',
  }[locale]
}

/** Join the three personality bullets into one flowing sentence per language. */
function personalityProse(bullets: readonly [string, string, string], l: Lang): string {
  if (l === 'zh') return `${bullets[0]}；${bullets[1]}。${bullets[2]}。`
  return `${bullets[0]}. ${bullets[1]}. ${bullets[2]}.`
}

export function composeTeaserNarrator(input: TeaserNarratorInput): TeaserNarration {
  const { chart, dayun, soulPalaceStars, locale } = input
  const l = lang(locale)

  const dmWuxing = chart.dayMasterWuXing as WuXing
  const dm = dayMasterLabel(chart.dayMaster, dmWuxing, locale)
  const strength = strengthLabel(chart.geju.dayMasterStrength, locale)
  const geju = gejuLabel(chart.geju.primary, locale)
  const fav = chart.geju.favorableElement
  const favLabel = elementLabel(fav, locale)
  const advice = ELEMENT_ADVICE[fav][locale]

  const preset = getPresetPersonality(chart.dayMaster, chart.pillars.month.branch, locale)
  const traits = personalityProse(preset.personalityBullets, l)

  // ── ch1 — who you are ────────────────────────────────────────────────────
  const soulClause = soulPalaceStars
    ? l === 'zh'
      ? `，命宫坐${soulPalaceStars}`
      : `, with ${soulPalaceStars} seated in your Soul palace`
    : ''

  const ch1 =
    l === 'zh'
      ? `你以${dm}立命，日主${strength}，命格属${geju}${soulClause}。\n\n${traits}\n\n五行喜${favLabel}：${advice}。${preset.fateTease}`
      : `Your day master is ${dm}, ${strength}, structured as a ${geju} chart${soulClause}.\n\n${traits}\n\nYour favourable element is ${favLabel} — ${advice}. ${preset.fateTease}`

  // ── ch4 — your current cycle ─────────────────────────────────────────────
  let ch4: string
  if (dayun.active && dayun.relation) {
    const a = dayun.active
    const gz = `${a.ganZhi.stem}${a.ganZhi.branch}`
    const dayunElement = STEM_WUXING[a.ganZhi.stem]
    const relProse = RELATION_PROSE[dayun.relation.kind][locale]
    const relLabel = dayun.relation.label // 已含「比劫之运 · 立身」式中文短签，仅 zh 体系展示
    const note = periodNote(dayunElement, chart, locale)
    ch4 =
      l === 'zh'
        ? `你正行${gz}大运（${a.startAge}–${a.endAge}岁）${locale === 'zh' ? `，${relLabel}` : ''}。${relProse}。\n\n${note}`
        : `You are in the ${gz} decade cycle (ages ${a.startAge}–${a.endAge}) — ${relProse}.\n\n${note}`
  } else {
    // No usable 大运 window (rare: compute fell back). Stay honest, stay grounded.
    ch4 =
      l === 'zh'
        ? `你正处在两段大运的交接处，气场尚未完全落定。此刻最值得做的不是急于推进，而是看清自己真正想去的方向——${preset.warning}`
        : `You are at the handover between two decade cycles, and the field has not fully settled. The work right now is less about pushing forward and more about seeing where you actually want to go — ${preset.warning}`
  }

  return { ch1, ch4 }
}
