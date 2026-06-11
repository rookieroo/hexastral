/**
 * Local birth info for the deterministic "对你而言" overlay (C.3) — and the
 * future server-side 八字/紫微 personalization pass (Sprint 4+).
 *
 * Two storage shapes coexist:
 *   - `cycle.birthDate` — just the YYYY-MM-DD string. Original v1 schema;
 *     kept for back-compat with the /api/auspice/day query param.
 *   - `cycle.birthInfo` — richer object {solarDate, timeIndex, gender, city}.
 *     Added 2026-06 as the user-facing form expanded beyond just-the-date.
 *
 * Both are read/written together so legacy callers (`getAuspiceBirthDate`) keep
 * working while new callers (`getAuspiceBirthInfo`) get the full shape.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY_DATE = 'auspice.birthDate'
const KEY_INFO = 'auspice.birthInfo'
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isValidBirthDate(v: string): boolean {
  return DATE_RE.test(v)
}

/** ShichenIndex (0-11) or `null` for unknown. Mirrors core-ui's ShichenPicker encoding. */
export type ShichenIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11

export interface AuspiceBirthInfo {
  /** ISO YYYY-MM-DD (solar / gregorian). Always present when info is saved —
   *  this is the canonical form for 八字 calculations. When the user enters
   *  their birthday as 农历, the form converts via `lunarToSolar` before
   *  saving and stashes the original lunar string in `lunarInput`. */
  solarDate: string
  /** Which calendar the user entered the date in. Drives the edit-form
   *  pre-fill — default 'solar' for back-compat (legacy records that
   *  predate the toggle). */
  calendar?: 'solar' | 'lunar'
  /** Original lunar input as YYYY-MM-DD (year + 农历 month + day). Present
   *  ONLY when calendar === 'lunar'; lets the edit form show the user's
   *  original 农历 input instead of re-deriving it (which could differ on
   *  leap-month edge cases). */
  lunarInput?: string
  /** Whether the lunar month the user picked was a leap month (闰月). Only
   *  meaningful when calendar === 'lunar'; needed for an accurate
   *  `lunarToSolar` round-trip (the wheel picker can select 闰X months). */
  lunarIsLeap?: boolean
  /** 0-11 shichen index, `null` when user picked "unknown". */
  timeIndex: ShichenIndex | null
  /** 男 / 女 — required for full 八字 analysis (大运 direction). */
  gender?: '男' | '女'
  /** City name (display); coords + timezone come from the geocode-backed picker. */
  city?: string
  /** Geocoded latitude — for future real-solar-time / longitude correction. */
  lat?: number
  /** Geocoded longitude. */
  lng?: number
  /** IANA timezone of the birth city, e.g. "Asia/Shanghai". */
  timezone?: string | null
  /** Precise birth clock — minutes since midnight 0..1439. Present when the user
   *  opted into the precise-time disclosure (真太阳时 calibration). null / absent
   *  = 时辰-only entry (synced from kindred 2026-06). */
  clockMinutes?: number | null
  /** 真太阳时 calibration toggle for the precise clock; `false` = off, otherwise
   *  on. Only meaningful when `clockMinutes` is set + a city longitude exists. */
  calibrate?: boolean | null
}

interface AuspiceBirthInfoStored extends AuspiceBirthInfo {
  v: 1
}

// ── Date-only API (legacy, used by /api/auspice/day query param) ──────────────

export async function getAuspiceBirthDate(): Promise<string | undefined> {
  try {
    const v = await AsyncStorage.getItem(KEY_DATE)
    return v && DATE_RE.test(v) ? v : undefined
  } catch {
    return undefined
  }
}

export async function setAuspiceBirthDate(date: string): Promise<void> {
  if (!DATE_RE.test(date)) return
  try {
    await AsyncStorage.setItem(KEY_DATE, date)
  } catch {}
}

export async function clearAuspiceBirthDate(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([KEY_DATE, KEY_INFO])
  } catch {}
}

// ── Rich birth-info API (single-page form in Me) ────────────────────────────

export async function getAuspiceBirthInfo(): Promise<AuspiceBirthInfo | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_INFO)
    if (!raw) {
      // Back-fill from legacy date-only storage.
      const date = await getAuspiceBirthDate()
      return date ? { solarDate: date, timeIndex: null } : null
    }
    const parsed = JSON.parse(raw) as AuspiceBirthInfoStored
    if (!parsed || typeof parsed.solarDate !== 'string' || !DATE_RE.test(parsed.solarDate)) {
      return null
    }
    const timeIndex = parsed.timeIndex
    return {
      solarDate: parsed.solarDate,
      calendar: parsed.calendar === 'lunar' ? 'lunar' : 'solar',
      lunarInput:
        parsed.calendar === 'lunar' &&
        typeof parsed.lunarInput === 'string' &&
        DATE_RE.test(parsed.lunarInput)
          ? parsed.lunarInput
          : undefined,
      lunarIsLeap: parsed.calendar === 'lunar' && parsed.lunarIsLeap === true ? true : undefined,
      timeIndex:
        typeof timeIndex === 'number' && timeIndex >= 0 && timeIndex <= 11
          ? (timeIndex as ShichenIndex)
          : null,
      gender: parsed.gender === '男' || parsed.gender === '女' ? parsed.gender : undefined,
      city: typeof parsed.city === 'string' ? parsed.city : undefined,
      lat: typeof parsed.lat === 'number' ? parsed.lat : undefined,
      lng: typeof parsed.lng === 'number' ? parsed.lng : undefined,
      timezone: typeof parsed.timezone === 'string' ? parsed.timezone : undefined,
      clockMinutes:
        typeof parsed.clockMinutes === 'number' &&
        parsed.clockMinutes >= 0 &&
        parsed.clockMinutes <= 1439
          ? parsed.clockMinutes
          : null,
      calibrate: typeof parsed.calibrate === 'boolean' ? parsed.calibrate : undefined,
    }
  } catch {
    return null
  }
}

export async function setAuspiceBirthInfo(info: AuspiceBirthInfo): Promise<void> {
  if (!DATE_RE.test(info.solarDate)) return
  const payload: AuspiceBirthInfoStored = { v: 1, ...info }
  try {
    await AsyncStorage.multiSet([
      [KEY_INFO, JSON.stringify(payload)],
      [KEY_DATE, info.solarDate],
    ])
  } catch {}
}
