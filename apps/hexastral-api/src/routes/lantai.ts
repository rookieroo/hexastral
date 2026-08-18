/**
 * Lantai (Flare for Notion) — HMAC configs + Notion OAuth.
 *
 * Public secret-link lives on GET /s/:id (see lantai-secret.ts).
 * Token plaintext never goes to logs; config ids are hashed to 8 hex chars.
 */

import { zValidator } from '@hono/zod-validator'
import { and, eq, isNull } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import { lantaiConfigs, lantaiConnections } from '../db/schema'
import type { AppEnv } from '../infra-types'
import { ApiErrorCode, jsonErr, jsonOk } from '../lib/api-response'
import { requireUserId } from '../lib/auth'
import {
  lantaiSlotAllowed,
  lantaiWorkspaceAllowed,
  resolveLantaiAccess,
} from '../lib/lantai-access'
import {
  type LantaiCommand,
  fieldsFromNotionProperties,
  lantaiCreateSchema,
  lantaiDatabaseIdParam,
  lantaiUpdateSchema,
  modeForTemplate,
} from '../lib/lantai-command'
import { configIdLogToken, decryptAesGcm, encryptAesGcm } from '../lib/lantai-crypto'
import { getActiveEntitlements } from '../services/entitlements'

const NOTION_VERSION = '2022-06-28'
const OAUTH_STATE_TTL = 600
const OAUTH_KV_PREFIX = 'lantai:oauth:'

export const lantaiRoutes = new Hono<AppEnv>()

function requireTokenKey(c: { env: AppEnv['Bindings'] }): string {
  const key = c.env.LANTAI_TOKEN_KEY
  if (!key) {
    throw new HTTPException(503, { message: 'Lantai token encryption is not configured' })
  }
  return key
}

function oauthRedirectUri(c: { env: AppEnv['Bindings'] }): string {
  return c.env.LANTAI_OAUTH_REDIRECT_URI ?? 'https://api.hexastral.com/api/lantai/oauth/callback'
}

function notionAuthHeader(clientId: string, clientSecret: string): string {
  const raw = `${clientId}:${clientSecret}`
  let binary = ''
  for (const byte of new TextEncoder().encode(raw)) binary += String.fromCharCode(byte)
  return `Basic ${btoa(binary)}`
}

async function lantaiKeysForUser(c: Parameters<typeof requireUserId>[0], userId: string) {
  const db = c.get('db')
  return (await getActiveEntitlements(db, userId)).map((e) => e.key)
}

// ── OAuth ──────────────────────────────────────────────────────────────────

lantaiRoutes.post('/oauth/start', async (c) => {
  const userId = requireUserId(c)
  const clientId = c.env.NOTION_CLIENT_ID
  if (!clientId) {
    return jsonErr(c, 503, ApiErrorCode.upstream_unavailable, 'Notion OAuth is not configured')
  }

  const { success } = await c.env.RATE_LIMITER.limit({ key: `lantai-oauth:${userId}` })
  if (!success) return jsonErr(c, 429, ApiErrorCode.quota_exhausted, 'Rate limited')

  const state = crypto.randomUUID()
  await c.env.GUARD_KV.put(`${OAUTH_KV_PREFIX}${state}`, userId, { expirationTtl: OAUTH_STATE_TTL })

  const redirectUri = oauthRedirectUri(c)
  const url = new URL('https://api.notion.com/v1/oauth/authorize')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('owner', 'user')
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  return jsonOk(c, { url: url.toString() })
})

