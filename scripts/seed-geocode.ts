#!/usr/bin/env bun
/**
 * scripts/seed-geocode.ts
 *
 * 批量查询 Nominatim，为全球热门城市预生成地理编码数据。
 * 输出文件：services/svc-geocode/src/popular-cities.json
 * 后续可选导入 Cloudflare KV：wrangler kv bulk put GEOCODE_CACHE popular-cities-kv.json
 *
 * 使用方式：
 *   bun scripts/seed-geocode.ts
 *   bun scripts/seed-geocode.ts --kv    # 同时生成 KV bulk upload 格式
 *
 * Rate limit: 1 req/s（Nominatim 使用政策要求）
 */

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const NOMINATIM_EMAIL = 'dev@hexastral.com'
const OUT_BUNDLE = join(import.meta.dir, '../services/svc-geocode/src/popular-cities.json')
const OUT_KV = join(import.meta.dir, '../services/svc-geocode/src/popular-cities-kv.json')
const GENERATE_KV = process.argv.includes('--kv')

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
  name: string
  address: {
    city?: string
    town?: string
    municipality?: string
    state?: string
    country?: string
    country_code?: string
  }
  extratags?: { timezone?: string }
}

interface GeocodedCity {
  name: string
  displayName: string
  lat: number
  lon: number
  country: string
  countryCode: string
  timezone: string | null
}

