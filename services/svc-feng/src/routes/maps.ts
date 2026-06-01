/**
 * POST /maps/render
 *
 * Body: { lat, lng, zoom, width, height, mode }
 * Response: { bytes: base64 } streamed via the response body as image/png
 *
 * Caches in R2 keyed by SHA-1 of the normalized request. 30-day TTL.
 *
 * Call shape from hexastral-api:
 *
 *   const r = await env.SVC_FENG.fetch('https://svc-feng/maps/render', {
 *     method: 'POST',
 *     headers: { 'content-type': 'application/json' },
 *     body: JSON.stringify({ lat, lng, zoom: 17, width: 600, height: 600, mode: 'satellite' }),
 *   })
 *   const pngBytes = await r.arrayBuffer()
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { cacheKey, readCache, writeCache } from '../lib/cache'
import { logger } from '../lib/logger'
import { fetchMapImage, MapboxError } from '../lib/mapbox'

const MapRenderSchema = z.object({
  lat: z.number().gte(-85).lte(85),
  lng: z.number().gte(-180).lte(180),
  zoom: z.number().int().gte(0).lte(22),
  width: z.number().int().gte(64).lte(1280),
  height: z.number().int().gte(64).lte(1280),
  mode: z.enum(['satellite', 'satellite-streets', 'streets', 'outdoors']),
  bearing: z.number().optional(),
  pitch: z.number().optional(),
})

export const mapsRouter = new Hono<{ Bindings: Env }>()

mapsRouter.post('/render', async (c) => {
  const json = await c.req.json().catch(() => null)
  const parsed = MapRenderSchema.safeParse(json)
  if (!parsed.success) {
    throw new HTTPException(400, { message: parsed.error.message })
  }
  const input = parsed.data

  // Round lat/lng to 5 decimal places (~1m) for cache stability.
  const cacheable = {
    lat: Math.round(input.lat * 1e5) / 1e5,
    lng: Math.round(input.lng * 1e5) / 1e5,
    zoom: input.zoom,
    width: input.width,
    height: input.height,
    mode: input.mode,
    bearing: input.bearing ?? 0,
    pitch: input.pitch ?? 0,
  }

  const key = await cacheKey('maps', cacheable)
  const cached = await readCache(c.env.MAPS_CACHE, key)
  if (cached) {
    logger.info('maps.render', {
      cache: 'hit',
      key,
      zoom: cacheable.zoom,
      width: cacheable.width,
      height: cacheable.height,
    })
    return new Response(cached.bytes, {
      headers: {
        'content-type': cached.contentType,
        'x-feng-cache': 'hit',
        'x-feng-cache-key': key,
        'cache-control': 'public, max-age=2592000',
      },
    })
  }

  try {
    const fetchStarted = Date.now()
    const fetched = await fetchMapImage(cacheable, c.env.MAPBOX_TOKEN)
    await writeCache(c.env.MAPS_CACHE, key, fetched.bytes, fetched.contentType)
    logger.info('maps.render', {
      cache: 'miss',
      key,
      zoom: cacheable.zoom,
      mapboxMs: Date.now() - fetchStarted,
      bytes: fetched.bytes.byteLength,
    })
    return new Response(fetched.bytes, {
      headers: {
        'content-type': fetched.contentType,
        'x-feng-cache': 'miss',
        'x-feng-cache-key': key,
        'cache-control': 'public, max-age=2592000',
      },
    })
  } catch (err) {
    if (err instanceof MapboxError) {
      throw new HTTPException(err.status === 500 ? 500 : 502, { message: err.message })
    }
    throw err
  }
})

/**
 * GET /maps/image/:bucket/:key — stream a cached PNG by key.
 *
 * Phase H · F4: surfaces the annotated satellite tiles to the report screen
 * via hexastral-api's ownership-checked proxy. `bucket` is `raw` (MAPS_CACHE)
 * or `annotated` (ANNOTATED_CACHE).
 *
 * No auth — svc-feng is reachable only via Service Binding from hexastral-api,
 * which performs the user-ownership check before forwarding. The key alone
 * isn't guessable (SHA-1) so the binding wall is the sole authority.
 */
mapsRouter.get('/image/:bucket/:key', async (c) => {
  const bucket = c.req.param('bucket')
  const key = c.req.param('key')
  if (bucket !== 'raw' && bucket !== 'annotated') {
    throw new HTTPException(400, { message: 'bucket must be raw|annotated' })
  }
  if (!key || key.length < 4 || key.length > 96) {
    throw new HTTPException(400, { message: 'invalid key' })
  }

  const r2 = bucket === 'raw' ? c.env.MAPS_CACHE : c.env.ANNOTATED_CACHE
  const obj = await r2.get(key)
  if (!obj) {
    throw new HTTPException(404, { message: 'image not found' })
  }
  const contentType =
    (typeof obj.customMetadata?.contentType === 'string' && obj.customMetadata.contentType) ||
    obj.httpMetadata?.contentType ||
    'image/png'
  return new Response(obj.body, {
    headers: {
      'content-type': contentType,
      'cache-control': 'public, max-age=2592000',
      'x-feng-bucket': bucket,
    },
  })
})
