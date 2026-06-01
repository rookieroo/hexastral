/**
 * Offline city search — pure in-memory, zero external dependencies.
 *
 * Search strategy:
 *   1. Exact match on name → score 100
 *   2. Prefix match → score 80
 *   3. Substring match → score 60
 *   4. Alias match (same tiers, slightly lower) → 95/75/55
 *   5. Ties broken by population (descending)
 *
 * CJK queries match against nameCn; Latin queries match against
 * nameEn (lowered), pinyin, and aliases.
 */

import { CITIES, type CityRecord } from './data/cities'

export interface GeocodedCity {
  name: string
  displayName: string
  lat: number
  lon: number
  country: string
  countryCode: string
  /** IANA timezone — null only when Nominatim fallback lacks extratags */
  timezone: string | null
}

/** Returns true if query contains CJK (Chinese, Japanese, Korean) characters */
const CJK_REGEX = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/

/** Score a city against a normalized query. Returns 0 if no match. */
function scoreCity(city: CityRecord, q: string, isCJK: boolean): number {
  if (isCJK) {
    // CJK: match against Chinese name
    if (city.nameCn === q) return 100
    if (city.nameCn.startsWith(q)) return 80
    if (city.nameCn.includes(q)) return 60
    return 0
  }

  // Latin: match against English name (lowered) and pinyin
  const nameEn = city.nameEn.toLowerCase()
  const { pinyin } = city

  if (nameEn === q || pinyin === q) return 100
  if (nameEn.startsWith(q) || pinyin.startsWith(q)) return 80
  if (nameEn.includes(q) || pinyin.includes(q)) return 60

  // Check aliases
  if (city.aliases) {
    for (const alias of city.aliases) {
      if (alias === q) return 95
      if (alias.startsWith(q)) return 75
      if (alias.includes(q)) return 55
    }
  }

  return 0
}

/** Convert a CityRecord to the public GeocodedCity shape */
function toGeocodedCity(city: CityRecord, isZh: boolean): GeocodedCity {
  return {
    name: isZh ? city.nameCn : city.nameEn,
    displayName: isZh ? city.displayCn : city.displayEn,
    lat: city.lat,
    lon: city.lon,
    country: isZh ? city.countryCn : city.countryEn,
    countryCode: city.countryCode,
    timezone: city.timezone,
  }
}

/**
 * Search the offline city database.
 *
 * @param query  User's search input (e.g. "上海" or "shang")
 * @param lang   BCP 47 language tag (e.g. "zh-CN", "en-US")
 * @param limit  Max results (1–10)
 */
export function searchCities(query: string, lang: string, limit: number): GeocodedCity[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const isCJK = CJK_REGEX.test(q)
  const isZh = lang.startsWith('zh')

  const scored: { city: CityRecord; score: number }[] = []

  for (const city of CITIES) {
    const score = scoreCity(city, q, isCJK)
    if (score > 0) {
      scored.push({ city, score })
    }
  }

  // Sort: higher score first, then by population descending
  scored.sort((a, b) => b.score - a.score || b.city.population - a.city.population)

  return scored.slice(0, limit).map(({ city }) => toGeocodedCity(city, isZh))
}
