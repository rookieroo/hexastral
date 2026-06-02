/**
 * Dual-timezone — Tier-1 audit #9. A user (e.g. overseas Chinese) saves a
 * "remote" UTC offset (typically Beijing UTC+8 for family in China); Today
 * shows a small banner whenever the remote calendar day differs from the
 * device's local calendar day.
 *
 * Storage shape kept compact + future-proof: `{ offsetHours, label }`. Offset
 * is signed hours (e.g. +8, -5). Label is a short user-typed string (city
 * name); we don't parse IANA TZ identifiers to avoid the DST-edge surprises
 * that come with `Intl.DateTimeFormat({ timeZone })` on older RN engines.
 * The cost of that simplification is a one-hour drift twice a year for DST
 * regions — acceptable for Sprint 2 v1 (user can flip the saved offset).
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'auspice.remoteTz'

export interface RemoteTz {
  /** Signed hours east of UTC. e.g. +8 for Beijing, -5 for NYC EST, -7 for LA PDT. */
  offsetHours: number
  /** Short user-typed display label, e.g. "Beijing", "Tokyo". Empty string is valid. */
  label: string
}

interface RemoteTzStored extends RemoteTz {
  v: 1
}

export async function getRemoteTz(): Promise<RemoteTz | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as RemoteTzStored
    if (
      typeof parsed?.offsetHours !== 'number' ||
      !Number.isFinite(parsed.offsetHours) ||
      Math.abs(parsed.offsetHours) > 14
    ) {
      return null
    }
    return { offsetHours: parsed.offsetHours, label: parsed.label ?? '' }
  } catch {
    return null
  }
}

export async function setRemoteTz(tz: RemoteTz | null): Promise<void> {
  try {
    if (tz === null) {
      await AsyncStorage.removeItem(STORAGE_KEY)
      return
    }
    const payload: RemoteTzStored = { v: 1, offsetHours: tz.offsetHours, label: tz.label }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Storage failure is non-fatal — feature degrades to "off".
  }
}

/**
 * Compute the wall-clock `Date` at the remote offset for the given local instant.
 * Returns a new `Date` whose UTC fields encode the remote calendar values
 * (year/month/day/hour/minute) — read via `.getUTC*()` rather than `.get*()`.
 */
export function remoteWallClock(localNow: Date, offsetHours: number): Date {
  const localOffsetMin = -localNow.getTimezoneOffset() // minutes east of UTC
  const remoteOffsetMin = Math.round(offsetHours * 60)
  const diffMin = remoteOffsetMin - localOffsetMin
  return new Date(localNow.getTime() + diffMin * 60_000)
}

/** Returns true when the remote wall-clock's calendar day differs from local. */
export function remoteDayDiffers(localNow: Date, offsetHours: number): boolean {
  const remote = remoteWallClock(localNow, offsetHours)
  return (
    remote.getUTCFullYear() !== localNow.getFullYear() ||
    remote.getUTCMonth() !== localNow.getMonth() ||
    remote.getUTCDate() !== localNow.getDate()
  )
}

/** YYYY-MM-DD for the remote calendar day. */
export function remoteDateIso(localNow: Date, offsetHours: number): string {
  const r = remoteWallClock(localNow, offsetHours)
  const m = String(r.getUTCMonth() + 1).padStart(2, '0')
  const d = String(r.getUTCDate()).padStart(2, '0')
  return `${r.getUTCFullYear()}-${m}-${d}`
}

/** Display the offset as "UTC±N" (no decimals — we round during set). */
export function formatOffsetLabel(offsetHours: number): string {
  const sign = offsetHours >= 0 ? '+' : '−'
  const abs = Math.abs(offsetHours)
  // half-hour zones (e.g. India +5.5, Nepal +5.75) — render as "+5.5" rather than rounded.
  const num = Number.isInteger(abs) ? String(abs) : abs.toFixed(2).replace(/\.?0+$/, '')
  return `UTC${sign}${num}`
}

// ── Preset cities (Sprint 3 chunk 8) ────────────────────────────────────────

export interface RemoteTzCityPreset {
  id: string
  /** Display name — kept CJK for major Asian cities so 华人 users recognize. */
  label: string
  /** Standard-time UTC offset in hours. DST is intentionally not tracked
   *  here (Sprint 3 simplification); users in DST regions can pick a near
   *  preset or accept the ±1h drift twice a year. */
  offsetHours: number
}

/**
 * Curated cities the user can pick as their "remote" reference TZ — covers
 * the overseas-Chinese diaspora's most common family-back-home cases plus
 * the major Asian + western timezones. The free-text TextInput fallback
 * still exists for less common locations.
 */
export const REMOTE_TZ_CITY_PRESETS: ReadonlyArray<RemoteTzCityPreset> = [
  { id: 'beijing', label: '北京', offsetHours: 8 },
  { id: 'shanghai', label: '上海', offsetHours: 8 },
  { id: 'hongkong', label: '香港', offsetHours: 8 },
  { id: 'taipei', label: '台北', offsetHours: 8 },
  { id: 'singapore', label: '新加坡', offsetHours: 8 },
  { id: 'tokyo', label: '東京', offsetHours: 9 },
  { id: 'seoul', label: '首爾', offsetHours: 9 },
  { id: 'sydney', label: 'Sydney', offsetHours: 10 },
  { id: 'dubai', label: 'Dubai', offsetHours: 4 },
  { id: 'london', label: 'London', offsetHours: 0 },
  { id: 'paris', label: 'Paris', offsetHours: 1 },
  { id: 'berlin', label: 'Berlin', offsetHours: 1 },
  { id: 'nyc', label: 'New York', offsetHours: -5 },
  { id: 'la', label: 'Los Angeles', offsetHours: -8 },
  { id: 'sf', label: 'San Francisco', offsetHours: -8 },
]
