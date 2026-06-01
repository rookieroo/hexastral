/**
 * /api/geocode/search — 通过 SVC_GEOCODE 服务绑定代理地理编码查询
 *
 * svc-geocode (hexastral-svc-geocode) 无公网域名，由此路由代理：
 *   GET /api/geocode/search?q=上海&lang=zh-CN&limit=5
 *   → [{ name, displayName, lat, lon, country, countryCode, timezone }]
 *
 * iOS auth: Bearer JWT (hexastral-api 统一鉴权，无需单独 secret)
 */

import { Hono } from 'hono'
import type { AppEnv } from '../infra-types'
import { geocodeClient } from '../lib/service-clients'

export const geocodeRoutes = new Hono<AppEnv>()

geocodeRoutes.get('/search', async (c) => {
  const q = c.req.query('q')?.trim()
  if (!q || q.length < 1) {
    return c.json([])
  }

  const lang = c.req.query('lang') ?? 'zh-CN'
  const limit = Math.min(Number(c.req.query('limit') ?? '7'), 10)

  // Forward to svc-geocode via service binding (zero network hop)
  const params = new URLSearchParams({ q, lang, limit: String(limit) })
  try {
    const data = await geocodeClient.get(c.env.SVC_GEOCODE, `/search?${params}`)
    return c.json(data)
  } catch {
    return c.json([])
  }
})
