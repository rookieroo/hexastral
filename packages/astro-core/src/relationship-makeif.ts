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
  getRelationshipTimelineNodes,
  type RelationshipPerson,
  type RelLiuYueOptions,
} from './relationship-timeline'
import { getTaoHua, getYiMa } from './shensha'
import type { EarthlyBranch, WuXing } from './types'
import {
  type ZiweiTimingSummary,
  ziweiRelationMonthSignal,
  ziweiRelationYearSignal,
} from './ziwei-timing'

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
  /** 紫微 流月四化 also lights a bond palace (命宫/夫妻/福德) this month — the second
   *  system corroborating the timing. Folded into `score` when present. */
  ziwei: boolean
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

export interface RelMakeIfOptions extends RelLiuYueOptions {
  /** Persisted 紫微 summaries (from the 合盘 report). When BOTH are present, each
   *  window also gets a 紫微 流月 corroboration folded into its score. */
  ziweiA?: ZiweiTimingSummary
  ziweiB?: ZiweiTimingSummary
}

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
    // 紫微 流月印证 (第二套系统): 本月四化点亮任一方的关系宫 → 顺势加分 / 摩擦减分。
    let ziwei = false
    if (opts.ziweiA && opts.ziweiB) {
      const zSig = ziweiRelationMonthSignal(opts.ziweiA, opts.ziweiB, n.ganZhi.stem)
      if (zSig.significant) {
        ziwei = true
        if (zSig.tone === 'harmony') {
          score += 2
          reasons.push('紫微流月四化亦顺势点亮关系宫，两套系统皆利推进')
        } else if (zSig.tone === 'tension') {
          score -= 2
          reasons.push('紫微流月四化触动关系宫且偏忌，宜缓不宜急')
        } else {
          reasons.push('紫微流月四化亦牵动关系宫，能量升而需善用')
        }
      }
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
      ziwei,
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

// ── 长程 (按年) 决策推演 — 未来 N 年里哪一年最适合推进重大一步 ────────────────────

/** One candidate YEAR, scored + flagged. The long-horizon analogue of a window. */
export interface RelDecisionYear {
  year: number
  /** 立春 of the year, ISO `YYYY-MM-DD` (UTC). */
  date: string
  /** Year pillar 干支 label (e.g. "乙巳"). */
  ganZhi: string
  /** Year stem 五行. */
  element: WuXing
  /** Higher = more favorable to act in. */
  score: number
  lean: DecisionLean
  isYongshen: boolean
  feedsYongshen: boolean
  harmony: boolean
  clash: boolean
  /** Move-specific 神煞 (same semantics as the monthly window; not in `score`). */
  taohua: boolean
  yima: boolean
  shishang: boolean
  /** 紫微 流年四化 also lights a bond palace this year (folded into `score`). */
  ziwei: boolean
  reasons: string[]
}

export interface RelDecisionYearResult {
  yongshen: WuXing
  yongshenNote: string
  /** Candidate years in chronological order (each scored). */
  years: RelDecisionYear[]
  /** Highest-scoring year (the recommended window); undefined if none. */
  best?: RelDecisionYear
  verdict: string
}

export interface RelDecisionYearOptions {
  /** First calendar year to rank (inclusive). */
  fromYear: number
  /** How many years forward (default 10 — the near-term that matters). */
  years?: number
  /** Persisted 紫微 summaries — when BOTH present, fold 紫微 流年 into each year's score. */
  ziweiA?: ZiweiTimingSummary
  ziweiB?: ZiweiTimingSummary
}

/**
 * 推演这段关系未来 N 年里「哪一年最适合推进重大一步」(结婚 / 要孩子 / 同居…)。纯函数。
 *
 * 与按月版同一评分体系, 粒度改为流年: 用神当令 +3 / 流年生用神 +1 / 流年合双方日支 +2(双方
 * +1) / 流年冲日支 −2(双方 −1)。复用已测的 getRelationshipTimelineNodes 逐年 冲/合 标注,
 * 故无新增 五行/冲合 数学。A = 用户, B = 对方。
 */
export function planRelationshipDecisionByYear(
  personA: RelationshipPerson,
  personB: RelationshipPerson,
  opts: RelDecisionYearOptions
): RelDecisionYearResult {
  const chartA = calculateDaYun(personA.input, personA.gender).pillars
  const chartB = calculateDaYun(personB.input, personB.gender).pillars
  const elA = STEM_WUXING[chartA.day.stem]
  const elB = STEM_WUXING[chartB.day.stem]
  const ys = relationshipYongshen(elA, elB)
  const taohuaA = getTaoHua(chartA.year.branch as EarthlyBranch)
  const taohuaB = getTaoHua(chartB.year.branch as EarthlyBranch)
  const yimaA = getYiMa(chartA.year.branch as EarthlyBranch)
  const yimaB = getYiMa(chartB.year.branch as EarthlyBranch)
  const shishangElA = WUXING_GENERATE[elA]
  const shishangElB = WUXING_GENERATE[elB]

  const span = Math.max(1, opts.years ?? 10)
  const fromYear = opts.fromYear
  const toYear = fromYear + span - 1
  const { nodes } = getRelationshipTimelineNodes(personA, personB, { fromYear, toYear })

  const years: RelDecisionYear[] = nodes
    .filter((n) => n.type === '流年' && n.year >= fromYear && n.year <= toYear)
    .map((n) => {
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
        reasons.push(`流年${element}当令，正合你们的用神【${ys.element}】，这一年气最顺`)
      } else if (feedsYongshen) {
        score += 1
        reasons.push(`流年${element}生用神【${ys.element}】，为推进蓄势`)
      }
      if (harmony) {
        score += bothHarmony ? 3 : 2
        reasons.push(bothHarmony ? '流年合双方日支，彼此皆顺' : '流年合一方日支，气氛和缓')
      }
      if (clash) {
        score += bothClash ? -3 : -2
        reasons.push(bothClash ? '流年冲双方日支，易两头起波' : '流年冲一方日支，留心摩擦')
      }
      let ziwei = false
      if (opts.ziweiA && opts.ziweiB) {
        const zSig = ziweiRelationYearSignal(opts.ziweiA, opts.ziweiB, n.year)
        if (zSig.significant) {
          ziwei = true
          if (zSig.tone === 'harmony') {
            score += 2
            reasons.push('紫微流年四化亦顺势点亮关系宫，两套系统皆利推进')
          } else if (zSig.tone === 'tension') {
            score -= 2
            reasons.push('紫微流年四化触动关系宫且偏忌，宜缓不宜急')
          } else {
            reasons.push('紫微流年四化亦牵动关系宫，能量升而需善用')
          }
        }
      }

      return {
        year: n.year,
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
        ziwei,
        reasons,
      }
    })

  let best: RelDecisionYear | undefined
  for (const y of years) {
    if (!best || y.score > best.score) best = y
  }

  return {
    yongshen: ys.element,
    yongshenNote: ys.note,
    years,
    best,
    verdict: buildYearVerdict(ys.element, years, best),
  }
}

function buildYearVerdict(
  yongshen: WuXing,
  years: RelDecisionYear[],
  best?: RelDecisionYear
): string {
  if (years.length === 0 || !best) {
    return '未来十年内关系大致平稳，没有特别突出的时机，顺其自然、重在日常经营。'
  }
  let worst = years[0]!
  for (const y of years) if (y.score < worst.score) worst = y

  const head =
    best.score > 0
      ? `这段关系的用神是【${yongshen}】。未来十年里，${best.year}年（${best.ganZhi}）最合用神，气最顺，宜把重大的一步放在这一年前后。`
      : `这段关系的用神是【${yongshen}】。未来十年没有特别旺的年份，宜稳扎稳打，把重心放在日常经营上。`

  const tail =
    worst.score < 0 && worst.year !== best.year
      ? `而${worst.year}年（${worst.ganZhi}）流年冲日支，宜避其锋、缓做重大决定。`
      : ''

  return `${head}${tail}（此为趋势参考，非定论；真正的决定仍在你们手中。）`
}
