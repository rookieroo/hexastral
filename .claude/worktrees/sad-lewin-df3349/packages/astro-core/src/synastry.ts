/**
 * Dynamic Synastry — 流日感应
 *
 * 纯数学计算：两人四柱 + 流日干支 → 今日感应评分
 * 无 AI、无网络、无副作用
 */

import { STEM_WUXING } from './constants'
import type { EarthlyBranch, FourPillars, GanZhi, HeavenlyStem, WuXing } from './types'
import { getBranchRelation, getWuXingRelation } from './hehun'

// ── Public types ────────────────────────────────────────────────────────────

export interface SynastryResult {
  /** 0–100: how resonant today's energy is for this bond */
  synergy: number
  /** 0–100: how challenging today's energy is for this bond */
  friction: number
  /**
   * Status label derived from the scores:
   * - 'resonance': synergy > 85
   * - 'tension':   friction > 80
   * - 'neutral':   otherwise
   */
  status: 'resonance' | 'tension' | 'neutral'
  /** YYYY-MM-DD of the day this was computed for */
  date: string
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Score how today's GanZhi interacts with a single person's four pillars.
 * Returns raw (unnormalised) synergy and friction points.
 *
 * Checks:
 *  1. Today's branch vs person's year branch (六合/三合 → synergy, 冲/刑/害 → friction)
 *  2. Today's branch vs person's day  branch (same weights)
 *  3. Today's stem WuXing vs person's day-master WuXing
 */
function scorePersonDay(
  todayGanZhi: GanZhi,
  pillars: FourPillars
): { synergy: number; friction: number } {
  let synergy = 0
  let friction = 0

  // Branch interactions against year and day branches
  const checkBranches: EarthlyBranch[] = [pillars.year.branch, pillars.day.branch]
  for (const branch of checkBranches) {
    const rel = getBranchRelation(todayGanZhi.branch, branch)
    if (rel === '六合' || rel === '三合') synergy += 15
    else if (rel === '冲') friction += 20
    else if (rel === '害') friction += 10
    else if (rel === '刑') friction += 10
    // '比和' and '无关' contribute nothing
  }

  // Day-master WuXing interaction
  const todayWuXing: WuXing = STEM_WUXING[todayGanZhi.stem as HeavenlyStem]
  const dayMasterWuXing: WuXing = STEM_WUXING[pillars.day.stem as HeavenlyStem]
  const wuXingRel = getWuXingRelation(todayWuXing, dayMasterWuXing)
  if (wuXingRel === '相生' || wuXingRel === '被生') synergy += 10
  else if (wuXingRel === '比和') synergy += 5
  else if (wuXingRel === '相克' || wuXingRel === '被克') friction += 12

  return { synergy, friction }
}

// Maximum possible raw points per person (for normalisation):
//   synergy: 15 (year) + 15 (day) + 10 (stem) = 40
//   friction: 20 (year) + 20 (day) + 12 (stem) = 52
const MAX_SYNERGY_PER_PERSON = 40
const MAX_FRICTION_PER_PERSON = 52

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Calculate the daily synastry between two people for a given flow-day GanZhi.
 *
 * @param pillarsA    - Person A's four pillars (computed via getFourPillars)
 * @param pillarsB    - Person B's four pillars
 * @param todayGanZhi - The day-pillar GanZhi for the target date (from dayGanZhi())
 * @param dateStr     - ISO date string "YYYY-MM-DD" for the result label
 */
export function calculateDailySynastry(
  pillarsA: FourPillars,
  pillarsB: FourPillars,
  todayGanZhi: GanZhi,
  dateStr: string
): SynastryResult {
  const scoreA = scorePersonDay(todayGanZhi, pillarsA)
  const scoreB = scorePersonDay(todayGanZhi, pillarsB)

  const rawSynergy = scoreA.synergy + scoreB.synergy
  const rawFriction = scoreA.friction + scoreB.friction

  const maxSynergy = MAX_SYNERGY_PER_PERSON * 2
  const maxFriction = MAX_FRICTION_PER_PERSON * 2

  const synergy = Math.min(100, Math.round((rawSynergy / maxSynergy) * 100))
  const friction = Math.min(100, Math.round((rawFriction / maxFriction) * 100))

  const status: SynastryResult['status'] =
    synergy > 85 ? 'resonance' : friction > 80 ? 'tension' : 'neutral'

  return { synergy, friction, status, date: dateStr }
}
