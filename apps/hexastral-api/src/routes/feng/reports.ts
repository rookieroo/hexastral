/**
 * /api/feng/reports/:reportId/maps/:tile — ownership-checked annotated map.
 *
 * Phase H · F4: surfaces the annotated satellite tiles produced by feng-analyze.
 * Returns base64-encoded PNG inside the standard envelope so React Native
 * `<Image source={{ uri: 'data:image/png;base64,...' }}>` can render without
 * a custom header-signing fetcher (mirrors `/api/feng/maps/preview`).
 *
 * Flow:
 *   1. Lookup report row, verify reportId.userId === HMAC user.
 *   2. Parse stored `annotated_map_keys` JSON: { close?, mid?, wide? }.
 *   3. Resolve key for requested tile; 404 if not present (prefetch may have
 *      skipped that scale for flat-urban sites).
 *   4. GET /maps/image/annotated/:key from svc-feng over Service Binding.
 *   5. Base64-encode + return.
 */

import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { fengReports } from '../../db/schema'
import type { AppEnv } from '../../infra-types'
import { ApiErrorCode, jsonErr, jsonOk } from '../../lib/api-response'
import { requireUserId } from '../../lib/auth'

const tileSchema = z.enum(['close', 'mid', 'wide'])

function toBase64(bytes: ArrayBuffer): string {
  const u8 = new Uint8Array(bytes)
  const CHUNK = 0x8000
  let result = ''
  for (let i = 0; i < u8.length; i += CHUNK) {
    result += String.fromCharCode(...u8.subarray(i, i + CHUNK))
  }
  return btoa(result)
}

export const fengReportRoutes = new Hono<AppEnv>().get(
  '/:reportId/maps/:tile',
  async (c) => {
    const userId = requireUserId(c)
    const reportId = c.req.param('reportId')
    const tileParam = c.req.param('tile')

    const parsedTile = tileSchema.safeParse(tileParam)
    if (!parsedTile.success) {
      return jsonErr(c, 400, ApiErrorCode.invalid_input, 'tile must be close|mid|wide')
    }
    const tile = parsedTile.data
    const db = c.get('db')

    const row = await db
      .select({
        id: fengReports.id,
        userId: fengReports.userId,
        annotatedMapKeys: fengReports.annotatedMapKeys,
      })
      .from(fengReports)
      .where(and(eq(fengReports.id, reportId), eq(fengReports.userId, userId)))
      .get()

    if (!row) {
      return jsonErr(c, 404, ApiErrorCode.not_found, 'report not found')
    }
    if (!row.annotatedMapKeys) {
      return jsonErr(
        c,
        404,
        ApiErrorCode.not_found,
        'this report has no annotated map (legacy or partial run)'
      )
    }

    let keys: Partial<Record<'close' | 'mid' | 'wide', string>>
    try {
      keys = JSON.parse(row.annotatedMapKeys) as Partial<
        Record<'close' | 'mid' | 'wide', string>
      >
    } catch {
      return jsonErr(c, 500, ApiErrorCode.internal_error, 'annotated_map_keys not parseable')
    }
    const key = keys[tile]
    if (!key) {
      return jsonErr(
        c,
        404,
        ApiErrorCode.not_found,
        `tile ${tile} not rendered for this report (prefetch may have skipped this scale)`
      )
    }

    const res = await c.env.SVC_FENG.fetch(
      new Request(`https://svc-feng.internal/maps/image/annotated/${encodeURIComponent(key)}`)
    )
    if (!res.ok) {
      return jsonErr(c, 502, ApiErrorCode.internal_error, `svc-feng image fetch ${res.status}`)
    }
    const bytes = await res.arrayBuffer()
    return jsonOk(c, {
      tile,
      base64: toBase64(bytes),
      contentType: res.headers.get('content-type') ?? 'image/png',
    })
  }
)
