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
