/**
 * 亲友 — saved birthdays for family / friends. Captures enough to drive the Pro
 * 合盘 (八字 / 紫微) reading later: date (solar OR 农历), 时辰, gender. Also drives
 * the birthday reminders (lib/push.ts) and the 关系 reading (lib/relationship.ts).
 * Separate from the user's OWN birth (lib/birth.ts).
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'auspice.people'
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export type PersonGender = '男' | '女'
/** Whether `solarDate` is a Gregorian (solar) date or a 农历 year-month-day. */
export type PersonCalendar = 'solar' | 'lunar'

export interface AuspicePerson {
  id: string
  name: string
  /** YYYY-MM-DD. Gregorian when `calendar==='solar'`, else interpreted as 农历. */
  solarDate: string
  /** Optional relation label, e.g. 妈妈 / 朋友. */
  relation?: string
  /** Solar (default, back-compat) or 农历. */
  calendar?: PersonCalendar
  /** 0-11 时辰 index (子..亥), or null when unknown. Feeds 八字 时柱. */
  timeIndex?: number | null
  /** For 合盘 / 八字. */
  gender?: PersonGender
  /** Birthplace (optional) — for 真太阳时 correction in the Kindred 合盘 reading. */
  city?: string
  lat?: number
  lng?: number
  timezone?: string | null
  /** Days before the birthday to remind (default 1; 0 = no advance reminder). */
  advanceDays?: number
  /** Also remind on the day itself (default true). */
  remindOnDay?: boolean
}

function isPerson(v: unknown): v is AuspicePerson {
  if (typeof v !== 'object' || v === null) return false
  const p = v as Record<string, unknown>
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.solarDate === 'string' &&
    DATE_RE.test(p.solarDate)
  )
}

export async function getPeople(): Promise<AuspicePerson[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter(isPerson) : []
  } catch {
    return []
  }
}

async function savePeople(people: AuspicePerson[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(people))
  } catch {}
}

export function isValidBirthday(v: string): boolean {
  return DATE_RE.test(v)
}

export interface AddPersonInput {
  name: string
  solarDate: string
  relation?: string
  calendar?: PersonCalendar
  timeIndex?: number | null
  gender?: PersonGender
  city?: string
  lat?: number
  lng?: number
  timezone?: string | null
  advanceDays?: number
  remindOnDay?: boolean
}

export async function addPerson(input: AddPersonInput): Promise<AuspicePerson[]> {
  if (!DATE_RE.test(input.solarDate)) return getPeople()
  const people = await getPeople()
  // App-runtime id (not a workflow script — Date.now/random are fine here).
  const id = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`
  const next: AuspicePerson[] = [
    ...people,
    {
      id,
      name: input.name.trim() || '亲友',
      solarDate: input.solarDate,
      relation: input.relation?.trim() || undefined,
      calendar: input.calendar ?? 'solar',
      timeIndex: input.timeIndex ?? null,
      gender: input.gender,
      city: input.city,
      lat: input.lat,
      lng: input.lng,
      timezone: input.timezone,
      advanceDays: input.advanceDays ?? 1,
      remindOnDay: input.remindOnDay ?? true,
    },
  ]
  await savePeople(next)
  return next
}

export async function removePerson(id: string): Promise<AuspicePerson[]> {
  const people = (await getPeople()).filter((p) => p.id !== id)
  await savePeople(people)
  return people
}
