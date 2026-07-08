/**
 * /api/feng/maps — satellite tile for the facing calibrator + floor-plan upload
 * (both HMAC-protected via `/api/feng/maps/*`).
 *
 * - GET  /preview   — proxies svc-feng /maps/render, returns base64 PNG envelope.
 * - POST /floorplan — forwards raw image bytes to svc-feng /floorplan/put, returns
 *                     the owned R2 key for the interior (户型图) analysis.
 */

import { Hono } from 'hono'
import { z } from 'zod/v4'
import type { AppEnv } from '../../infra-types'
import { ApiErrorCode, jsonErr, jsonOk } from '../../lib/api-response'
import { requireUserId } from '../../lib/auth'
import { getFloorplanImage, putFloorplan, renderMap } from '../../lib/feng-client'
import { grantFloorplanKey, userCanReadFloorplanKey } from '../../lib/feng-floorplan-access'

const FLOORPLAN_MAX_BYTES = 8 * 1024 * 1024
const floorplanSchema = z.object({
  /** base64-encoded image bytes (fits the v2 HMAC string-body signing). */
  image: z.string().min(1),
  contentType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
})

function decodeBase64(b64: string): ArrayBuffer | null {
  try {
    const bin = atob(b64)
    const u8 = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i)
    return u8.buffer
  } catch {
    return null
  }
}

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
}).post('/floorplan', async (c) => {
  const userId = requireUserId(c)

  const json = await c.req.json().catch(() => null)
  const parsed = floorplanSchema.safeParse(json)
  if (!parsed.success) {
    return jsonErr(c, 400, ApiErrorCode.invalid_input, 'image (base64) + contentType required', {
      issues: parsed.error.issues,
    })
  }

  const bytes = decodeBase64(parsed.data.image)
  if (!bytes) {
    return jsonErr(c, 400, ApiErrorCode.invalid_input, 'invalid base64 image')
  }
  if (bytes.byteLength === 0) {
    return jsonErr(c, 400, ApiErrorCode.invalid_input, 'empty image')
  }
  if (bytes.byteLength > FLOORPLAN_MAX_BYTES) {
    return jsonErr(c, 413, ApiErrorCode.invalid_input, 'image too large (max 8MB)')
  }

  try {
    const { key } = await putFloorplan(c.env.SVC_FENG, bytes, parsed.data.contentType)
    await grantFloorplanKey(c.env.GUARD_KV, userId, key)
    return jsonOk(c, { key })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[feng.maps.floorplan] upload failed', { message })
    return jsonErr(c, 502, ApiErrorCode.internal_error, message)
  }
}).get('/floorplan/:key', async (c) => {
  const userId = requireUserId(c)
  const key = c.req.param('key')
  if (!key || key.length < 4 || key.length > 96) {
    return jsonErr(c, 400, ApiErrorCode.invalid_input, 'invalid floorplan key')
  }

  const db = c.get('db')
  const allowed = await userCanReadFloorplanKey(c.env, db, userId, key)
  if (!allowed) {
    return jsonErr(c, 403, ApiErrorCode.forbidden, 'floorplan key not owned by user')
  }

  try {
    const { bytes, contentType } = await getFloorplanImage(c.env.SVC_FENG, key)
    return jsonOk(c, {
      base64: toBase64(bytes),
      contentType,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[feng.maps.floorplan.get] failed', { key, message })
    return jsonErr(c, 502, ApiErrorCode.internal_error, message)
  }
})