// ── Popular cities list grouped by market ──────────────────────────────────
// Format: [query, lang, expectedCityName]
const CITIES: [string, string, string][] = [
  // ── 中国大陆 ──
  ['北京', 'zh', 'Beijing'],
  ['上海', 'zh', 'Shanghai'],
  ['广州', 'zh', 'Guangzhou'],
  ['深圳', 'zh', 'Shenzhen'],
  ['成都', 'zh', 'Chengdu'],
  ['西安', 'zh', "Xi'an"],
  ['杭州', 'zh', 'Hangzhou'],
  ['武汉', 'zh', 'Wuhan'],
  ['南京', 'zh', 'Nanjing'],
  ['重庆', 'zh', 'Chongqing'],
  ['天津', 'zh', 'Tianjin'],
  ['昆明', 'zh', 'Kunming'],
  ['沈阳', 'zh', 'Shenyang'],
  ['长沙', 'zh', 'Changsha'],
  ['郑州', 'zh', 'Zhengzhou'],
  ['福州', 'zh', 'Fuzhou'],
  ['厦门', 'zh', 'Xiamen'],
  ['青岛', 'zh', 'Qingdao'],
  ['哈尔滨', 'zh', 'Harbin'],
  ['大连', 'zh', 'Dalian'],
  ['合肥', 'zh', 'Hefei'],
  ['济南', 'zh', 'Jinan'],
  ['苏州', 'zh', 'Suzhou'],
  ['宁波', 'zh', 'Ningbo'],
  ['无锡', 'zh', 'Wuxi'],
  ['长春', 'zh', 'Changchun'],
  ['南昌', 'zh', 'Nanchang'],
  ['贵阳', 'zh', 'Guiyang'],
  ['海口', 'zh', 'Haikou'],
  ['乌鲁木齐', 'zh', 'Urumqi'],
  ['拉萨', 'zh', 'Lhasa'],
  ['呼和浩特', 'zh', 'Hohhot'],
  ['南宁', 'zh', 'Nanning'],
  ['石家庄', 'zh', 'Shijiazhuang'],
  ['太原', 'zh', 'Taiyuan'],
  ['兰州', 'zh', 'Lanzhou'],
  // ── 台湾 ──
  ['台北', 'zh', 'Taipei'],
  ['台中', 'zh', 'Taichung'],
  ['高雄', 'zh', 'Kaohsiung'],
  ['台南', 'zh', 'Tainan'],
  // ── 港澳 ──
  ['Hong Kong', 'zh', 'Hong Kong'],
  ['Macau', 'zh', 'Macau'],
  // ── 日本 ──
  ['東京', 'ja', 'Tokyo'],
  ['大阪', 'ja', 'Osaka'],
  ['京都', 'ja', 'Kyoto'],
  ['横浜', 'ja', 'Yokohama'],
  ['名古屋', 'ja', 'Nagoya'],
  ['福岡', 'ja', 'Fukuoka'],
  ['札幌', 'ja', 'Sapporo'],
  ['神戸', 'ja', 'Kobe'],
  ['仙台', 'ja', 'Sendai'],
  ['広島', 'ja', 'Hiroshima'],
  // ── 韩国 ──
  ['서울', 'ko', 'Seoul'],
  ['부산', 'ko', 'Busan'],
  ['인천', 'ko', 'Incheon'],
  ['대구', 'ko', 'Daegu'],
  ['대전', 'ko', 'Daejeon'],
  // ── 东南亚 ──
  ['Singapore', 'en', 'Singapore'],
  ['Kuala Lumpur', 'en', 'Kuala Lumpur'],
  ['Penang', 'en', 'Penang'],
  ['Bangkok', 'en', 'Bangkok'],
  ['Chiang Mai', 'en', 'Chiang Mai'],
  ['Hanoi', 'en', 'Hanoi'],
  ['Ho Chi Minh City', 'en', 'Ho Chi Minh City'],
  ['Jakarta', 'en', 'Jakarta'],
  ['Bali', 'en', 'Bali'],
  ['Surabaya', 'en', 'Surabaya'],
  ['Manila', 'en', 'Manila'],
  ['Cebu', 'en', 'Cebu'],
  ['Yangon', 'en', 'Yangon'],
  ['Phnom Penh', 'en', 'Phnom Penh'],
  ['Vientiane', 'en', 'Vientiane'],
  ['Taipei', 'en', 'Taipei'],
  // ── 美国 ──
  ['New York', 'en', 'New York City'],
  ['Los Angeles', 'en', 'Los Angeles'],
  ['San Francisco', 'en', 'San Francisco'],
  ['Seattle', 'en', 'Seattle'],
  ['Houston', 'en', 'Houston'],
  ['Chicago', 'en', 'Chicago'],
  ['Boston', 'en', 'Boston'],
  ['Atlanta', 'en', 'Atlanta'],
  ['Miami', 'en', 'Miami'],
  ['Dallas', 'en', 'Dallas'],
  ['Las Vegas', 'en', 'Las Vegas'],
  ['Phoenix', 'en', 'Phoenix'],
  ['San Jose', 'en', 'San Jose'],
  ['San Diego', 'en', 'San Diego'],
  ['Portland', 'en', 'Portland'],
  ['Denver', 'en', 'Denver'],
  ['Minneapolis', 'en', 'Minneapolis'],
  ['Detroit', 'en', 'Detroit'],
  ['Austin', 'en', 'Austin'],
  ['Washington DC', 'en', 'Washington'],
  // ── 加拿大 ──
  ['Toronto', 'en', 'Toronto'],
  ['Vancouver', 'en', 'Vancouver'],
  ['Montreal', 'en', 'Montréal'],
  ['Calgary', 'en', 'Calgary'],
  ['Ottawa', 'en', 'Ottawa'],
  // ── 澳洲/新西兰 ──
  ['Sydney', 'en', 'Sydney'],
  ['Melbourne', 'en', 'Melbourne'],
  ['Brisbane', 'en', 'Brisbane'],
  ['Perth', 'en', 'Perth'],
  ['Auckland', 'en', 'Auckland'],
  // ── 欧洲 ──
  ['London', 'en', 'London'],
  ['Paris', 'fr', 'Paris'],
  ['Berlin', 'de', 'Berlin'],
  ['Amsterdam', 'en', 'Amsterdam'],
  ['Frankfurt', 'de', 'Frankfurt'],
  ['Munich', 'de', 'Munich'],
  ['Zurich', 'de', 'Zürich'],
  ['Vienna', 'de', 'Vienna'],
  ['Prague', 'en', 'Prague'],
  ['Warsaw', 'en', 'Warsaw'],
  ['Stockholm', 'sv', 'Stockholm'],
  ['Copenhagen', 'da', 'Copenhagen'],
  ['Oslo', 'no', 'Oslo'],
  ['Helsinki', 'fi', 'Helsinki'],
  ['Rome', 'it', 'Rome'],
  ['Milan', 'it', 'Milan'],
  ['Barcelona', 'ca', 'Barcelona'],
  ['Madrid', 'es', 'Madrid'],
  ['Lisbon', 'pt', 'Lisboa'],
  ['Brussels', 'fr', 'Brussels'],
  // ── 南亚 ──
  ['Mumbai', 'en', 'Mumbai'],
  ['New Delhi', 'en', 'New Delhi'],
  ['Bangalore', 'en', 'Bengaluru'],
  ['Chennai', 'en', 'Chennai'],
  ['Kolkata', 'en', 'Kolkata'],
  ['Lahore', 'en', 'Lahore'],
  ['Karachi', 'en', 'Karachi'],
  ['Dhaka', 'en', 'Dhaka'],
  ['Colombo', 'en', 'Colombo'],
  // ── 中东 ──
  ['Dubai', 'en', 'Dubai'],
  ['Abu Dhabi', 'en', 'Abu Dhabi'],
  ['Doha', 'en', 'Doha'],
  ['Riyadh', 'en', 'Riyadh'],
  ['Tel Aviv', 'en', 'Tel Aviv'],
  ['Istanbul', 'en', 'Istanbul'],
]

