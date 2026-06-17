/**
 * Period signals — the deterministic "what 命理 forces are active for THIS person
 * in THIS period (流年 / 大运 / 流月)" engine.
 *
 * It is the shared keystone under two product surfaces:
 *   - Timeline「印证」(retrodiction): pin a real past event onto a period and let
 *     the chart explain it ("你结婚那年正逢桃花当令") — the "怎么这么准" aha.
 *   - 假如人生 (make-if) grounding: weigh a real decision's branches against the
 *     timing of the period they fork from.
 *
 * It adds NO new 五行 math: 用神/忌神/六冲 come verbatim from the already-tested
 * `personalAlmanacOverlay` (the same overlay that powers the daily 对你而言 and the
 * timeline node fit), and 桃花 is a pure table lookup (`getTaoHua`) against the
 * subject's 本命支. Richer 神煞 (驿马/红鸾/将星) are deliberately deferred until each
 * has a verified period-activation rule — getting 命理 wrong costs trust.
 */

import {
  type PersonalAlmanacSubject,
  type PersonalFit,
  type PersonalReasonCode,
  personalAlmanacOverlay,
} from './almanac'
import { getTaoHua, getYiMa } from './shensha'
import type { EarthlyBranch, WuXing } from './types'
import type { ZiweiTone } from './ziwei-timing'

/** A period's stem-element + branch — from a 流年/大运/流月 pillar. */
export interface PeriodInput {
  /** 五行 of the period pillar's 天干. */
  element: WuXing
  /** 地支 of the period pillar. */
  branch: EarthlyBranch
}

export interface PeriodSignals {
  /** Personal verdict for the period (用神/忌神 override the raw relation). */
  fit: PersonalFit
  /** Structured reason codes (app-localized at the edge). */
  reasons: PersonalReasonCode[]
  /** Period 五行 == 用神 (null when 用神 unknown). */
  favorsElement: boolean | null
  /** Period 五行 == 忌神 (null when unknown). */
  harmsElement: boolean | null
  /** Period 地支 六冲 the subject's 本命支 (冲太岁 at 流年 level). */
  clashesBenming: boolean
  /** Period 地支 is the subject's 桃花 — a relationship / romance window. */
  taohua: boolean
  /** Period 地支 is the subject's 驿马 — a movement / travel / relocation window. */
  yima: boolean
}

/**
 * Compute the active signals for `subject` in a given `period`. Pure + deterministic.
 *
 * `subject.birthBranch` (本命支) sharpens both the 六冲 (via the overlay) and the
 * 桃花 check; absent it, `clashesBenming`/`taohua` degrade to false rather than guess.
 */
export function periodSignals(subject: PersonalAlmanacSubject, period: PeriodInput): PeriodSignals {
  const overlay = personalAlmanacOverlay(subject, {
    dayElement: period.element,
    dayBranch: period.branch,
  })
  const taohua = subject.birthBranch != null && period.branch === getTaoHua(subject.birthBranch)
  const yima = subject.birthBranch != null && period.branch === getYiMa(subject.birthBranch)
  return {
    fit: overlay.fit,
    reasons: overlay.reasons,
    favorsElement: overlay.favorsToday,
    harmsElement: overlay.harmsToday,
    clashesBenming: overlay.personalClash,
    taohua,
    yima,
  }
}

// ── Retrodiction match (Timeline 印证) ────────────────────────────────────────

/** Life-event category the user pins onto a past period (mirrors the API's
 *  `EVENT_TYPES`). */
export type LifeEventCategory =
  | 'career'
  | 'relationship'
  | 'health'
  | 'travel'
  | 'education'
  | 'family'
  | 'other'

/** A signal that can corroborate a pinned event — keys into localized phrasing. */
export type SignalKey = 'taohua' | 'yima' | 'favorable' | 'unfavorable' | 'clash'

export interface RetrodictionMatch {
  /** The active signals that plausibly explain the event, strongest-first. */
  matched: SignalKey[]
  hasMatch: boolean
}

/** The boolean signals retrodiction reads — a narrowed view of PeriodSignals so
 *  callers can pass either a full PeriodSignals or a hand-built subset. */
export type RetrodictionSignals = Pick<
  PeriodSignals,
  'taohua' | 'yima' | 'favorsElement' | 'harmsElement' | 'clashesBenming'
>

/** Which signals each category looks to for corroboration (ordered by salience). */
const CATEGORY_SIGNALS: Record<LifeEventCategory, SignalKey[]> = {
  relationship: ['taohua', 'clash', 'favorable', 'unfavorable'],
  career: ['favorable', 'unfavorable', 'clash'],
  health: ['unfavorable', 'clash'],
  travel: ['yima', 'favorable'],
  education: ['favorable', 'unfavorable'],
  family: ['clash', 'favorable', 'unfavorable'],
  other: ['favorable', 'unfavorable', 'clash', 'taohua', 'yima'],
}

/**
 * The deterministic skeleton of Timeline「印证」: which of a period's active
 * signals plausibly corroborate a pinned life-event category. Pure — the edge
 * localizes the matched keys and (later) an LLM dresses a hit. Order preserves
 * the category's salience ranking so the UI can lead with the strongest.
 */
export function retrodictionMatch(
  category: LifeEventCategory,
  signals: RetrodictionSignals
): RetrodictionMatch {
  const active: Record<SignalKey, boolean> = {
    taohua: signals.taohua,
    yima: signals.yima,
    favorable: signals.favorsElement === true,
    unfavorable: signals.harmsElement === true,
    clash: signals.clashesBenming,
  }
  const matched = CATEGORY_SIGNALS[category].filter((k) => active[k])
  return { matched, hasMatch: matched.length > 0 }
}

