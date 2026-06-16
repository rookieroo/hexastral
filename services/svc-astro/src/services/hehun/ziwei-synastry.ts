/**
 * 紫微斗数 合盘 — pair-level 紫薇 analysis for synastry.
 *
 * The 八字 synastry (computeHeHun) reads how two 子平 charts interact; this adds
 * the SECOND system. Two independent traditions agreeing is a stronger, more
 * defensible read — and the differentiator (see docs/kindred-ziwei-synastry-plan.md).
 *
 * Compute is iztro (via stellar.ts generateChart) — the same engine the 紫微
 * product uses, so placement correctness is owned by iztro, not re-derived here.
 * This module is two pure, golden-tested steps:
 *   1. summarizeZiwei()        — one person's chart → a compact synastry summary.
 *   2. analyzeZiweiSynastry()  — two summaries → structured pair facts:
 *        · 命宫 resonance     (how the two core selves meet)
 *        · 夫妻宫 cross-read   (what each seeks vs who the other is)
 *        · 飞星 (生年四化)      — one chart's birth transformations landing in the
 *          other's palaces: the heart of 紫薇 synastry (化禄 = brings ease there,
 *          化忌 = deep entanglement / friction there, etc.)
 *
 * Output is structured facts (zh), never prose — svc-astro's prompt turns them
 * into the report. Nothing here calls an LLM.
 */

import type { Gender } from '@zhop/astro-core'
import { generateChart } from '../stellar/stellar'

export type SiHua = '化禄' | '化权' | '化科' | '化忌'

/** iztro marks 生年四化 on a star as a single char; map it to the full token. */
const MUTAGEN_TO_SIHUA: Record<string, SiHua> = {
  禄: '化禄',
  权: '化权',
  科: '化科',
  忌: '化忌',
}

export interface ZiweiStarLite {
  name: string
  brightness: string
  siHua: SiHua | null
}

export interface ZiweiPalaceLite {
  name: string
  stem: string
  branch: string
  isBody: boolean
  majorStars: ZiweiStarLite[]
}

/** A compact, synastry-oriented view of one person's 紫微 chart. */
export interface ZiweiSummary {
  fiveElementsClass: string
  /** 命主星 */
  soulStar: string
  /** 身主星 */
  bodyStar: string
  /** Every palace, keyed by its name (命宫/夫妻/…). */
  palaces: Record<string, ZiweiPalaceLite>
  /** Major-star name → the palace it occupies (for 飞星 lookup). */
  starToPalace: Record<string, string>
  /** 生年四化: transformation → the star that carries it in this chart. */
  birthSiHua: Partial<Record<SiHua, string>>
}

export interface ZiweiPersonInput {
  solarDate: string
  timeIndex: number
  gender: Gender
  longitude?: number
  city?: string
}

/** One person's chart → a compact synastry summary. Reuses the stellar engine. */
export function summarizeZiwei(input: ZiweiPersonInput): ZiweiSummary {
  const { palaces, meta } = generateChart({
    solarDate: input.solarDate,
    timeIndex: input.timeIndex,
    gender: input.gender,
    longitude: input.longitude,
    city: input.city,
    userId: 'synastry',
  })

  const palaceMap: Record<string, ZiweiPalaceLite> = {}
  const starToPalace: Record<string, string> = {}
  const birthSiHua: Partial<Record<SiHua, string>> = {}

  for (const p of palaces) {
    const majorStars: ZiweiStarLite[] = p.majorStars.map((s) => {
      const siHua = s.mutagen ? (MUTAGEN_TO_SIHUA[s.mutagen] ?? null) : null
      if (siHua && !birthSiHua[siHua]) birthSiHua[siHua] = s.name
      starToPalace[s.name] = p.name
      return { name: s.name, brightness: s.brightness, siHua }
    })
    palaceMap[p.name] = {
      name: p.name,
      stem: p.heavenlyStem,
      branch: p.earthlyBranch,
      isBody: p.isBodyPalace,
      majorStars,
    }
  }

  return {
    fiveElementsClass: meta.fiveElementsClass,
    soulStar: meta.soul,
    bodyStar: meta.body,
    palaces: palaceMap,
    starToPalace,
    birthSiHua,
  }
}

// ─── Pair analysis ───────────────────────────────────────────

export type ZiweiTone = 'harmony' | 'growth' | 'tension' | 'neutral'

export interface ZiweiFlyingStar {
  /** Which chart the 生年四化 originates from. */
  from: 'A' | 'B'
  siHua: SiHua
  /** The star carrying that transformation in the `from` chart. */
  star: string
  /** The palace it occupies in the OTHER chart (null if that star is absent there). */
  landsIn: string | null
  tone: ZiweiTone
  /** A structured zh fact, ready for the prompt. */
  note: string
}

export interface ZiweiSynastry {
  /** 命宫 主星 of each — how the two core selves meet. */
  mingResonance: { aStars: string[]; bStars: string[]; note: string }
  /** 夫妻宫 cross-read: what each is drawn to vs who the other actually is. */
  spouseCross: { aWants: string[]; bIs: string[]; bWants: string[]; aIs: string[]; note: string }
  /** 生年四化 landing in the other's palaces — both directions. */
  flyingStars: ZiweiFlyingStar[]
  /** Aggregate lean of the 紫微 layer. */
  overall: ZiweiTone
  /** A flat list of the structured facts (for the prompt). */
  facts: string[]
}

