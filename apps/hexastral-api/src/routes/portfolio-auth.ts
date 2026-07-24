/**
 * Portfolio satellite sign-in — both providers verify the client's identity
 * token (JWT) server-side, then create or load a unified users row + deviceSecret:
 *   POST /api/portfolio/auth/apple  — Sign in with Apple (aud = app bundle id)
 *   POST /api/portfolio/auth/google — Google Sign-In (aud = OAuth client id)
 */

import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { nanoid } from 'nanoid'
import { z } from 'zod/v4'

import { users } from '../db/schema'
import type { CloudflareBindings, ContextVariables } from '../infra-types'
import { CHAPTER_UNLOCK_DEFAULT } from '../lib/chapter-access'

const APPLE_ISSUER = 'https://appleid.apple.com'
const jwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'))

// Google ID tokens carry either issuer form; accept both.
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com']
const googleJwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))

/** Accepted Google `aud` values (OAuth client ids), parsed from the env binding. */
function googleAudiences(env: CloudflareBindings): string[] {
  return (env.GOOGLE_OAUTH_AUDIENCES ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

const portfolioAuthBodySchema = z.object({
  identityToken: z.string().min(20),
  authorizationCode: z.string().optional(),
  target_app: z.string().max(64),
})

/** Maps growth funnel / portfolio target keys → iOS bundle identifier (aud claim). */
const TARGET_TO_BUNDLE_ID: Record<string, string> = {
  // Client brand Syel (ADR-0028); opaque target_app stays `faceoracle`.
  faceoracle: 'com.hexastral.syel',
  starpalace: 'com.hexastral.starpalace',
  soulmatch: 'com.hexastral.soulmatch',
  fengshui: 'com.hexastral.kanyu',
  dreamoracle: 'com.hexastral.dreamoracle',
  eightpillars: 'com.hexastral.eightpillars',
  coincast: 'com.hexastral.yaul',
  fate: 'com.hexastral.fate',
  auspice: 'com.hexastral.yuun',
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
}>()
  .post('/apple', async (c) => {
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
    // Apple ships the `email` claim ONLY on first authorization — subsequent
    // re-auths drop it. Capture it from the verified JWT (more trustworthy than
    // a client-supplied field) on the first auth and persist; never overwrite
    // an existing email.
    let emailFromToken: string | null = null
    try {
      const { payload } = await jwtVerify(identityToken, jwks, {
        issuer: APPLE_ISSUER,
        audience,
      })
      if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
        throw new HTTPException(401, { message: 'Invalid Apple token' })
      }
      sub = payload.sub
      if (typeof payload.email === 'string' && payload.email.includes('@')) {
        emailFromToken = payload.email.trim().toLowerCase()
      }
    } catch (err) {
      if (err instanceof HTTPException) throw err
      console.warn('[portfolio-auth/apple] jwtVerify failed', err)
      throw new HTTPException(401, { message: 'Apple identity token invalid' })
    }

    const db = c.get('db')

    const existing = await db.select().from(users).where(eq(users.appleUserId, sub)).get()

    if (existing) {
      const patch: { deviceSecret?: string; email?: string; updatedAt: string } = {
        updatedAt: new Date().toISOString(),
      }
      if (!existing.deviceSecret) patch.deviceSecret = crypto.randomUUID()
      // Backfill email when Apple ships it AND we don't already have one — covers
      // the (rare) case where a user revoked + re-authorized to surface a new
      // email, and the more common case of an account created before the email
      // capture fix was deployed.
      if (!existing.email && emailFromToken) patch.email = emailFromToken
      if (patch.deviceSecret !== undefined || patch.email !== undefined) {
        await db.update(users).set(patch).where(eq(users.id, existing.id))
      }
      return c.json({
        userId: existing.id,
        deviceSecret: patch.deviceSecret ?? (existing.deviceSecret as string),
      })
    }

    const id = nanoid()
    const deviceSecret = crypto.randomUUID()
    await db.insert(users).values({
      id,
      appleUserId: sub,
      deviceSecret,
      unlockedChapterCount: CHAPTER_UNLOCK_DEFAULT,
      ...(emailFromToken ? { email: emailFromToken } : {}),
    })

    return c.json({ userId: id, deviceSecret }, 201)
  })
  .post('/google', async (c) => {
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

    const audiences = googleAudiences(c.env)
    if (audiences.length === 0) {
      // 待配置: no OAuth client ids bound — refuse rather than trust any token.
      throw new HTTPException(503, { message: 'Google sign-in not configured' })
    }

    const { identityToken } = parsed.data

    let sub: string
    try {
      const { payload } = await jwtVerify(identityToken, googleJwks, {
        issuer: GOOGLE_ISSUERS,
        audience: audiences,
      })
      if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
        throw new HTTPException(401, { message: 'Invalid Google token' })
      }
      sub = payload.sub
    } catch (err) {
      if (err instanceof HTTPException) throw err
      console.warn('[portfolio-auth/google] jwtVerify failed', err)
      throw new HTTPException(401, { message: 'Google identity token invalid' })
    }

    const db = c.get('db')

    const existing = await db.select().from(users).where(eq(users.googleUserId, sub)).get()

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
      googleUserId: sub,
      deviceSecret,
      unlockedChapterCount: CHAPTER_UNLOCK_DEFAULT,
    })

    return c.json({ userId: id, deviceSecret }, 201)
  })
