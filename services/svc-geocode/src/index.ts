/**
 * svc-geocode — 地理编码服务（离线优先 + Nominatim 兜底）
 *
 * 两级查找：
 *   1. 内存静态库（~350 热门城市，模糊评分搜索，零延迟）
 *   2. Nominatim OSM API 兜底（偏僻城市，结果写入 KV 缓存 24h）
 *
 *   GET /search?q=上海&lang=zh-CN&limit=5
 *   → [{ name, displayName, lat, lon, country, countryCode, timezone }]
 *
 * 静态库覆盖中国全部省会 + 主要城市、港澳台、日韩、东南亚、
 * 欧美、中东、非洲、拉美。支持中文、英文、拼音、别名搜索。
 * Nominatim 仅在静态库无结果时触发，KV 缓存避免重复查询。
 *
 * 部署：
 *   wrangler deploy
 *   wrangler kv namespace create GEOCODE_CACHE
 *   # 填入 wrangler.jsonc 中的 KV ID
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { type GeocodedCity, searchCities } from './search'

// ── Nominatim types ───────────────────────────────────────────────

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
  name: string
  address: {
    city?: string
    town?: string
    municipality?: string
    country?: string
    country_code?: string
  }
  extratags?: {
    timezone?: string
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function buildCacheKey(q: string, lang: string, limit: number): string {
  const normalized = q.trim().toLowerCase()
  return `geocode:v1:${lang}:${limit}:${normalized}`
}

function extractCityName(result: NominatimResult): string {
  const addr = result.address
  return addr.city ?? addr.town ?? addr.municipality ?? result.name ?? 'Unknown'
}

function mapNominatimResults(results: NominatimResult[]): GeocodedCity[] {
  return results.map((r) => ({
    name: extractCityName(r),
    displayName: r.display_name,
    lat: Number.parseFloat(r.lat),
    lon: Number.parseFloat(r.lon),
    country: r.address.country ?? '',
    countryCode: (r.address.country_code ?? '').toUpperCase(),
    timezone: r.extratags?.timezone ?? null,
  }))
}

// ── Worker ────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env }>()

// CORS — allow calls from hexastral-web and hexastral-app (via API gateway)
app.use('*', async (c, next) => {
  await next()
  c.header('Access-Control-Allow-Origin', '*')
  c.header('Access-Control-Allow-Methods', 'GET, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type')
})

app.options('*', (c) => c.body(null, 204))

/**
 * GET /search
 *
 * Query params:
 *   q      — city name (required), e.g. "上海" or "Shanghai"
 *   lang   — Accept-Language for localized results (default: zh-CN)
 *   limit  — max results 1–10 (default: 5)
 */
app.get('/search', async (c) => {
  const q = c.req.query('q')?.trim()
  if (!q || q.length < 1) {
    throw new HTTPException(400, { message: 'Missing query param "q"' })
  }

  const lang = c.req.query('lang') ?? 'zh-CN'
  const rawLimit = Number(c.req.query('limit') ?? '5')
  const limit = Math.min(Math.max(rawLimit, 1), 10)

  // ── 1. Static in-memory search (zero latency) ─────────────────
  const staticHits = searchCities(q, lang, limit)
  if (staticHits.length > 0) {
    return c.json(staticHits, 200, { 'X-Cache': 'STATIC' })
  }

  // ── 2. Check KV cache (previously fetched long-tail cities) ───
  const cacheKey = buildCacheKey(q, lang, limit)
  const cached = (await c.env.GEOCODE_CACHE.get(cacheKey, 'json')) as GeocodedCity[] | null
  if (cached) {
    return c.json(cached, 200, { 'X-Cache': 'HIT' })
  }

  // ── 3. Nominatim fallback (obscure / long-tail cities) ────────
  const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search')
  nominatimUrl.searchParams.set('q', q)
  nominatimUrl.searchParams.set('format', 'jsonv2')
  nominatimUrl.searchParams.set('addressdetails', '1')
  nominatimUrl.searchParams.set('extratags', '1')
  nominatimUrl.searchParams.set('featuretype', 'city')
  nominatimUrl.searchParams.set('limit', String(limit))
  nominatimUrl.searchParams.set('accept-language', lang)

  const nominatimRes = await fetch(nominatimUrl.toString(), {
    headers: {
      'User-Agent': `Hexastral/1.0 (${c.env.NOMINATIM_EMAIL})`,
      'Accept-Language': lang,
    },
    // @ts-expect-error — Cloudflare Workers cf property not in standard RequestInit
    cf: { cacheTtl: 86400, cacheEverything: true },
  })

  if (!nominatimRes.ok) {
    throw new HTTPException(502, {
      message: `Nominatim returned ${nominatimRes.status}`,
    })
  }

  const raw = (await nominatimRes.json()) as NominatimResult[]
  const cities = mapNominatimResults(raw)

  // ── 4. Write KV cache (24h TTL) ───────────────────────────────
  if (cities.length > 0) {
    c.executionCtx.waitUntil(
      c.env.GEOCODE_CACHE.put(cacheKey, JSON.stringify(cities), {
        expirationTtl: 60 * 60 * 24,
      })
    )
  }

  return c.json(cities, 200, { 'X-Cache': 'MISS' })
})

app.get('/health', (c) => c.json({ status: 'ok', service: 'svc-geocode' }))

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }
  console.error('[svc-geocode]', err)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app