const SIHUA_TONE: Record<SiHua, ZiweiTone> = {
  化禄: 'harmony',
  化科: 'harmony',
  化权: 'growth',
  化忌: 'tension',
}

const SIHUA_VERB: Record<SiHua, string> = {
  化禄: '带来顺遂与滋养',
  化权: '带来推动力，也带来掌控与较劲',
  化科: '带来名声、贵人与温和的助力',
  化忌: '带来深刻的牵绊与执念，也容易生出摩擦',
}

/** What each palace governs, framed for the couple. */
const PALACE_MEANING: Record<string, string> = {
  命宫: '核心自我与性格',
  兄弟: '手足缘与日常协作',
  夫妻: '婚恋与亲密关系',
  子女: '子女缘与创造力',
  财帛: '金钱与共享资源',
  疾厄: '身心健康与压力',
  迁移: '在外的际遇与共同的人生旅程',
  仆役: '朋友圈与人脉',
  官禄: '事业与共同目标',
  田宅: '家庭与居所',
  福德: '精神享受与幸福感',
  父母: '长辈缘与庇荫',
}

const LABEL: Record<'A' | 'B', string> = { A: '甲方', B: '乙方' }

function flyingStarNote(from: 'A' | 'B', siHua: SiHua, star: string, palace: string): string {
  const to = from === 'A' ? 'B' : 'A'
  const realm = PALACE_MEANING[palace] ?? palace
  return `${LABEL[from]}的${siHua}（${star}）落入${LABEL[to]}的${palace}宫——${LABEL[from]}在${LABEL[to]}的「${realm}」上${SIHUA_VERB[siHua]}。`
}

function collectFlyingStars(
  from: 'A' | 'B',
  source: ZiweiSummary,
  target: ZiweiSummary
): ZiweiFlyingStar[] {
  const out: ZiweiFlyingStar[] = []
  for (const [siHua, star] of Object.entries(source.birthSiHua) as [SiHua, string][]) {
    const landsIn = target.starToPalace[star] ?? null
    if (!landsIn) continue
    out.push({
      from,
      siHua,
      star,
      landsIn,
      tone: SIHUA_TONE[siHua],
      note: flyingStarNote(from, siHua, star, landsIn),
    })
  }
  return out
}

const majorNames = (p: ZiweiPalaceLite | undefined): string[] =>
  p ? p.majorStars.map((s) => s.name) : []

/** Two 紫微 summaries → structured synastry facts. Pure; mirrors A↔B fairly. */
export function analyzeZiweiSynastry(a: ZiweiSummary, b: ZiweiSummary): ZiweiSynastry {
  const aMing = majorNames(a.palaces.命宫)
  const bMing = majorNames(b.palaces.命宫)
  const shared = aMing.filter((s) => bMing.includes(s))
  const mingNote = shared.length
    ? `两人命宫同现${shared.join('、')}，核心气质相近，容易一拍即合，也可能在同一处较劲。`
    : `甲方命宫主星为${aMing.join('、') || '空宫（借对宫）'}，乙方为${bMing.join('、') || '空宫（借对宫）'}，两种核心气质需要彼此理解与欣赏。`

  const aWants = majorNames(a.palaces.夫妻)
  const bWants = majorNames(b.palaces.夫妻)
  // What A is drawn to (A's 夫妻宫) vs who B is (B's 命宫), and the mirror.
  const aMatch = aWants.filter((s) => bMing.includes(s))
  const bMatch = bWants.filter((s) => aMing.includes(s))
  const spouseNote = `甲方理想伴侣的样子（夫妻宫${aWants.join('、') || '空宫'}）${
    aMatch.length ? `与乙方本人气质有${aMatch.join('、')}相合` : '与乙方本人气质需要磨合'
  }；乙方所向往的（夫妻宫${bWants.join('、') || '空宫'}）${
    bMatch.length ? `也能在甲方身上看到${bMatch.join('、')}` : '在甲方身上则要慢慢发现'
  }。`

  const flyingStars = [...collectFlyingStars('A', a, b), ...collectFlyingStars('B', b, a)]

  const score = flyingStars.reduce((acc, f) => {
    if (f.tone === 'harmony') return acc + 1
    if (f.tone === 'tension') return acc - 1
    return acc
  }, 0)
  const tensionCount = flyingStars.filter((f) => f.tone === 'tension').length
  let overall: ZiweiTone = 'neutral'
  if (score >= 2) overall = 'harmony'
  else if (score <= -1 && tensionCount >= 2) overall = 'tension'
  else if (flyingStars.some((f) => f.tone === 'growth') || score < 0) overall = 'growth'
  else if (score > 0) overall = 'harmony'

  const facts = [mingNote, spouseNote, ...flyingStars.map((f) => f.note)]

  return {
    mingResonance: { aStars: aMing, bStars: bMing, note: mingNote },
    spouseCross: { aWants, bIs: bMing, bWants, aIs: aMing, note: spouseNote },
    flyingStars,
    overall,
    facts,
  }
}
