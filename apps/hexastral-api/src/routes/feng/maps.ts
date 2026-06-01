/**
 * GET /api/feng/maps/preview — satellite tile for the facing calibrator (HMAC).
 *
 * Proxies to svc-feng POST /maps/render and returns base64 PNG in the standard
 * JSON envelope so mobile clients can use a data: URI without binary fetch plumbing.
 */

import { Hono } from 'hono'
import { z } from 'zod/v4'
import type { AppEnv } from '../../infra-types'
import { ApiErrorCode, jsonErr, jsonOk } from '../../lib/api-response'
import { renderMap } from '../../lib/feng-client'

const querySchema = z.object({
  lat: z.coerce.number().gte(-85).lte(85),
  lng: z.coerce.number().gte(-180).lte(180),
  zoom: z.coerce.number().int().gte(0).lte(22).optional(),
  size: z.coerce.number().int().gte(64).lte(640).optional(),
})

function toBase64(bytes: ArrayBuffer): string {
  const u8 = new Uint8Array(bytes)
  const CHUNK = 0x8000
  let result = ''
  for (let i = 0; i < u8.length; i += CHUNK) {
    result += String.fromCharCode(...u8.subarray(i, i + CHUNK))
  }
  return btoa(result)
}

export const fengMapRoutes = new Hono<AppEnv>().get('/preview', async (c) => {
  const parsed = querySchema.safeParse({
    lat: c.req.query('lat'),
    lng: c.req.query('lng'),
    zoom: c.req.query('zoom'),
    size: c.req.query('size'),
  })
  if (!parsed.success) {
    return jsonErr(c, 400, ApiErrorCode.invalid_input, 'lat and lng query params are required', {
      issues: parsed.error.issues,
    })
  }

  const zoom = parsed.data.zoom ?? 17
  const size = parsed.data.size ?? 640

  try {
    const { bytes } = await renderMap(c.env.SVC_FENG, {
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      zoom,
      width: size,
      height: size,
      mode: 'satellite',
    })
    return jsonOk(c, {
      base64: toBase64(bytes),
      contentType: 'image/png',
      zoom,
      size,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[feng.maps.preview] failed', {
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      zoom,
      size,
      message,
    })
    return jsonErr(c, 502, ApiErrorCode.internal_error, message)
  }
})