// ── Favored move (Make-If decision timing) ───────────────────────────────────

/**
 * What KIND of move the current period's timing favors — the deterministic
 * backbone of the make-if decision verdict. For a real decision "now", every
 * option shares the same timing, so the chart can't rank options; it can say
 * what the window favors, and the LLM maps the user's options onto that.
 *
 *   - hold    — 忌神当道 / 冲太岁: a defensive window; steady beats bold.
 *   - move    — 驿马动: relocation / travel / changing environment.
 *   - connect — 桃花: relationship / partnership moves.
 *   - expand  — 用神当令 (and no defensive signal): proactive / outward moves.
 */
export type MoveArchetype = 'hold' | 'move' | 'connect' | 'expand'

export interface FavoredMove {
  primary: MoveArchetype
  /** The signals driving the call (for localized phrasing). */
  reasons: SignalKey[]
}

export function favoredMove(signals: RetrodictionSignals): FavoredMove {
  // Defensive signals win: a clashing / 忌神 window says "hold" regardless of else.
  if (signals.clashesBenming || signals.harmsElement === true) {
    const reasons: SignalKey[] = []
    if (signals.clashesBenming) reasons.push('clash')
    if (signals.harmsElement === true) reasons.push('unfavorable')
    return { primary: 'hold', reasons }
  }
  if (signals.yima) return { primary: 'move', reasons: ['yima'] }
  if (signals.taohua) return { primary: 'connect', reasons: ['taohua'] }
  if (signals.favorsElement === true) return { primary: 'expand', reasons: ['favorable'] }
  // Neutral window — nothing pulling strongly; steady is the safe default.
  return { primary: 'hold', reasons: [] }
}

// ── Window ranking (Make-If MACRO 择时: which window best fits a move) ─────────

/** The actionable moves a user can TIME. `hold` ("don't act now") is a verdict,
 *  never a thing the user schedules, so it is excluded. */
export type TimeableMove = Exclude<MoveArchetype, 'hold'>

/** A candidate window to time a move against (a 流年 / 大运 / 流月 pillar). */
export interface MoveWindow {
  /** Caller's stable key for the window (e.g. a year `'2028'` or `'dayun-3'`). */
  key: string
  period: PeriodInput
  /** 紫微 second-system tone for this window (carried from the timeline's solo fold,
   *  if any). When present it nudges the score — corroboration, never the spine. */
  ziwei?: { tone: ZiweiTone }
}

/** A window scored + explained for an intended move, in the macro 择时 ranking. */
export interface RankedMoveWindow {
  key: string
  fit: PersonalFit
  /** Higher = the window better supports the intended move. */
  score: number
  /** Signals driving the score (edge-localized). */
  reasons: SignalKey[]
  signals: PeriodSignals
  /** 紫微 corroboration carried through from the window (for the marker + the fold). */
  ziwei?: { tone: ZiweiTone }
}

/**
 * Score one window for an intended move. Honest + deterministic: EVERY move
 * gains from 用神 and loses to 忌神 / 冲 (a volatile window is poor for any
 * deliberate step); `connect` / `move` additionally gain from their own 神煞
 * (桃花 / 驿马). `expand` keys purely on 用神, so it carries no special bonus.
 *
 * 紫微 (when the window carries a tone) folds in last as a ±1 corroboration: a
 * harmony year leans the step a touch better, a tension year a touch worse — the
 * 八字 score above stays the spine.
 */
function scoreWindowForMove(
  move: TimeableMove,
  s: PeriodSignals,
  ziwei?: { tone: ZiweiTone }
): { score: number; reasons: SignalKey[] } {
  let score = 0
  const reasons: SignalKey[] = []
  if (move === 'connect' && s.taohua) {
    score += 3
    reasons.push('taohua')
  }
  if (move === 'move' && s.yima) {
    score += 3
    reasons.push('yima')
  }
  if (s.favorsElement === true) {
    score += 2
    reasons.push('favorable')
  }
  if (s.harmsElement === true) {
    score -= 2
    reasons.push('unfavorable')
  }
  if (s.clashesBenming) {
    score -= 2
    reasons.push('clash')
  }
  if (ziwei) {
    if (ziwei.tone === 'harmony') score += 1
    else if (ziwei.tone === 'tension') score -= 1
  }
  return { score, reasons }
}

/**
 * Make-if MACRO 择时: rank candidate windows by how well each supports an
 * intended move — the deterministic core of "this step sits better in 2028 than
 * now". Pure; the edge localizes `reasons` and (later) an LLM writes the
 * synthesis, then a 择日 hand-off picks the day inside the winning window.
 *
 * Sort is higher-score-first with an explicit original-order tiebreak, so the
 * ranking is stable across engines (the timeline's byte-for-byte contract) and
 * ties fall back to chronology when the caller passes windows in time order.
 */
export function rankWindowsForMove(
  subject: PersonalAlmanacSubject,
  move: TimeableMove,
  windows: MoveWindow[]
): RankedMoveWindow[] {
  return windows
    .map((w, i) => {
      const signals = periodSignals(subject, w.period)
      const { score, reasons } = scoreWindowForMove(move, signals, w.ziwei)
      return {
        i,
        ranked: { key: w.key, fit: signals.fit, score, reasons, signals, ziwei: w.ziwei },
      }
    })
    .sort((a, b) => b.ranked.score - a.ranked.score || a.i - b.i)
    .map((x) => x.ranked)
}
