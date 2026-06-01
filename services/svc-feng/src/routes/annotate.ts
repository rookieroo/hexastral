/**
 * POST /annotate
 *
 * Composes SVG overlays (sit/face/door arrows, 24山 ring, bagua sector
 * wedges) onto a previously-fetched map PNG and writes the annotated PNG
 * to R2.
 *
 * Pipeline:
 *   1. Validate request body (Zod).
 *   2. Read source PNG from MAPS_CACHE.
 *   3. Build a single SVG that embeds the PNG via data URI + draws overlays.
 *   4. Rasterize via @resvg/resvg-wasm.
 *   5. Write to ANNOTATED_CACHE keyed by sha1(request).
 *   6. Return PNG bytes + cache key header.
 *
 * The composition itself is sub-50ms on warm isolates; the wasm init runs
 * once per isolate and is cached in the overlay module.
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { cacheKey, readCache, writeCache } from '../lib/cache'
import { logger } from '../lib/logger'
import { composeAnnotated } from '../lib/overlay'

const OverlayArrowSchema = z.object({
  kind: z.enum(['sit', 'face', 'door']),
  /** 0-360 true-north degrees. */
  degTrue: z.number(),
  /** Display label (e.g., '坐 子 (358°)'). */
  label: z.string(),
})

const AnnotateSchema = z.object({
  /** R2 key of the source map (from /maps/render). */
  mapKey: z.string().min(1),
  /** Width / height of the source PNG in pixels (logical, not retina). */
  width: z.number().int().gte(64).lte(1280),
  height: z.number().int().gte(64).lte(1280),
  arrows: z.array(OverlayArrowSchema).min(1).max(3),
  /** Whether to draw the outer 24-mountain ring. */
  drawMountainRing: z.boolean().default(true),
  /** Whether to draw the 8 bagua sector wedges. */
  drawBaguaWedges: z.boolean().default(true),
})

export const annotateRouter = new Hono<{ Bindings: Env }>()

annotateRouter.post('/', async (c) => {
  const json = await c.req.json().catch(() => null)
  const parsed = AnnotateSchema.safeParse(json)
  if (!parsed.success) {
    throw new HTTPException(400, { message: parsed.error.message })
  }
  const input = parsed.data

  const key = await cacheKey('annotated', input)
  const cached = await readCache(c.env.ANNOTATED_CACHE, key)
  if (cached) {
    logger.info('annotate', { cache: 'hit', key, mapKey: input.mapKey })
    return new Response(cached.bytes, {
      headers: {
        'content-type': cached.contentType,
        'x-feng-cache': 'hit',
        'x-feng-cache-key': key,
      },
    })
  }

  const sourceObj = await c.env.MAPS_CACHE.get(input.mapKey)
  if (!sourceObj) {
    throw new HTTPException(404, { message: `map not in cache: ${input.mapKey}` })
  }
  const baseBytes = await sourceObj.arrayBuffer()

  let composed: ArrayBuffer
  const composeStarted = Date.now()
  try {
    composed = await composeAnnotated({
      baseBytes,
      width: input.width,
      height: input.height,
      arrows: input.arrows,
      drawMountainRing: input.drawMountainRing,
      drawBaguaWedges: input.drawBaguaWedges,
    })
  } catch (err) {
    // Fall back to the unannotated PNG rather than 500-ing the whole job —
    // the downstream pipeline can still proceed (vision will just see no
    // arrows). Log so we know if resvg is misbehaving in prod.
    logger.warn('annotate.compose_fallback', {
      key,
      mapKey: input.mapKey,
      composeMs: Date.now() - composeStarted,
      error: err instanceof Error ? err.message : String(err),
    })
    await writeCache(c.env.ANNOTATED_CACHE, key, baseBytes, 'image/png')
    return new Response(baseBytes, {
      headers: {
        'content-type': 'image/png',
        'x-feng-cache': 'miss-passthrough',
        'x-feng-cache-key': key,
        'x-feng-stage': 'resvg-failed',
      },
    })
  }

  await writeCache(c.env.ANNOTATED_CACHE, key, composed, 'image/png')
  logger.info('annotate', {
    cache: 'miss',
    key,
    mapKey: input.mapKey,
    composeMs: Date.now() - composeStarted,
    bytes: composed.byteLength,
  })
  return new Response(composed, {
    headers: {
      'content-type': 'image/png',
      'x-feng-cache': 'miss',
      'x-feng-cache-key': key,
    },
  })
})
