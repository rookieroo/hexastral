/**
 * @zhop/astro-core — 关系决策推演 (Relationship Make-If, Kindred Workstream B)
 *
 * The relationship analogue of auspice's make-if, but framed as **forward
 * decision support**, never past rumination (the risky use the Auspice S5 cut
 * flagged). The question is always: "假如我们在某个窗口推进这段关系，哪个时机最合？"
 *
 * Deterministic by design (ADR-0023: "the LLM only dresses a hit"): we rank the
 * forward 流月 windows of the PAIR by how well each month's 五行 / 冲合 aligns with
 * the relationship's 通关用神, and hand back a structured verdict. An LLM verdict
 * can later *dress* this; the lean + reasons stay deterministic + testable.
 *
 * Reuses the already-tested `getRelationshipLiuYueNodes` (per-month 干支 + 双方
 * 冲/合) so there is no new 五行 math beyond the 用神 + scoring. A = 用户, B = 对方.
 */

import { STEM_WUXING, WUXING_GENERATE, WUXING_OVERCOME } from './constants'
import { calculateDaYun } from './dayun'
import {
  getRelationshipLiuYueNodes,
  type RelationshipPerson,
  type RelLiuYueOptions,
} from './relationship-timeline'
import { getTaoHua, getYiMa } from './shensha'
import type { EarthlyBranch, WuXing } from './types'

export type DecisionLean = 'favorable' | 'mixed' | 'caution'

/** One candidate window (a forward month), scored + flagged for the decision. */
export interface RelDecisionWindow {
  year: number
  month: number
  /** 1st of the calendar month, ISO `YYYY-MM-DD` (UTC). */
  date: string
  /** Month pillar 干支 label (e.g. "辛卯"). */
  ganZhi: string
  /** Month stem 五行. */
  element: WuXing
  /** Higher = more favorable to act in. */
  score: number
  lean: DecisionLean
  /** Structured flags (client localizes; server text is zh). */
  isYongshen: boolean
  feedsYongshen: boolean
  harmony: boolean
  clash: boolean
  /**
   * Move-SPECIFIC 神煞 signals — the month branch is either party's 桃花 (romance),
   * 驿马 (movement), or the month feeds either party's 食伤 (output/children). These
   * are NOT in `score` (they don't make a month universally better to advance); the
   * client weights them per decision-move (求婚→桃花, 异地→驿马, 要孩子→食伤).
   */
  taohua: boolean
  yima: boolean
  shishang: boolean
  /** Deterministic zh reasons (one per active signal). */
  reasons: string[]
}

export interface RelDecisionResult {
  /** The relationship's 通关用神 (one element). */
  yongshen: WuXing
  /** Why that element bridges the pair. */
  yongshenNote: string
  /** Candidate windows in chronological order (each scored). */
  windows: RelDecisionWindow[]
  /** Highest-scoring window (the recommended timing); undefined if none. */
  best?: RelDecisionWindow
  /** Deterministic zh synthesis verdict. */
  verdict: string
}

export interface RelMakeIfOptions extends RelLiuYueOptions {}

/**
 * 关系通关用神 (与 svc-astro hehun.computeRelationshipYongshen 同算法, 纯 五行):
 *   克 → 通关元素 (controller 生 X, X 生 controlled)。
 *   比和 → 泄秀 (channel the doubled element)。
 *   相生 → cultivate the flow's next outlet。
 */
export function relationshipYongshen(a: WuXing, b: WuXing): { element: WuXing; note: string } {
  if (WUXING_OVERCOME[a] === b) {
    const x = WUXING_GENERATE[a]
    return { element: x, note: `${a}克${b}，以${x}通关（${a}生${x}、${x}生${b}），化相克为相生` }
  }
  if (WUXING_OVERCOME[b] === a) {
    const x = WUXING_GENERATE[b]
    return { element: x, note: `${b}克${a}，以${x}通关（${b}生${x}、${x}生${a}），化相克为相生` }
  }
  if (a === b) {
    const x = WUXING_GENERATE[a]
    return { element: x, note: `双方同为${a}，比和过旺，以${x}泄其秀、引气流通` }
  }
  const senior = WUXING_GENERATE[a] === b ? a : b
  const x = WUXING_GENERATE[WUXING_GENERATE[senior]]
  return { element: x, note: `${a}与${b}相生流通，以${x}续其生机、令气不滞` }
}

function leanOf(score: number): DecisionLean {
  if (score >= 3) return 'favorable'
  if (score <= -1) return 'caution'
  return 'mixed'
}

/**
 * 推演这段关系未来若干月里「最适合推进的时机」。纯函数, 确定性。
 *
 * 评分: 用神当令 +3 / 月元素生用神 +1 / 流月合日支 +2(双方再 +1) / 流月冲日支 −2(双方再 −1)。
 * best = 最高分窗口; verdict = 据 best 与最差窗口的确定性综述 (LLM 仅日后润色)。
 */
