/**
 * POST /annotate
 *
 * Copies the source satellite PNG into ANNOTATED_CACHE unchanged — the
 * 坐/向/门 arrows + 24山 ring + bagua wedges are now drawn CLIENT-SIDE
 * (react-native-svg over the <Image>), because `@resvg/resvg-wasm` silently
 * drops the embedded raster base (`<image href="data:…">` never decodes),
 * which turned every "annotated" tile into an overlay floating on a
 * transparent/dark disc — and, worse, starved Stage-1 vision of the real
 * photo. Passing the raw satellite through fixes BOTH: Gemini and the report
 * now see the actual imagery, and orientation is a crisp vector layer on the
 * client instead of a baked raster the server can't reliably produce.
 *
 * Pipeline:
 *   1. Validate request body (Zod).
 *   2. Read source PNG from MAPS_CACHE.
 *   3. Write it to ANNOTATED_CACHE keyed by sha1(request) (arrows still in the
 *      key so re-runs with different bearings stay distinct; harmless if equal).
 *   4. Return PNG bytes + cache key header.
 *
 * The arrow/ring/wedge params are still accepted (API compat + cache keying)
 * but no longer rasterized here.
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { cacheKey, readCache, writeCache } from '../lib/cache'
import { logger } from '../lib/logger'

// Report-referenced tiles are effectively permanent (a persisted report can be
// reopened years later). 10y == the FLOORPLAN owned-asset TTL; keep in sync.
const REPORT_TILE_TTL_SECONDS = 10 * 365 * 24 * 60 * 60

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

  // 'annotated-raw' (was 'annotated'): the old namespace is poisoned with
  // resvg composites that lost the satellite base. Bumping it forces a miss on
  // re-analysis so the passthrough writes the real photo — and cascades to the
  // vision-result cache (keyed off these annotated keys), re-running Stage 1 on
  // the real imagery instead of serving the stale, blank-tile analysis.
  const key = await cacheKey('annotated-raw', input)
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

  // Pass the raw satellite through — orientation is drawn client-side (see the
  // file header for why the resvg composite was removed). This keeps the real
  // photo intact for both Stage-1 vision and the report's map swiper.
  // These tiles are REFERENCED BY PERSISTED REPORTS (annotated_map_keys), which
  // are permanent — write an owned/long TTL so a future ANNOTATED_CACHE lifecycle
  // sweep can't expire them out from under a live report (broken map swiper).
  await writeCache(c.env.ANNOTATED_CACHE, key, baseBytes, 'image/png', REPORT_TILE_TTL_SECONDS)
  logger.info('annotate', {
    cache: 'miss',
    key,
    mapKey: input.mapKey,
    bytes: baseBytes.byteLength,
    mode: 'passthrough',
  })
  return new Response(baseBytes, {
    headers: {
      'content-type': 'image/png',
      'x-feng-cache': 'miss',
      'x-feng-cache-key': key,
    },
  })
})
