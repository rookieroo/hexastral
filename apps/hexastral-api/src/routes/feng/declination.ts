/**
 * GET /api/feng/declination?lat=&lng= — magnetic declination lookup.
 *
 * Web Compass uses this to show the "True N is X° east of magnetic N here"
 * hint when calibrating with DeviceOrientation. iOS-native Compass uses the
 * on-device WMM provided by CLLocationManager.
 *
 * Public endpoint — no PII. No auth required.
 *
 * Phase F: migrated to shared response envelope (`ok` / `err` from
 * `lib/api-response.ts`) and shared lat/lng schemas. Canonical proof of the
 * §3 normalization pattern.
 *
 * Response shape:
 *   200 { ok: true, data: { declination: number | null, source: 'grid' | 'unknown', epoch: string } }
 *   400 { ok: false, error: { code: 'invalid_input', message, details } }
 */

import { Hono } from 'hono'
import { z } from 'zod/v4'
import type { AppEnv } from '../../infra-types'
import { ApiErrorCode, jsonErr, jsonOk } from '../../lib/api-response'
import { magneticDeclinationLookup } from '../../lib/magnetic-declination'

// Query params are strings; coerce-and-validate inline. The shared latSchema /
// lngSchema in lib/schemas/common.ts is for JSON-body validation (already typed
// as number). For coerced query inputs we re-declare with z.coerce.
const querySchema = z.object({
  lat: z.coerce.number().gte(-85).lte(85),
  lng: z.coerce.number().gte(-180).lte(180),
})

export const fengDeclinationRoutes = new Hono<AppEnv>().get('/', async (c) => {
  const parsed = querySchema.safeParse({
    lat: c.req.query('lat'),
    lng: c.req.query('lng'),
  })
  if (!parsed.success) {
    return jsonErr(c, 400, ApiErrorCode.invalid_input, 'lat and lng query params are required', {
      issues: parsed.error.issues,
    })
  }

  const decl = magneticDeclinationLookup(parsed.data.lat, parsed.data.lng)
  return jsonOk(c, {
    declination: decl,
    source: decl === null ? ('unknown' as const) : ('grid' as const),
    epoch: '2026.0',
  })
})
