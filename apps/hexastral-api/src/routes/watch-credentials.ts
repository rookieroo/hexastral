/**
 * Yuun Watch credentials — mint / list / revoke scoped bearer tokens.
 *
 *   POST   /api/watch/credentials       — create (HMAC)
 *   GET    /api/watch/credentials       — list non-revoked (HMAC)
 *   DELETE /api/watch/credentials/:id   — revoke (HMAC)
 */

import { and, eq, isNull } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { nanoid } from 'nanoid'
import { watchCredentials } from '../db/schema'
import type { AppEnv } from '../infra-types'
import { requireUserId } from '../lib/auth'
import { formatWatchToken, generateWatchSecret, sha256Hex } from '../lib/watch-token'

const DEFAULT_SCOPE = 'auspice:watch:read'
const DEFAULT_TTL_DAYS = 180

function expiresAtFromNow(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}

export const watchCredentialsRoutes = new Hono<AppEnv>()
  .post('/', async (c) => {
    const userId = requireUserId(c)
    const db = c.get('db')

    const id = nanoid()
    const secret = generateWatchSecret()
    const secretHash = await sha256Hex(secret)
    const expiresAt = expiresAtFromNow(DEFAULT_TTL_DAYS)
    const createdAt = new Date().toISOString()

    await db.insert(watchCredentials).values({
      id,
      userId,
      secretHash,
      scope: DEFAULT_SCOPE,
      expiresAt,
      createdAt,
    })

    return c.json(
      {
        id,
        token: formatWatchToken(id, secret),
        expiresAt,
      },
      201
    )
  })

  .get('/', async (c) => {
    const userId = requireUserId(c)
    const db = c.get('db')

    const rows = await db
      .select({
        id: watchCredentials.id,
        scope: watchCredentials.scope,
        expiresAt: watchCredentials.expiresAt,
        lastUsedAt: watchCredentials.lastUsedAt,
        createdAt: watchCredentials.createdAt,
      })
      .from(watchCredentials)
      .where(and(eq(watchCredentials.userId, userId), isNull(watchCredentials.revokedAt)))

    return c.json({ data: rows })
  })

  .delete('/:id', async (c) => {
    const userId = requireUserId(c)
    const credentialId = c.req.param('id')
    const db = c.get('db')

    const row = await db
      .select({ id: watchCredentials.id })
      .from(watchCredentials)
      .where(
        and(
          eq(watchCredentials.id, credentialId),
          eq(watchCredentials.userId, userId),
          isNull(watchCredentials.revokedAt)
        )
      )
      .get()

    if (!row) {
      throw new HTTPException(404, { message: 'Credential not found' })
    }

    await db
      .update(watchCredentials)
      .set({ revokedAt: new Date().toISOString() })
      .where(eq(watchCredentials.id, credentialId))

    return c.json({ ok: true })
  })
