/**
 * Yuun Watch bearer auth — validates `Authorization: Bearer w1.<id>.<secret>`.
 * Sets `c.get('userId')` from the credential row and bumps `last_used_at`.
 */

import { and, eq, isNull } from 'drizzle-orm'
import type { MiddlewareHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { watchCredentials } from '../db/schema'
import type { AppEnv } from '../infra-types'
import { parseWatchBearerToken, sha256Hex, timingSafeEqual } from '../lib/watch-token'

export function createWatchBearerMiddleware(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const parsed = parseWatchBearerToken(c.req.header('Authorization'))
    if (!parsed) {
      throw new HTTPException(401, { message: 'Invalid watch token' })
    }

    const db = c.get('db')
    const row = await db
      .select()
      .from(watchCredentials)
      .where(and(eq(watchCredentials.id, parsed.credentialId), isNull(watchCredentials.revokedAt)))
      .get()

    if (!row) {
      throw new HTTPException(401, { message: 'Invalid watch token' })
    }

    const nowIso = new Date().toISOString()
    if (row.expiresAt <= nowIso) {
      throw new HTTPException(401, { message: 'Watch token expired' })
    }

    const secretHash = await sha256Hex(parsed.secret)
    if (!timingSafeEqual(secretHash, row.secretHash)) {
      throw new HTTPException(401, { message: 'Invalid watch token' })
    }

    c.set('userId', row.userId)

    await db
      .update(watchCredentials)
      .set({ lastUsedAt: nowIso })
      .where(eq(watchCredentials.id, row.id))

    await next()
  }
}
