/**
 * POST /terrain/profile — per-8宫 DEM elevation profile (大峦头 macro 砂).
 *
 * Called by feng-analyze when the prefetch flagged elevation, to supply 砂/高地
 * by direction (which a top-down VLM cannot read). See lib/elevation.ts.
 *
 * Body: { lat, lng }  →  ElevationProfile JSON.
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { sampleElevationProfile } from '../lib/elevation'
import { logger } from '../lib/logger'

export const terrainRouter = new Hono<{ Bindings: Env }>()

const InputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

terrainRouter.post('/profile', async (c) => {
  const body = (await c.req.json().catch(() => null)) as unknown
  const parsed = InputSchema.safeParse(body)
  if (!parsed.success) {
    throw new HTTPException(400, { message: 'invalid terrain payload' })
  }

  const started = Date.now()
  const profile = await sampleElevationProfile({
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    mapboxToken: c.env.MAPBOX_TOKEN ?? '',
  })

  logger.info('terrain.profile.done', {
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    laiLong: profile.laiLong,
    degraded: profile.degraded,
    durationMs: Date.now() - started,
  })

  return c.json(profile)
})
