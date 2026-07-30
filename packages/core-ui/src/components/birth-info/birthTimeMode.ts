/**
 * Birth time entry modes — mutually exclusive.
 *
 * - `shichen`: 十二时辰 only (`timeIndex`). Chart uses the 时辰 midpoint; no
 *   true-solar calibration (city / clock are cleared).
 * - `precise`: exact HH:MM (`clockMinutes`) + birth city for 真太阳时. The
 *   matching 时辰 is derived from the clock for 紫微 / display.
 */

export type BirthTimeMode = 'shichen' | 'precise'

/** Infer mode from stored precise clock — present clock → precise. */
export function birthTimeModeFromClock(clockMinutes: number | null | undefined): BirthTimeMode {
  return clockMinutes != null ? 'precise' : 'shichen'
}

/** Fields cleared when leaving precise mode (explicit nulls for API wipe). */
export interface ClearedPreciseBirthFields {
  clockMinutes: null
  calibrate: null
  city: undefined
  lat: undefined
  lng: undefined
  timezone: undefined
}

export function clearedPreciseBirthFields(): ClearedPreciseBirthFields {
  return {
    clockMinutes: null,
    calibrate: null,
    city: undefined,
    lat: undefined,
    lng: undefined,
    timezone: undefined,
  }
}
