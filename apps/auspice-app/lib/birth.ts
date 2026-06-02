/**
 * Local birth info for the deterministic "对你而言" overlay (C.3) — and the
 * future server-side 八字/紫微 personalization pass (Sprint 4+).
 *
 * Two storage shapes coexist:
 *   - `cycle.birthDate` — just the YYYY-MM-DD string. Original v1 schema;
 *     kept for back-compat with the /api/cycle/day query param.
 *   - `cycle.birthInfo` — richer object {solarDate, timeIndex, gender, city}.
 *     Added 2026-06 as the user-facing form expanded beyond just-the-date.
 *
 * Both are read/written together so legacy callers (`getCycleBirthDate`) keep
 * working while new callers (`getCycleBirthInfo`) get the full shape.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY_DATE = 'cycle.birthDate'
const KEY_INFO = 'cycle.birthInfo'
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isValidBirthDate(v: string): boolean {
  return DATE_RE.test(v)
}

/** ShichenIndex (0-11) or `null` for unknown. Mirrors core-ui's ShichenPicker encoding. */
export type ShichenIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11

export interface CycleBirthInfo {
  /** ISO YYYY-MM-DD (solar / gregorian). Always present when info is saved. */
  solarDate: string
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
}

interface CycleBirthInfoStored extends CycleBirthInfo {
  v: 1
}

// ── Date-only API (legacy, used by /api/cycle/day query param) ──────────────

export async function getCycleBirthDate(): Promise<string | undefined> {
  try {
    const v = await AsyncStorage.getItem(KEY_DATE)
    return v && DATE_RE.test(v) ? v : undefined
  } catch {
    return undefined
  }
}

export async function setCycleBirthDate(date: string): Promise<void> {
  if (!DATE_RE.test(date)) return
  try {
    await AsyncStorage.setItem(KEY_DATE, date)
  } catch {}
}

export async function clearCycleBirthDate(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([KEY_DATE, KEY_INFO])
  } catch {}
}

// ── Rich birth-info API (single-page form in Me) ────────────────────────────

export async function getCycleBirthInfo(): Promise<CycleBirthInfo | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_INFO)
    if (!raw) {
      // Back-fill from legacy date-only storage.
      const date = await getCycleBirthDate()
      return date ? { solarDate: date, timeIndex: null } : null
    }
    const parsed = JSON.parse(raw) as CycleBirthInfoStored
    if (!parsed || typeof parsed.solarDate !== 'string' || !DATE_RE.test(parsed.solarDate)) {
      return null
    }
    const timeIndex = parsed.timeIndex
    return {
      solarDate: parsed.solarDate,
      timeIndex:
        typeof timeIndex === 'number' && timeIndex >= 0 && timeIndex <= 11
          ? (timeIndex as ShichenIndex)
          : null,
      gender: parsed.gender === '男' || parsed.gender === '女' ? parsed.gender : undefined,
      city: typeof parsed.city === 'string' ? parsed.city : undefined,
      lat: typeof parsed.lat === 'number' ? parsed.lat : undefined,
      lng: typeof parsed.lng === 'number' ? parsed.lng : undefined,
      timezone: typeof parsed.timezone === 'string' ? parsed.timezone : undefined,
    }
  } catch {
    return null
  }
}

export async function setCycleBirthInfo(info: CycleBirthInfo): Promise<void> {
  if (!DATE_RE.test(info.solarDate)) return
  const payload: CycleBirthInfoStored = { v: 1, ...info }
  try {
    await AsyncStorage.multiSet([
      [KEY_INFO, JSON.stringify(payload)],
      [KEY_DATE, info.solarDate],
    ])
  } catch {}
}
