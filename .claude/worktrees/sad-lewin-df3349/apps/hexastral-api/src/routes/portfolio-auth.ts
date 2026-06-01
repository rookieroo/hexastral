/**
 * POST /api/portfolio/auth/apple — Sign in with Apple for portfolio satellite apps.
 * Verifies identityToken (JWT) from Apple, then creates or loads unified users row + deviceSecret.
 */

import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { nanoid } from 'nanoid'
import { z } from 'zod/v4'

import { users } from '../db/schema'
import type { CloudflareBindings, ContextVariables } from '../infra-types'

const APPLE_ISSUER = 'https://appleid.apple.com'
const jwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'))

const portfolioAuthBodySchema = z.object({
  identityToken: z.string().min(20),
  authorizationCode: z.string().optional(),
  target_app: z.string().max(64),
})

/** Maps growth funnel / portfolio target keys → iOS bundle identifier (aud claim). */
const TARGET_TO_BUNDLE_ID: Record<string, string> = {
  faceoracle: 'com.hexastral.faceoracle',
  starpalace: 'com.hexastral.starpalace',
  soulmatch: 'com.hexastral.soulmatch',
  fengshui: 'com.hexastral.fengshui',
  dreamoracle: 'com.hexastral.dreamoracle',
  eightpillars: 'com.hexastral.eightpillars',
  coincast: 'com.hexastral.coincast',
}

function audienceForTarget(targetApp: string): string {
  const bundleId = TARGET_TO_BUNDLE_ID[targetApp]
  if (!bundleId) {
    throw new HTTPException(422, { message: 'Unknown target_app' })
  }
  return bundleId
}

export const portfolioAuthRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: ContextVariables
}>().post('/apple', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw new HTTPException(422, { message: 'Expected JSON body' })
  }

  const parsed = portfolioAuthBodySchema.safeParse(body)
  if (!parsed.success) {
    throw new HTTPException(422, { message: 'Invalid payload' })
  }

  const { identityToken, target_app } = parsed.data
  const audience = audienceForTarget(target_app)

  let sub: string
  try {
    const { payload } = await jwtVerify(identityToken, jwks, {
      issuer: APPLE_ISSUER,
      audience,
    })
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new HTTPException(401, { message: 'Invalid Apple token' })
    }
    sub = payload.sub
  } catch (err) {
    if (err instanceof HTTPException) throw err
    console.warn('[portfolio-auth/apple] jwtVerify failed', err)
    throw new HTTPException(401, { message: 'Apple identity token invalid' })
  }

  const db = c.get('db')

  const existing = await db.select().from(users).where(eq(users.appleUserId, sub)).get()

  if (existing) {
    if (!existing.deviceSecret) {
      const deviceSecret = crypto.randomUUID()
      await db
        .update(users)
        .set({ deviceSecret, updatedAt: new Date().toISOString() })
        .where(eq(users.id, existing.id))
      return c.json({ userId: existing.id, deviceSecret })
    }
    return c.json({ userId: existing.id, deviceSecret: existing.deviceSecret })
  }

  const id = nanoid()
  const deviceSecret = crypto.randomUUID()
  await db.insert(users).values({
    id,
    appleUserId: sub,
    deviceSecret,
  })

  return c.json({ userId: id, deviceSecret }, 201)
})
