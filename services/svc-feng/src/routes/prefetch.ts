/**
 * POST /prefetch — Mapbox Tilequery prefetch for terrain signals.
 *
 * Called by hexastral-api's feng-analyze orchestrator before /maps/render so
 * downstream stages (annotate / vision / synthesize) can skip work for sites
 * with no mountains or water within range. See lib/prefetch.ts for the full
 * rationale.
 *
 * Body:
 *   { lat: number, lng: number }
 *
 * Returns: TerrainSignals JSON (see lib/prefetch.ts).
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { logger } from '../lib/logger'
import { prefetchTerrainSignals } from '../lib/prefetch'

export const prefetchRouter = new Hono<{ Bindings: Env }>()

const InputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

prefetchRouter.post('/', async (c) => {
  const body = (await c.req.json().catch(() => null)) as unknown
  const parsed = InputSchema.safeParse(body)
  if (!parsed.success) {
    throw new HTTPException(400, { message: 'invalid prefetch payload' })
  }

  const started = Date.now()
  const signals = await prefetchTerrainSignals({
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    mapboxToken: c.env.MAPBOX_TOKEN ?? '',
  })

  logger.info('prefetch.done', {
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    hasWater: signals.hasWater,
    hasMountain: signals.hasMountain,
    elevationRangeM: signals.elevationRangeM,
    recommendedTiles: signals.recommendedTiles,
    degraded: signals.degraded,
    durationMs: Date.now() - started,
  })

  return c.json(signals)
})
