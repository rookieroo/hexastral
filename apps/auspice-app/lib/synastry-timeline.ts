/**
 * Solar-input resolution for a (possibly 农历) birth.
 *
 * The on-device synastry/relationship-timeline ENGINE that used to live here was
 * removed when the relationship×time view moved to the Yuel app. The one piece
 * Auspice still needs is `resolveSolarInput` — `lib/luckyGuide.ts` uses it to
 * build the 用神/吉时 chart with the SAME 农历→solar handling (the calendar-switch
 * bug came from solar-only paths).
 */

import { type DateTimeInput, lunarToSolar } from '@zhop/astro-core'
import type { PersonCalendar } from './people'

/** Minimal birth shape `resolveSolarInput` accepts. */
export interface SynastryBirth {
  /** YYYY-MM-DD — Gregorian when calendar==='solar', else interpreted as 农历. */
  solarDate: string
  /** 0-11 时辰 index, or null when unknown. */
  timeIndex?: number | null
  gender?: '男' | '女' | null
  calendar?: PersonCalendar
}

/**
 * Resolve a (possibly 农历) birth into a solar DateTimeInput, or null.
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
