/**
 * Push-dispatch timezone pool — one IANA representative per inhabited UTC offset.
 * svc-notify hourly cron only queries these ids; register paths must canonicalize
 * device Intl zones (Asia/Hong_Kong → Asia/Shanghai) before D1 write.
 */

/** Pool of IANA timezones covering all inhabited UTC offsets (svc-notify cron). */
export const TIMEZONE_POOL = [
  'Pacific/Midway', // UTC-11
  'Pacific/Honolulu', // UTC-10
  'Pacific/Marquesas', // UTC-09:30
  'America/Anchorage', // UTC-09
  'America/Los_Angeles', // UTC-08
  'America/Denver', // UTC-07
  'America/Chicago', // UTC-06
  'America/New_York', // UTC-05
  'America/Halifax', // UTC-04
  'America/St_Johns', // UTC-03:30
  'America/Sao_Paulo', // UTC-03
  'Atlantic/South_Georgia', // UTC-02
  'Atlantic/Azores', // UTC-01
  'Europe/London', // UTC+00
  'Europe/Paris', // UTC+01
  'Europe/Helsinki', // UTC+02
  'Europe/Moscow', // UTC+03
  'Asia/Tehran', // UTC+03:30
  'Asia/Dubai', // UTC+04
  'Asia/Kabul', // UTC+04:30
  'Asia/Karachi', // UTC+05
  'Asia/Kolkata', // UTC+05:30
  'Asia/Kathmandu', // UTC+05:45
  'Asia/Dhaka', // UTC+06
  'Asia/Yangon', // UTC+06:30
  'Asia/Bangkok', // UTC+07
  'Asia/Shanghai', // UTC+08
  'Australia/Eucla', // UTC+08:45
  'Asia/Tokyo', // UTC+09
  'Australia/Adelaide', // UTC+09:30
  'Australia/Sydney', // UTC+10
  'Pacific/Norfolk', // UTC+11
  'Pacific/Auckland', // UTC+12
  'Pacific/Chatham', // UTC+12:45
  'Pacific/Apia', // UTC+13
  'Pacific/Kiritimati', // UTC+14
] as const

export type TimezonePoolId = (typeof TIMEZONE_POOL)[number]

const POOL_SET: ReadonlySet<string> = new Set(TIMEZONE_POOL)

/**
 * Common device IANA ids that share an offset with a pool representative but are
 * not listed in TIMEZONE_POOL (exact-match cron would miss them).
 */
const ALIAS_TO_POOL: Readonly<Record<string, TimezonePoolId>> = {
  // UTC+08
  'Asia/Hong_Kong': 'Asia/Shanghai',
  'Asia/Macau': 'Asia/Shanghai',
  'Asia/Macao': 'Asia/Shanghai',
  'Asia/Singapore': 'Asia/Shanghai',
  'Asia/Taipei': 'Asia/Shanghai',
  'Asia/Manila': 'Asia/Shanghai',
  'Asia/Brunei': 'Asia/Shanghai',
  'Asia/Kuching': 'Asia/Shanghai',
  'Asia/Kuala_Lumpur': 'Asia/Shanghai',
  'Asia/Chongqing': 'Asia/Shanghai',
  'Asia/Harbin': 'Asia/Shanghai',
  'Asia/Urumqi': 'Asia/Shanghai',
  'Australia/Perth': 'Asia/Shanghai',
  // UTC+09
  'Asia/Seoul': 'Asia/Tokyo',
  'Asia/Pyongyang': 'Asia/Tokyo',
  'Asia/Jayapura': 'Asia/Tokyo',
  // UTC+01 (CET)
  'Europe/Berlin': 'Europe/Paris',
  'Europe/Amsterdam': 'Europe/Paris',
  'Europe/Brussels': 'Europe/Paris',
  'Europe/Madrid': 'Europe/Paris',
  'Europe/Rome': 'Europe/Paris',
  'Europe/Vienna': 'Europe/Paris',
  'Europe/Warsaw': 'Europe/Paris',
  'Europe/Prague': 'Europe/Paris',
  'Europe/Zurich': 'Europe/Paris',
  'Europe/Stockholm': 'Europe/Paris',
  'Europe/Oslo': 'Europe/Paris',
  'Europe/Copenhagen': 'Europe/Paris',
  'Europe/Budapest': 'Europe/Paris',
  'Africa/Lagos': 'Europe/Paris',
  // UTC+00
  'UTC': 'Europe/London',
  'Etc/UTC': 'Europe/London',
  'Etc/GMT': 'Europe/London',
  'Europe/Dublin': 'Europe/London',
  'Europe/Lisbon': 'Europe/London',
  'Atlantic/Reykjavik': 'Europe/London',
  'Africa/Abidjan': 'Europe/London',
  // UTC-05 / Eastern
  'America/Toronto': 'America/New_York',
  'America/Montreal': 'America/New_York',
  'America/Detroit': 'America/New_York',
  'America/Indiana/Indianapolis': 'America/New_York',
  // UTC-06 / Central
  'America/Mexico_City': 'America/Chicago',
  'America/Winnipeg': 'America/Chicago',
  // UTC-07 / Mountain
  'America/Phoenix': 'America/Denver',
  'America/Edmonton': 'America/Denver',
  // UTC-08 / Pacific
  'America/Vancouver': 'America/Los_Angeles',
  'America/Tijuana': 'America/Los_Angeles',
  // UTC+10
  'Australia/Melbourne': 'Australia/Sydney',
  'Australia/Brisbane': 'Australia/Sydney',
  'Australia/Hobart': 'Australia/Sydney',
  // UTC+07
  'Asia/Jakarta': 'Asia/Bangkok',
  'Asia/Ho_Chi_Minh': 'Asia/Bangkok',
  'Asia/Saigon': 'Asia/Bangkok',
  'Asia/Phnom_Penh': 'Asia/Bangkok',
  'Asia/Vientiane': 'Asia/Bangkok',
}

/** Offset minutes east of UTC for `tz` at `now` (negative = west). */
export function timezoneOffsetMinutes(tz: string, now: Date = new Date()): number | null {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    })
    const part = dtf.formatToParts(now).find((p) => p.type === 'timeZoneName')?.value
    if (!part) return null
    // "GMT", "GMT+8", "GMT-5", "GMT+05:30"
    if (part === 'GMT' || part === 'UTC') return 0
    const m = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(part)
    if (!m) return null
    const sign = m[1] === '-' ? -1 : 1
    const hours = Number.parseInt(m[2] ?? '0', 10)
    const mins = Number.parseInt(m[3] ?? '0', 10)
    return sign * (hours * 60 + mins)
  } catch {
    return null
  }
}

function poolIdByOffset(offsetMin: number, now: Date): TimezonePoolId | null {
  for (const id of TIMEZONE_POOL) {
    const o = timezoneOffsetMinutes(id, now)
    if (o === offsetMin) return id
  }
  return null
}

/**
 * Map a device IANA timezone to the TIMEZONE_POOL representative used by
 * svc-notify cron + push-targets exact match.
 */
export function canonicalizeTimezoneToPool(iana: string, now: Date = new Date()): string {
  const trimmed = iana.trim()
  if (!trimmed) return 'Europe/London'
  if (POOL_SET.has(trimmed)) return trimmed
  const alias = ALIAS_TO_POOL[trimmed]
  if (alias) return alias
  const offset = timezoneOffsetMinutes(trimmed, now)
  if (offset != null) {
    const byOffset = poolIdByOffset(offset, now)
    if (byOffset) return byOffset
  }
  return 'Europe/London'
}
