/**
 * lib/geocode.ts — 出生城市地理编码客户端
 *
 * 通过 hexastral-api 代理调用 svc-geocode（svc-geocode 无公网域名）。
 * 路由：GET api.hexastral.com/api/geocode/search?q=上海&lang=zh-CN&limit=5
 *
 * 使用方式：
 *   const cities = await searchCity('上海', 'zh-CN')
 *   // [{ name: '上海', displayName: '上海市, 中国', lat: 31.2, lon: 121.46, ... }]
 *
 * 搜索结果包含 IANA 时区（如 'Asia/Shanghai'），可用于真太阳时修正。
 */

import { config } from '../config'

export interface GeocodedCity {
  /** 城市简称（本地化名称） */
  name: string
  /** 完整显示名称（地区/省份/国家） */
  displayName: string
  /** 纬度 */
  lat: number
  /** 经度 */
  lon: number
  /** 国家名 */
  country: string
  /** ISO 国家代码（如 CN, US） */
  countryCode: string
  /** IANA 时区（如 Asia/Shanghai）— 用于真太阳时修正，null 表示未知 */
  timezone: string | null
}

/**
 * 搜索城市，返回最多 `limit` 个候选结果
 *
 * @param query  — 城市名称关键词（中英文均可）
 * @param lang   — 结果语言，如 'zh-CN' / 'en' / 'ja'
 * @param limit  — 最大结果数（默认 5）
 */
export async function searchCity(
  query: string,
  lang = 'zh-CN',
  limit = 5
): Promise<GeocodedCity[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  try {
    const url = new URL(`${config.apiUrl}/api/geocode/search`)
    url.searchParams.set('q', trimmed)
    url.searchParams.set('lang', lang)
    url.searchParams.set('limit', String(limit))

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) return []

    const data = (await res.json()) as unknown
    if (!Array.isArray(data)) return []

    // Runtime shape validation — API contract may evolve
    return data.filter(isGeocodedCity)
  } catch {
    return []
  }
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