lantaiRoutes.get('/oauth/callback', async (c) => {
  const err = c.req.query('error')
  const code = c.req.query('code')
  const state = c.req.query('state')
  const fail = (reason: string) =>
    c.redirect(`lantai://connect?ok=0&reason=${encodeURIComponent(reason)}`)

  if (err || !code || !state) return fail(err ?? 'missing_code')

  const userId = await c.env.GUARD_KV.get(`${OAUTH_KV_PREFIX}${state}`)
  if (!userId) return fail('expired_state')
  await c.env.GUARD_KV.delete(`${OAUTH_KV_PREFIX}${state}`)

  const clientId = c.env.NOTION_CLIENT_ID
  const clientSecret = c.env.NOTION_CLIENT_SECRET
  if (!clientId || !clientSecret) return fail('not_configured')

  const tokenRes = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: notionAuthHeader(clientId, clientSecret),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: oauthRedirectUri(c),
    }),
  })
  if (!tokenRes.ok) {
    console.warn('[lantai] oauth token exchange failed', { status: tokenRes.status })
    return fail('token_exchange')
  }

  const tokenJson: unknown = await tokenRes.json()
  const parsed = z
    .object({
      access_token: z.string().min(1),
      workspace_id: z.string().min(1),
      workspace_name: z.string().optional(),
    })
    .safeParse(tokenJson)
  if (!parsed.success) return fail('token_shape')

  let secret: string
  try {
    secret = requireTokenKey(c)
  } catch {
    return fail('not_configured')
  }

  const sealed = await encryptAesGcm(parsed.data.access_token, secret)
  const db = c.get('db')
  const access = resolveLantaiAccess(await lantaiKeysForUser(c, userId))
  const existing = await db
    .select({ id: lantaiConnections.id, workspaceId: lantaiConnections.workspaceId })
    .from(lantaiConnections)
    .where(eq(lantaiConnections.userId, userId))
    .all()

  const sameWs = existing.find((row) => row.workspaceId === parsed.data.workspace_id)
  if (!sameWs && !lantaiWorkspaceAllowed(access, existing.length)) {
    return fail('workspace_cap')
  }

  const now = new Date().toISOString()
  if (sameWs) {
    await db
      .update(lantaiConnections)
      .set({
        tokenCiphertext: sealed.ciphertext,
        tokenNonce: sealed.nonce,
        workspaceName: parsed.data.workspace_name ?? null,
        updatedAt: now,
      })
      .where(eq(lantaiConnections.id, sameWs.id))
  } else {
    await db.insert(lantaiConnections).values({
      id: crypto.randomUUID(),
      userId,
      workspaceId: parsed.data.workspace_id,
      workspaceName: parsed.data.workspace_name ?? null,
      tokenCiphertext: sealed.ciphertext,
      tokenNonce: sealed.nonce,
      createdAt: now,
      updatedAt: now,
    })
  }

  return c.redirect('lantai://connect?ok=1')
})

lantaiRoutes.get('/connection', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')
  const rows = await db
    .select({
      id: lantaiConnections.id,
      workspaceId: lantaiConnections.workspaceId,
      workspaceName: lantaiConnections.workspaceName,
      createdAt: lantaiConnections.createdAt,
    })
    .from(lantaiConnections)
    .where(eq(lantaiConnections.userId, userId))
    .all()
  return jsonOk(c, { connections: rows })
})

lantaiRoutes.delete('/connection/:id', async (c) => {
  const userId = requireUserId(c)
  const id = c.req.param('id')
  const db = c.get('db')
  const row = await db
    .select({ id: lantaiConnections.id })
    .from(lantaiConnections)
    .where(and(eq(lantaiConnections.id, id), eq(lantaiConnections.userId, userId)))
    .get()
  if (!row) return jsonErr(c, 404, ApiErrorCode.not_found, 'Connection not found')
  await db.delete(lantaiConnections).where(eq(lantaiConnections.id, id))
  return jsonOk(c, { deleted: true })
})

