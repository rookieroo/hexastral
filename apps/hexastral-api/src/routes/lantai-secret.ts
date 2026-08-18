/**
 * Public secret-link for the fixed-name Lantai shortcut.
 *
 * GET /s/:id — UUID is the capability; revoked configs 404.
 * AI mode never returns a Notion token.
 */

import { and, eq, isNull } from 'drizzle-orm'
import { Hono } from 'hono'
import { lantaiConfigs, lantaiConnections } from '../db/schema'
import type { AppEnv } from '../infra-types'
import { ApiErrorCode, jsonErr, jsonOk } from '../lib/api-response'
import { lantaiCreateSchema } from '../lib/lantai-command'
import { configIdLogToken, decryptAesGcm } from '../lib/lantai-crypto'
import { buildSecretLinkPayload } from '../lib/lantai-secret-link'

export const lantaiSecretRoutes = new Hono<AppEnv>()

lantaiSecretRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  if (!uuid) return jsonErr(c, 404, ApiErrorCode.not_found, 'Config not found')

  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const { success } = await c.env.RATE_LIMITER.limit({ key: `lantai-s:${ip}:${id}` })
  if (!success) return jsonErr(c, 429, ApiErrorCode.quota_exhausted, 'Rate limited')

  const db = c.get('db')
  const row = await db
    .select()
    .from(lantaiConfigs)
    .where(and(eq(lantaiConfigs.id, id), isNull(lantaiConfigs.revokedAt)))
    .get()
  if (!row) return jsonErr(c, 404, ApiErrorCode.not_found, 'Config not found')

  const command = lantaiCreateSchema.shape.command.parse(JSON.parse(row.commandJson) as unknown)
  let notionToken: string | null = null
  if (row.mode === 'manual') {
    const key = c.env.LANTAI_TOKEN_KEY
    if (!key) {
      return jsonErr(
        c,
        503,
        ApiErrorCode.upstream_unavailable,
        'Lantai token encryption is not configured'
      )
    }
    const conn = await db
      .select()
      .from(lantaiConnections)
      .where(eq(lantaiConnections.id, row.connectionId))
      .get()
    if (!conn) return jsonErr(c, 404, ApiErrorCode.not_found, 'Config not found')
    notionToken = await decryptAesGcm(conn.tokenCiphertext, conn.tokenNonce, key)
  }

  console.info('[lantai] secret-link', { cfg: await configIdLogToken(id), mode: row.mode })
  return jsonOk(c, buildSecretLinkPayload({ id, mode: row.mode, command, notionToken }))
})
