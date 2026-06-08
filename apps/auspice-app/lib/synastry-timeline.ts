/**
 * 合盘 (synastry) timeline — on-device (ADR: synastry-in-auspice-plan §3).
 *
 * Both charts are the user's own device-local data (self birth + a 亲友 they
 * entered), so unlike Kindred's bonds-timeline (which must merge server-side to
 * keep partner B's PII off A's device), Auspice computes the relationship
 * timeline ENTIRELY on-device. Pure wrapper over astro-core
 * `getRelationshipTimelineNodes` + lunar→solar normalization (so it also works
 * for 农历 亲友 — the bug where the synastry taste vanished on calendar switch).
 */

import {
  type DateTimeInput,
  getRelationshipTimelineNodes,
  getRelationshipTimelineNotifications,
  lunarToSolar,
  type RelationshipPerson,
  type RelationshipTimelineNode,
  type RelTimelineNotification,
} from '@zhop/astro-core'
import type { PersonCalendar } from './people'

/** Minimal birth shape both `self` and a 亲友 satisfy. */
export interface SynastryBirth {
  /** YYYY-MM-DD — Gregorian when calendar==='solar', else interpreted as 农历. */
  solarDate: string
  /** 0-11 时辰 index, or null when unknown. */
  timeIndex?: number | null
  gender?: '男' | '女' | null
  calendar?: PersonCalendar
}

/**
 * Resolve a (possibly 农历) birth into a solar DateTimeInput, or null. Exported so
 * the screen can also build FourPillars for the synastry score with the SAME lunar
 * handling (the calendar-switch bug came from solar-only paths).
 */
export function resolveSolarInput(b: SynastryBirth | null | undefined): DateTimeInput | null {
  if (!b?.solarDate) return null
  let [y, m, d] = b.solarDate.split('-').map(Number)
  if (!y || !m || !d) return null
  if (b.calendar === 'lunar') {
    // No leap-month flag is stored on a 亲友; treat as the regular month (matches
    // lib/push.ts birthday conversion). Round-trips via astro-core's 1900-2100 table.
    try {
      const solar = lunarToSolar(y, m, d, false)
      y = solar.getFullYear()
      m = solar.getMonth() + 1
      d = solar.getDate()
    } catch {
      return null
    }
  }
  const hour = b.timeIndex != null && b.timeIndex >= 0 ? b.timeIndex * 2 : 12
  return { year: y, month: m, day: d, hour }
}

/** Resolve a birth into an astro-core RelationshipPerson, or null. */
function toRelPerson(b: SynastryBirth | null | undefined): RelationshipPerson | null {
  const input = resolveSolarInput(b)
  if (!input || !b?.gender) return null
  return { input, gender: b.gender }
}

export interface SynastryTimeline {
  nodes: RelationshipTimelineNode[]
  /** Future significant nodes as local-notification hints (Pro / one-time unlock). */
  notifications: RelTimelineNotification[]
}

/**
 * Build the relationship timeline between the user (A) and a 亲友 (B). Returns
 * empty when either chart is incomplete. Deterministic + on-device.
 */
export function buildSynastryTimeline(
  self: SynastryBirth | null | undefined,
  person: SynastryBirth | null | undefined,
  opts: { fromYear?: number; toYear?: number; now?: Date } = {}
): SynastryTimeline {
  const a = toRelPerson(self)
  const b = toRelPerson(person)
  if (!a || !b) return { nodes: [], notifications: [] }
  const { nodes } = getRelationshipTimelineNodes(a, b, {
    fromYear: opts.fromYear,
    toYear: opts.toYear,
  })
  const notifications = getRelationshipTimelineNotifications(a, b, {
    fromDate: opts.now,
  })
  return { nodes, notifications }
}
