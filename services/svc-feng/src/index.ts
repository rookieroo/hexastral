/**
 * svc-feng — Feng-shui analysis orchestration worker.
 *
 * Sits behind hexastral-api (no direct public access). Three jobs:
 *   1. Proxy Mapbox Static Images with R2 caching             — /maps/render
 *   2. Annotate cached PNGs with feng-shui overlays           — /annotate
 *   3. Run the 3-stage AI pipeline (vision → compute → text)  — /vision/analyze + /synthesize
 *
 * Stage 2 (compute) is pure-function and lives in @zhop/astro-core/feng —
 * callers do that locally; no HTTP hop.
 *
 * V1 routes are scaffolded; real Mapbox + Gemini wiring lands Week 3 and
 * Week 5 respectively. See docs/feng-plan.md §5.4.
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { logger } from './lib/logger'
import { annotateRouter } from './routes/annotate'
import { floorplanRouter } from './routes/floorplan'
import { mapsRouter } from './routes/maps'
import { prefetchRouter } from './routes/prefetch'
import { streetRouter } from './routes/street'
import { synthesizeRouter } from './routes/synthesize'
import { terrainRouter } from './routes/terrain'
import { visionRouter } from './routes/vision'

const app = new Hono<{ Bindings: Env }>()

app.use('*', async (c, next) => {
  const path = new URL(c.req.url).pathname
  const started = Date.now()
  logger.info('request.start', { method: c.req.method, path })
  await next()
  logger.info('request.done', {
    method: c.req.method,
    path,
    status: c.res.status,
    durationMs: Date.now() - started,
  })
})

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    logger.warn('request.http_exception', {
      path: new URL(c.req.url).pathname,
      status: err.status,
      message: err.message,
    })
    return c.json({ error: err.message }, err.status)
  }
  logger.error('request.unhandled', {
    path: new URL(c.req.url).pathname,
    error: err instanceof Error ? err.message : String(err),
  })
  return c.json({ error: 'internal error' }, 500)
})

app.get('/', (c) =>
  c.json({
    name: 'svc-feng',
    version: '0.0.1',
    routes: ['/prefetch', '/maps/render', '/annotate', '/vision/analyze', '/synthesize'],
  })
)

app.get('/health', (c) =>
  c.json({
    ok: true,
    env: c.env.ENV,
    buckets: {
      maps: !!c.env.MAPS_CACHE,
      annotated: !!c.env.ANNOTATED_CACHE,
      floorplans: !!c.env.FLOORPLAN_CACHE,
    },
    secrets: {
      mapboxToken: !!c.env.MAPBOX_TOKEN,
      geminiKey: !!c.env.GEMINI_API_KEY,
    },
  })
)

app.route('/prefetch', prefetchRouter)
app.route('/terrain', terrainRouter)
app.route('/street', streetRouter)
app.route('/maps', mapsRouter)
app.route('/annotate', annotateRouter)
app.route('/floorplan', floorplanRouter)
app.route('/vision', visionRouter)
app.route('/synthesize', synthesizeRouter)

export default app
