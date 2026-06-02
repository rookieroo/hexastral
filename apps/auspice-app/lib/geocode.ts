/**
 * Geocode helper — wraps hexastral-api's `/api/geocode/search` (public + anonymous;
 * forwards to svc-geocode: offline city DB + Nominatim fallback). Converts the
 * GeocodedCity[] response to the @zhop/core-ui `CityRecord` shape consumed by
 * <CityPicker>. Mirrors yuan-app / feng-app's geocode.ts; the cycle base URL
 * comes from `resolvePortfolioApiUrl()` (same source as lib/api.ts).
 */

import type { CityRecord } from '@zhop/core-ui'
import { resolvePortfolioApiUrl } from '@zhop/satellite-runtime'

interface GeocodedCity {
  name: string
  displayName: string
  lat: number
  lon: number
  country: string
  countryCode: string
  timezone: string | null
}

function isGeocodedCity(value: unknown): value is GeocodedCity {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.name === 'string' &&
    typeof v.displayName === 'string' &&
    typeof v.lat === 'number' &&
    typeof v.lon === 'number' &&
    typeof v.country === 'string' &&
    typeof v.countryCode === 'string' &&
    (v.timezone === null || typeof v.timezone === 'string')
  )
}

export async function searchCity(query: string, lang = 'zh-CN', limit = 7): Promise<CityRecord[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  try {
    const url = new URL(`${resolvePortfolioApiUrl()}/api/geocode/search`)
    url.searchParams.set('q', trimmed)
    url.searchParams.set('lang', lang)
    url.searchParams.set('limit', String(limit))

    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
    if (!res.ok) return []

    const data = (await res.json()) as unknown
    if (!Array.isArray(data)) return []

    return data.filter(isGeocodedCity).map((g) => ({
      name: g.name,
      country: g.countryCode,
      lat: g.lat,
      lng: g.lon,
      timezone: g.timezone,
      displayName: g.displayName,
    }))
  } catch {
    return []
  }
}
