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
  /** Geographic coordinates — drive the globe picker's dots + tap-snapping. */
  lat: number
  lng: number
}

/**
 * Quick-pick cities. Intentionally NOT sorted CJK-first (2026-06 feedback) —
 * the ordering interleaves regions so it reads as a world list, not a
 * China-then-rest list. The globe picker is the primary affordance; these are
 * the fast path for the common diaspora cases.
 */
export const REMOTE_TZ_CITY_PRESETS: ReadonlyArray<RemoteTzCityPreset> = [
  { id: 'la', label: 'Los Angeles', offsetHours: -8, lat: 34.05, lng: -118.24 },
  { id: 'beijing', label: '北京', offsetHours: 8, lat: 39.9, lng: 116.41 },
  { id: 'london', label: 'London', offsetHours: 0, lat: 51.51, lng: -0.13 },
  { id: 'tokyo', label: '東京', offsetHours: 9, lat: 35.68, lng: 139.69 },
  { id: 'nyc', label: 'New York', offsetHours: -5, lat: 40.71, lng: -74.01 },
  { id: 'singapore', label: '新加坡', offsetHours: 8, lat: 1.35, lng: 103.82 },
  { id: 'paris', label: 'Paris', offsetHours: 1, lat: 48.86, lng: 2.35 },
  { id: 'hongkong', label: '香港', offsetHours: 8, lat: 22.32, lng: 114.17 },
  { id: 'sydney', label: 'Sydney', offsetHours: 10, lat: -33.87, lng: 151.21 },
  { id: 'shanghai', label: '上海', offsetHours: 8, lat: 31.23, lng: 121.47 },
  { id: 'sf', label: 'San Francisco', offsetHours: -8, lat: 37.77, lng: -122.42 },
  { id: 'taipei', label: '台北', offsetHours: 8, lat: 25.03, lng: 121.57 },
  { id: 'dubai', label: 'Dubai', offsetHours: 4, lat: 25.2, lng: 55.27 },
  { id: 'seoul', label: '首爾', offsetHours: 9, lat: 37.57, lng: 126.98 },
  { id: 'berlin', label: 'Berlin', offsetHours: 1, lat: 52.52, lng: 13.4 },
]

/** A city dot on the globe picker. */
export interface GlobeCity {
  label: string
  lat: number
  lng: number
  offsetHours: number
}

/**
 * Dots scattered on the globe — the quick-pick cities plus enough extra anchors
 * for every continent to read as populated (GitHub-globe style). Also the
 * snap targets when the user taps near a city.
 */
export const GLOBE_CITIES: ReadonlyArray<GlobeCity> = [
  ...REMOTE_TZ_CITY_PRESETS.map((c) => ({
    label: c.label,
    lat: c.lat,
    lng: c.lng,
    offsetHours: c.offsetHours,
  })),
  { label: 'Vancouver', lat: 49.28, lng: -123.12, offsetHours: -8 },
  { label: 'Chicago', lat: 41.88, lng: -87.63, offsetHours: -6 },
  { label: 'Mexico City', lat: 19.43, lng: -99.13, offsetHours: -6 },
  { label: 'Bogotá', lat: 4.71, lng: -74.07, offsetHours: -5 },
  { label: 'São Paulo', lat: -23.55, lng: -46.63, offsetHours: -3 },
  { label: 'Buenos Aires', lat: -34.6, lng: -58.38, offsetHours: -3 },
  { label: 'Honolulu', lat: 21.31, lng: -157.86, offsetHours: -10 },
  { label: 'Anchorage', lat: 61.22, lng: -149.9, offsetHours: -9 },
  { label: 'Reykjavík', lat: 64.15, lng: -21.94, offsetHours: 0 },
  { label: 'Lagos', lat: 6.52, lng: 3.38, offsetHours: 1 },
  { label: 'Cairo', lat: 30.04, lng: 31.24, offsetHours: 2 },
  { label: 'Johannesburg', lat: -26.2, lng: 28.05, offsetHours: 2 },
  { label: 'Nairobi', lat: -1.29, lng: 36.82, offsetHours: 3 },
  { label: 'Moscow', lat: 55.76, lng: 37.62, offsetHours: 3 },
  { label: 'Istanbul', lat: 41.01, lng: 28.98, offsetHours: 3 },
  { label: 'Mumbai', lat: 19.08, lng: 72.88, offsetHours: 5.5 },
  { label: 'Delhi', lat: 28.61, lng: 77.21, offsetHours: 5.5 },
  { label: 'Bangkok', lat: 13.76, lng: 100.5, offsetHours: 7 },
  { label: 'Jakarta', lat: -6.21, lng: 106.85, offsetHours: 7 },
  { label: 'Perth', lat: -31.95, lng: 115.86, offsetHours: 8 },
  { label: 'Auckland', lat: -36.85, lng: 174.76, offsetHours: 12 },
]

/** Earth-rotation timezone estimate from a longitude (no political TZ borders /
 *  DST — consistent with this module's offset-only model). */
export function offsetFromLongitude(lng: number): number {
  return Math.max(-12, Math.min(14, Math.round(lng / 15)))
}

/**
 * Nearest globe city to a tapped lat/lng, within ~7° (equirectangular approx,
 * longitude weighted by latitude). Lets a tap "snap" to a named city + its real
 * offset (which may be a half-hour zone) instead of a bare UTC±N.
 */
export function nearestGlobeCity(lat: number, lng: number): GlobeCity | null {
  let best: GlobeCity | null = null
  let bestD = Number.POSITIVE_INFINITY
  const cosLat = Math.cos((lat * Math.PI) / 180)
  for (const c of GLOBE_CITIES) {
    const dLat = c.lat - lat
    let dLng = c.lng - lng
    if (dLng > 180) dLng -= 360
    if (dLng < -180) dLng += 360
    const d = Math.hypot(dLat, dLng * cosLat)
    if (d < bestD) {
      bestD = d
      best = c
    }
  }
  return bestD <= 7 ? best : null
}
