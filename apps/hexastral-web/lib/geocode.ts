export interface GeocodedCity {
  name: string
  displayName: string
  lat: number
  lon: number
  country: string
  countryCode: string
  timezone: string | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.hexastral.com'

function isGeocodedCity(v: unknown): v is GeocodedCity {
  if (!v || typeof v !== 'object') return false
  const obj = v as Record<string, unknown>
  return typeof obj.name === 'string' && typeof obj.lat === 'number' && typeof obj.lon === 'number'
}

export async function searchCities(query: string, lang = 'en', limit = 7): Promise<GeocodedCity[]> {
  if (!query || query.trim().length < 2) return []

  try {
    const url = new URL(`${API_URL}/api/geocode/search`)
    url.searchParams.set('q', query.trim())
    url.searchParams.set('lang', lang)
    url.searchParams.set('limit', String(limit))

    const res = await fetch(url.toString())
    if (!res.ok) return []

    const data = (await res.json()) as unknown[]
    return data.filter(isGeocodedCity)
  } catch {
    return []
  }
}
