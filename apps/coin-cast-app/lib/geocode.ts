import { resolvePortfolioApiUrl } from '@zhop/satellite-runtime'

export interface GeocodedCity {
  name: string
  displayName: string
  lat: number
  lon: number
  country: string
  countryCode: string
  timezone: string | null
}

export async function searchCity(
  query: string,
  lang = 'zh-CN',
  limit = 7
): Promise<GeocodedCity[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const base = resolvePortfolioApiUrl()
  const url = new URL(`${base}/api/geocode/search`)
  url.searchParams.set('q', trimmed)
  url.searchParams.set('lang', lang)
  url.searchParams.set('limit', String(limit))

  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
  if (!res.ok) return []
  const data = (await res.json()) as unknown
  if (!Array.isArray(data)) return []
  return data.filter(
    (row): row is GeocodedCity =>
      typeof row === 'object' &&
      row !== null &&
      typeof (row as GeocodedCity).name === 'string' &&
      typeof (row as GeocodedCity).lat === 'number'
  )
}