lantaiRoutes.get('/connections/:id/databases', async (c) => {
  const userId = requireUserId(c)
  const connectionId = c.req.param('id')
  const db = c.get('db')
  const conn = await db
    .select()
    .from(lantaiConnections)
    .where(and(eq(lantaiConnections.id, connectionId), eq(lantaiConnections.userId, userId)))
    .get()
  if (!conn) return jsonErr(c, 404, ApiErrorCode.not_found, 'Connection not found')

  const token = await decryptAesGcm(conn.tokenCiphertext, conn.tokenNonce, requireTokenKey(c))
  const searchRes = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filter: { value: 'database', property: 'object' }, page_size: 50 }),
  })
  if (!searchRes.ok) {
    console.warn('[lantai] notion search failed', { status: searchRes.status })
    return jsonErr(c, 502, ApiErrorCode.upstream_unavailable, 'Notion search failed')
  }
  const body: unknown = await searchRes.json()
  const parsed = z
    .object({
      results: z.array(
        z.object({
          id: z.string(),
          object: z.string(),
          title: z.array(z.object({ plain_text: z.string().optional() })).optional(),
        })
      ),
    })
    .safeParse(body)
  if (!parsed.success) {
    return jsonErr(c, 502, ApiErrorCode.upstream_unavailable, 'Notion search shape unexpected')
  }
  const databases = parsed.data.results
    .filter((r) => r.object === 'database')
    .map((r) => ({
      id: r.id.replace(/-/g, ''),
      title: r.title?.map((t) => t.plain_text ?? '').join('') || 'Untitled',
    }))
  return jsonOk(c, { databases })
})

lantaiRoutes.get('/connections/:id/databases/:databaseId', async (c) => {
  const userId = requireUserId(c)
  const connectionId = c.req.param('id')
  const databaseIdParsed = lantaiDatabaseIdParam.safeParse(c.req.param('databaseId'))
  if (!databaseIdParsed.success) {
    return jsonErr(c, 400, ApiErrorCode.invalid_input, 'Invalid database id')
  }
  const db = c.get('db')
  const conn = await db
    .select()
    .from(lantaiConnections)
    .where(and(eq(lantaiConnections.id, connectionId), eq(lantaiConnections.userId, userId)))
    .get()
  if (!conn) return jsonErr(c, 404, ApiErrorCode.not_found, 'Connection not found')

  const token = await decryptAesGcm(conn.tokenCiphertext, conn.tokenNonce, requireTokenKey(c))
  const hex = databaseIdParsed.data.replace(/-/g, '')
  const notionId =
    hex.length === 32
      ? `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
      : databaseIdParsed.data
  const retrieveRes = await fetch(`https://api.notion.com/v1/databases/${notionId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
    },
  })
  if (retrieveRes.status === 404) {
    return jsonErr(c, 404, ApiErrorCode.not_found, 'Database not found or not shared')
  }
  if (!retrieveRes.ok) {
    console.warn('[lantai] notion retrieve database failed', { status: retrieveRes.status })
    return jsonErr(c, 502, ApiErrorCode.upstream_unavailable, 'Notion database retrieve failed')
  }
  const body: unknown = await retrieveRes.json()
  const parsed = z
    .object({
      id: z.string(),
      title: z.array(z.object({ plain_text: z.string().optional() })).optional(),
      properties: z.record(
        z.string(),
        z.object({
          id: z.string(),
          type: z.string(),
          name: z.string().optional(),
        })
      ),
    })
    .safeParse(body)
  if (!parsed.success) {
    return jsonErr(c, 502, ApiErrorCode.upstream_unavailable, 'Notion database shape unexpected')
  }
  const title = parsed.data.title?.map((t) => t.plain_text ?? '').join('') || 'Untitled'
  return jsonOk(c, {
    id: parsed.data.id.replace(/-/g, ''),
    title,
    fields: fieldsFromNotionProperties(parsed.data.properties),
  })
})

// ── Configs ────────────────────────────────────────────────────────────────

function parseCommand(json: string): LantaiCommand {
  return lantaiCreateSchema.shape.command.parse(JSON.parse(json) as unknown)
}

