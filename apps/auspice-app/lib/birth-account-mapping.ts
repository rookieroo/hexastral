/**
 * Pure Auspice ↔ portfolio birth field mapping (no network / RN).
 */

import type { AuspiceBirthInfo, ShichenIndex } from './birth'

/** Subset of portfolio birth payload used for mapping (avoids RN import in tests). */
export interface PortfolioBirthMapped {
  birthSolarDate: string
  birthTimeIndex: number | null
  gender?: '男' | '女'
  birthCity?: string
  birthLatitude?: string
  birthLongitude?: string
  birthTimezoneId?: string
  birthClockMinutes?: number | null
  birthSolarCalibrate?: boolean | null
  birthCalendarType?: 'solar' | 'lunar'
  birthLunarInput?: string
  birthLunarIsLeap?: boolean
}

export function toPortfolioBirth(info: AuspiceBirthInfo): PortfolioBirthMapped {
  return {
    birthSolarDate: info.solarDate,
    birthTimeIndex: info.timeIndex,
    gender: info.gender,
    birthCity: info.city,
    birthLatitude: info.lat != null ? String(info.lat) : undefined,
    birthLongitude: info.lng != null ? String(info.lng) : undefined,
    birthTimezoneId: info.timezone ?? undefined,
    birthClockMinutes: info.clockMinutes ?? null,
    birthSolarCalibrate: info.calibrate ?? null,
    birthCalendarType: info.calendar === 'lunar' ? 'lunar' : 'solar',
    birthLunarInput: info.lunarInput,
    birthLunarIsLeap: info.lunarIsLeap,
  }
}

export function fromPortfolioBirth(row: PortfolioBirthMapped): AuspiceBirthInfo {
  const lat = row.birthLatitude != null ? Number.parseFloat(row.birthLatitude) : undefined
  const lng = row.birthLongitude != null ? Number.parseFloat(row.birthLongitude) : undefined
  const time =
    typeof row.birthTimeIndex === 'number' && row.birthTimeIndex >= 0 && row.birthTimeIndex <= 11
      ? (row.birthTimeIndex as ShichenIndex)
      : null
  return {
    solarDate: row.birthSolarDate,
    calendar: row.birthCalendarType === 'lunar' ? 'lunar' : 'solar',
    lunarInput: row.birthLunarInput,
    lunarIsLeap: row.birthLunarIsLeap,
    timeIndex: time,
    gender: row.gender === '男' || row.gender === '女' ? row.gender : undefined,
    city: row.birthCity,
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    timezone: row.birthTimezoneId ?? null,
    clockMinutes: row.birthClockMinutes ?? null,
    calibrate: row.birthSolarCalibrate ?? undefined,
  }
}

/** Stable compare for conflict detection. */
export function birthInfosEqual(a: AuspiceBirthInfo, b: AuspiceBirthInfo): boolean {
  return (
    a.solarDate === b.solarDate &&
    (a.timeIndex ?? null) === (b.timeIndex ?? null) &&
    (a.gender ?? null) === (b.gender ?? null) &&
    (a.city ?? '') === (b.city ?? '') &&
    (a.clockMinutes ?? null) === (b.clockMinutes ?? null) &&
    (a.calibrate !== false) === (b.calibrate !== false) &&
    (a.calendar ?? 'solar') === (b.calendar ?? 'solar') &&
    (a.lunarInput ?? '') === (b.lunarInput ?? '') &&
    (a.lunarIsLeap === true) === (b.lunarIsLeap === true)
  )
}
