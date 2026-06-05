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
import { getTaoHua } from './shensha'
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
  return {
    fit: overlay.fit,
    reasons: overlay.reasons,
    favorsElement: overlay.favorsToday,
    harmsElement: overlay.harmsToday,
    clashesBenming: overlay.personalClash,
    taohua,
  }
}