// ── Nominatim query ────────────────────────────────────────────────────────

async function fetchCity(query: string, lang: string): Promise<GeocodedCity | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('extratags', '1')
  url.searchParams.set('featuretype', 'city')
  url.searchParams.set('limit', '1')
  url.searchParams.set('accept-language', lang)

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': `Hexastral-Seed/1.0 (${NOMINATIM_EMAIL})` },
  })

  if (!res.ok) {
    console.error(`  ✗ ${query}: HTTP ${res.status}`)
    return null
  }

  const data = await res.json() as NominatimResult[]
  if (!data.length) {
    console.warn(`  ⚠ ${query}: no results`)
    return null
  }

  const r = data[0]
  const addr = r.address
  return {
    name: addr.city ?? addr.town ?? addr.municipality ?? r.name,
    displayName: r.display_name,
    lat: Number.parseFloat(r.lat),
    lon: Number.parseFloat(r.lon),
    country: addr.country ?? '',
    countryCode: (addr.country_code ?? '').toUpperCase(),
    timezone: r.extratags?.timezone ?? null,
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

// Bundle format: { [normalizedQuery]: GeocodedCity[] }
const bundle: Record<string, GeocodedCity[]> = {}
// KV format for wrangler kv bulk put: [{ key, value }]
const kvBulk: Array<{ key: string; value: string; expiration_ttl?: number }> = []

console.log(`Seeding ${CITIES.length} cities from Nominatim (1 req/s)...\n`)

for (const [query, lang] of CITIES) {
  const city = await fetchCity(query, lang)
  if (city) {
    const normalizedKey = query.trim().toLowerCase()
    bundle[normalizedKey] = [city]
    if (GENERATE_KV) {
      kvBulk.push({
        key: `geocode:v1:${lang}:5:${normalizedKey}`,
        value: JSON.stringify([city]),
        // No TTL on pre-seeded data — it's stable
      })
    }
    console.log(`  ✓ ${query} → ${city.name} (${city.countryCode}) ${city.timezone ?? '—'}`)
  }

  // Nominatim rate limit: 1 req/s
  await new Promise((r) => setTimeout(r, 1100))
}

// Write bundle
writeFileSync(OUT_BUNDLE, JSON.stringify(bundle, null, 2), 'utf-8')
console.log(`\n✅ Bundle written → ${OUT_BUNDLE} (${Object.keys(bundle).length} cities)`)

if (GENERATE_KV) {
  writeFileSync(OUT_KV, JSON.stringify(kvBulk, null, 2), 'utf-8')
  console.log(`✅ KV bulk file → ${OUT_KV}`)
  console.log('\nTo upload to KV:')
  console.log(`  wrangler kv bulk put --binding=GEOCODE_CACHE ${OUT_KV}`)
}
