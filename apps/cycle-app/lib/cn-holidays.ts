/**
 * 中国大陆 法定节假日 + 调休 (makeup-workday) calendar — the data behind the
 * "节假日提醒" heads-up (lib/push.ts). This is the State Council's annually
 * announced schedule (NOT algorithmic — 调休 days are politically set), so it
 * MUST be updated each year from the official 国务院 announcement.
 *
 * 2026 source: gov.cn 国务院办公厅 2025-11-04 announcement (verified via
 * china-briefing.com/news/china-2026-public-holiday-schedule).
 *
 * Multi-country (SG / MY / US …) is a follow-up — those have no 调休, just
 * public holidays, so the heads-up there is only the "day off tomorrow" case.
 */

interface CnYear {
  /** Off-work ranges (inclusive), ISO YYYY-MM-DD. */
  holidays: ReadonlyArray<{ name: string; start: string; end: string }>
  /** 调休 makeup workdays — weekends that are working days, ISO YYYY-MM-DD. */
  workdays: ReadonlyArray<string>
}

const CN_HOLIDAYS: Record<number, CnYear> = {
  2026: {
    holidays: [
      { name: '元旦', start: '2026-01-01', end: '2026-01-03' },
      { name: '春节', start: '2026-02-15', end: '2026-02-23' },
      { name: '清明节', start: '2026-04-04', end: '2026-04-06' },
      { name: '劳动节', start: '2026-05-01', end: '2026-05-05' },
      { name: '端午节', start: '2026-06-19', end: '2026-06-21' },
      { name: '中秋节', start: '2026-09-25', end: '2026-09-27' },
      { name: '国庆节', start: '2026-10-01', end: '2026-10-07' },
    ],
    workdays: ['2026-01-04', '2026-02-14', '2026-02-28', '2026-05-09', '2026-09-20', '2026-10-10'],
  },
}

export interface HolidayHeadsUp {
  /** The date the heads-up is ABOUT: the holiday's first day, or the 调休 workday. */
  date: string
  kind: 'holiday' | 'workday'
  /** Holiday name (kind='holiday'); empty for a 调休 workday. */
  name: string
  /** Holiday end date (kind='holiday'). */
  endDate?: string
}

function parseLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

/**
 * Heads-up events whose date falls within [fromIso, fromIso + daysAhead]:
 * each holiday's start (→ "放假" heads-up) and each 调休 workday (→ "上班" heads-up).
 * The caller fires the notification the evening BEFORE each `date`.
 */
export function upcomingHolidayHeadsUps(fromIso: string, daysAhead: number): HolidayHeadsUp[] {
  const from = parseLocal(fromIso)
  const until = new Date(from)
  until.setDate(until.getDate() + daysAhead)

  const inWindow = (iso: string) => {
    const t = parseLocal(iso).getTime()
    return t >= from.getTime() && t <= until.getTime()
  }

  const out: HolidayHeadsUp[] = []
  for (const year of [from.getFullYear(), from.getFullYear() + 1]) {
    const data = CN_HOLIDAYS[year]
    if (!data) continue
    for (const h of data.holidays) {
      if (inWindow(h.start))
        out.push({ date: h.start, kind: 'holiday', name: h.name, endDate: h.end })
    }
    for (const w of data.workdays) {
      if (inWindow(w)) out.push({ date: w, kind: 'workday', name: '' })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

/** True if the CN schedule is loaded for the year covering `iso` (else: heads-up can't run). */
export function hasCnHolidayData(iso: string): boolean {
  return Boolean(CN_HOLIDAYS[parseLocal(iso).getFullYear()])
}