lantaiRoutes.get('/configs', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')
  const rows = await db
    .select()
    .from(lantaiConfigs)
    .where(and(eq(lantaiConfigs.userId, userId), isNull(lantaiConfigs.revokedAt)))
    .all()
  return jsonOk(c, {
    configs: rows.map((row) => ({
      id: row.id,
      connectionId: row.connectionId,
      databaseId: row.databaseId,
      mode: row.mode,
      command: parseCommand(row.commandJson),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
  })
})

lantaiRoutes.post('/configs', zValidator('json', lantaiCreateSchema), async (c) => {
  const userId = requireUserId(c)
  const body = c.req.valid('json')
  const db = c.get('db')
  const access = resolveLantaiAccess(await lantaiKeysForUser(c, userId))
  const created = await db
    .select({ id: lantaiConfigs.id })
    .from(lantaiConfigs)
    .where(eq(lantaiConfigs.userId, userId))
    .all()
  if (!lantaiSlotAllowed(access, created.length)) {
    return jsonErr(c, 402, ApiErrorCode.paywall_required, 'Free slot cap reached', {
      productId: 'lantai_unlock',
      cap: created.length,
    })
  }

  const conn = await db
    .select({ id: lantaiConnections.id })
    .from(lantaiConnections)
    .where(and(eq(lantaiConnections.id, body.connectionId), eq(lantaiConnections.userId, userId)))
    .get()
  if (!conn) return jsonErr(c, 404, ApiErrorCode.not_found, 'Connection not found')

  const mode = modeForTemplate(body.command.templateId)
  if (body.command.databaseId.length === 0) {
    return jsonErr(c, 400, ApiErrorCode.invalid_input, 'databaseId is required')
  }
  if (!body.command.fields.some((f) => f.enabled)) {
    return jsonErr(c, 400, ApiErrorCode.invalid_input, 'At least one field must be enabled')
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  await db.insert(lantaiConfigs).values({
    id,
    userId,
    connectionId: body.connectionId,
    databaseId: body.command.databaseId,
    mode,
    commandJson: JSON.stringify(body.command),
    createdAt: now,
    updatedAt: now,
  })
  console.info('[lantai] config created', { cfg: await configIdLogToken(id), mode })
  return jsonOk(c, { id, mode }, 201)
})

lantaiRoutes.put('/configs/:id', zValidator('json', lantaiUpdateSchema), async (c) => {
  const userId = requireUserId(c)
  const id = c.req.param('id')
  const body = c.req.valid('json')
  const db = c.get('db')
  const row = await db
    .select()
    .from(lantaiConfigs)
    .where(
      and(
        eq(lantaiConfigs.id, id),
        eq(lantaiConfigs.userId, userId),
        isNull(lantaiConfigs.revokedAt)
      )
    )
    .get()
  if (!row) return jsonErr(c, 404, ApiErrorCode.not_found, 'Config not found')

  const access = resolveLantaiAccess(await lantaiKeysForUser(c, userId))
  if (!access.unlimitedSlots && body.command.databaseId !== row.databaseId) {
    return jsonErr(c, 402, ApiErrorCode.paywall_required, 'Free tier cannot change database', {
      productId: 'lantai_unlock',
    })
  }

  const mode = modeForTemplate(body.command.templateId)
  if (!body.command.fields.some((f) => f.enabled)) {
    return jsonErr(c, 400, ApiErrorCode.invalid_input, 'At least one field must be enabled')
  }
  const now = new Date().toISOString()
  await db
    .update(lantaiConfigs)
    .set({
      databaseId: body.command.databaseId,
      mode,
      commandJson: JSON.stringify(body.command),
      updatedAt: now,
    })
    .where(eq(lantaiConfigs.id, id))
  console.info('[lantai] config updated', { cfg: await configIdLogToken(id) })
  return jsonOk(c, { id, mode })
})

lantaiRoutes.delete('/configs/:id', async (c) => {
  const userId = requireUserId(c)
  const id = c.req.param('id')
  const db = c.get('db')
  const row = await db
    .select({ id: lantaiConfigs.id })
    .from(lantaiConfigs)
    .where(
      and(
        eq(lantaiConfigs.id, id),
        eq(lantaiConfigs.userId, userId),
        isNull(lantaiConfigs.revokedAt)
      )
    )
    .get()
  if (!row) return jsonErr(c, 404, ApiErrorCode.not_found, 'Config not found')
  await db
    .update(lantaiConfigs)
    .set({ revokedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(eq(lantaiConfigs.id, id))
  console.info('[lantai] config revoked', { cfg: await configIdLogToken(id) })
  return jsonOk(c, { revoked: true })
})

/** Not a Lantai product path — AI ingest is a separate future app. */
lantaiRoutes.post('/ai/jobs', async (c) => {
  requireUserId(c)
  return jsonErr(c, 501, ApiErrorCode.generation_failed, 'AI ingest is not part of Lantai')
})