export function planRelationshipDecision(
  personA: RelationshipPerson,
  personB: RelationshipPerson,
  opts: RelMakeIfOptions = {}
): RelDecisionResult {
  // Each chart once — day-master 五行 (for 用神 + 食伤) + 本命支 (for 桃花 / 驿马).
  const chartA = calculateDaYun(personA.input, personA.gender).pillars
  const chartB = calculateDaYun(personB.input, personB.gender).pillars
  const elA = STEM_WUXING[chartA.day.stem]
  const elB = STEM_WUXING[chartB.day.stem]
  const ys = relationshipYongshen(elA, elB)
  // 桃花 / 驿马 reckoned off each 本命支 (年支); 食伤 = the month feeds the day master.
  const taohuaA = getTaoHua(chartA.year.branch as EarthlyBranch)
  const taohuaB = getTaoHua(chartB.year.branch as EarthlyBranch)
  const yimaA = getYiMa(chartA.year.branch as EarthlyBranch)
  const yimaB = getYiMa(chartB.year.branch as EarthlyBranch)
  const shishangElA = WUXING_GENERATE[elA] // 我生者 = 食伤
  const shishangElB = WUXING_GENERATE[elB]

  const { nodes } = getRelationshipLiuYueNodes(personA, personB, opts)

  const windows: RelDecisionWindow[] = nodes.map((n) => {
    const element = STEM_WUXING[n.ganZhi.stem]
    const branch = n.ganZhi.branch as EarthlyBranch
    const isYongshen = element === ys.element
    const feedsYongshen = !isYongshen && WUXING_GENERATE[element] === ys.element
    const harmony = n.harmonyA || n.harmonyB
    const bothHarmony = n.harmonyA && n.harmonyB
    const clash = n.clashA || n.clashB
    const bothClash = n.clashA && n.clashB
    const taohua = branch === taohuaA || branch === taohuaB
    const yima = branch === yimaA || branch === yimaB
    const shishang = element === shishangElA || element === shishangElB

    let score = 0
    const reasons: string[] = []
    if (isYongshen) {
      score += 3
      reasons.push(`流月${element}当令，正合你们的用神【${ys.element}】，气最顺`)
    } else if (feedsYongshen) {
      score += 1
      reasons.push(`流月${element}生用神【${ys.element}】，为推进蓄势`)
    }
    if (harmony) {
      score += bothHarmony ? 3 : 2
      reasons.push(bothHarmony ? '流月合双方日支，彼此皆顺' : '流月合一方日支，气氛和缓')
    }
    if (clash) {
      score += bothClash ? -3 : -2
      reasons.push(bothClash ? '流月冲双方日支，易两头起波' : '流月冲一方日支，留心摩擦')
    }

    return {
      year: n.year,
      month: n.month ?? 0,
      date: n.effectiveDate,
      ganZhi: n.ganZhi.label,
      element,
      score,
      lean: leanOf(score),
      isYongshen,
      feedsYongshen,
      harmony,
      clash,
      taohua,
      yima,
      shishang,
      reasons,
    }
  })

  // best = 最高分 (并列取最早); 用稳定的「分高→早」选。
  let best: RelDecisionWindow | undefined
  for (const w of windows) {
    if (!best || w.score > best.score) best = w
  }

  return {
    yongshen: ys.element,
    yongshenNote: ys.note,
    windows,
    best,
    verdict: buildVerdict(ys.element, windows, best),
  }
}

function ym(w: RelDecisionWindow): string {
  return `${w.year}年${w.month}月`
}

function buildVerdict(
  yongshen: WuXing,
  windows: RelDecisionWindow[],
  best?: RelDecisionWindow
): string {
  if (windows.length === 0 || !best) {
    return '窗口内暂无明显的时机差异，关系大致平稳，顺其自然即可。'
  }
  // 最该避开的窗口 = 最低分 (若为负)。
  let worst = windows[0]!
  for (const w of windows) if (w.score < worst.score) worst = w

  const head =
    best.score > 0
      ? `这段关系的用神是【${yongshen}】。未来这些窗口里，${ym(best)}（${best.ganZhi}）最合用神，气最顺，宜在此前后推进重要的一步。`
      : `这段关系的用神是【${yongshen}】。未来这些窗口里没有特别旺的时机，宜稳不宜急，把节奏放在日常经营上。`

  const tail =
    worst.score < 0 && worst.date !== best.date
      ? `而${ym(worst)}（${worst.ganZhi}）流月冲日支，宜避其锋、少做重大决定。`
      : ''

  return `${head}${tail}（此为趋势参考，非定论；真正的决定仍在你们手中。）`
}
