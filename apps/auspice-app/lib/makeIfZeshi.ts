/**
 * make-if 择时 adapter — turn (birth + timeline + a decision) into a ranked set
 * of future windows. The deterministic bridge between the app's TimelinePayload
 * and astro-core's `rankWindowsForMove` (ADR-0023b: make-if as a 择时 decision
 * engine).
 *
 * No new 命理: it builds the SAME 命主 subject the server overlay uses
 * (`analyzeGeJu` 用神/忌神 + 本命支), so the client ranking matches the timeline's
 * own node verdicts. The macro layer answers "this move sits better in WHICH
 * year"; the winning year then hands off to the day-level 择日 (`/event`).
 */

import {
  analyzeGeJu,
  type EarthlyBranch,
  getFourPillars,
  getFourPillarsShiShen,
  type HeavenlyStem,
  type MoveWindow,
  type PersonalAlmanacSubject,
  type PersonalFit,
  periodSignals,
  type RankedMoveWindow,
  rankWindowsForMove,
  STEM_WUXING,
  type TimeableMove,
} from '@zhop/astro-core'
import type { AuspiceEvent, TimelinePayload } from './api'

export interface MakeIfBirth {
  birthDate: string
  birthHour: number
  gender: 'M' | 'F'
}

/**
 * Build the 命主 subject the period overlay needs (用神/忌神/本命支). Mirrors the
 * cherry-pick path's `analyzeGeJu(getFourPillars(...))` so the 用神 is identical.
 */
export function buildMakeIfSubject(birth: MakeIfBirth): PersonalAlmanacSubject {
  const [y, m, d] = birth.birthDate.split('-').map(Number)
  const hour = birth.birthHour < 0 ? 12 : birth.birthHour
  const pillars = getFourPillars({ year: y ?? 2000, month: m ?? 1, day: d ?? 1, hour })
  const geju = analyzeGeJu(pillars, getFourPillarsShiShen(pillars))
  return {
    dayMasterStem: pillars.day.stem,
    favorableElement: geju.favorableElement,
    unfavorableElement: geju.unfavorableElement,
    // 本命支 = 年支 (the codebase's convention for 桃花/驿马 lookups; see makeif.tsx).
    birthBranch: pillars.year.branch,
  }
}

/**
 * The next-few-years comparison set: the 流年 rows from this year forward (the
 * payload carries ±5y, so this is ~6 windows — the actionable 择时 horizon).
 */
export function futureYearWindows(payload: TimelinePayload): MoveWindow[] {
  const currentAge = payload.liunian.find((r) => r.isCurrent)?.age
  if (currentAge == null) return []
  return payload.liunian
    .filter((r) => r.age >= currentAge)
    .map((r) => ({
      key: String(r.year),
      period: {
        element: STEM_WUXING[r.pillar.stem as HeavenlyStem],
        branch: r.pillar.branch as EarthlyBranch,
      },
      // Reuse the 紫微 tone the timeline already folded into this 流年 — no extra
      // fetch; the make-if ranking gets the same second-system corroboration.
      ziwei: r.ziwei,
    }))
}

/**
 * CYCLE_EVENTS subset that are genuine life-decisions worth 择运, mapped to the
 * move archetype each engages. Day-only 黄历 events (burial / medical /
 * groundbreaking) are deliberately NOT offered at this macro layer — they live
 * in the day-level 择日 only.
 */
const EVENT_MOVE: Partial<Record<AuspiceEvent, TimeableMove>> = {
  business: 'expand',
  signing: 'expand',
  study: 'expand',
  wedding: 'connect',
  move: 'move',
  'move-in': 'move',
  travel: 'move',
}

/** The events the make-if macro picker offers (a subset of CYCLE_EVENTS). */
export const MAKEIF_EVENTS = Object.keys(EVENT_MOVE) as AuspiceEvent[]

/** Map a 择日 event to its move archetype; null = no macro 择运 layer for it. */
export function eventToMove(event: AuspiceEvent): TimeableMove | null {
  return EVENT_MOVE[event] ?? null
}

/**
 * Rank the next-few-years windows for a decision (event). Returns [] when the
 * event has no macro mapping (day-only events) or no current 流年 is found.
 * The winning window's year then feeds the existing `/event` day-level 择日.
 */
export function rankMakeIfWindows(
  birth: MakeIfBirth,
  event: AuspiceEvent,
  payload: TimelinePayload
): RankedMoveWindow[] {
  const move = eventToMove(event)
  if (!move) return []
  return rankWindowsForMove(buildMakeIfSubject(birth), move, futureYearWindows(payload))
}

/**
 * The REAL fit at a fork's diverge age — the 大运 the age sits in (always inside
 * the payload's 80-year coverage, so a far-future / past fork still resolves).
 * Replaces `buildUserBranch`'s hash-seeded fork-point verdict with the actual
 * periodSignals read, so the 现实 vs 假如 comparison is no longer fiction.
 */
export function forkDivergeFit(
  birth: MakeIfBirth,
  payload: TimelinePayload,
  divergeAtAge: number
): PersonalFit | undefined {
  const dy = payload.dayun.find((d) => divergeAtAge >= d.startAge && divergeAtAge <= d.endAge)
  if (!dy) return undefined
  return periodSignals(buildMakeIfSubject(birth), {
    element: STEM_WUXING[dy.pillar.stem as HeavenlyStem],
    branch: dy.pillar.branch as EarthlyBranch,
  }).fit
}
