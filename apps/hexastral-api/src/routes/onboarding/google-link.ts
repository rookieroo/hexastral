/**
 * POST /api/onboarding/google-link — link a Google identity to the current
 * anonymous user. Mirror of apple-link.ts.
 *
 * HMAC-protected (the caller already has a userId + deviceSecret from
 * POST /api/user). Used by Kindred and any other flagship that ships with
 * anonymous-first onboarding and offers Google Sign-In as a recovery
 * affordance alongside Apple.
 *
 * Three outcomes (same shape apple-link.ts returns):
 *   - linked         : current user had no googleUserId → set it. Same userId.
 *   - recovered      : googleUserId already maps to ANOTHER user → return
 *                      that user's id + deviceSecret. The client overwrites
 *                      its local userId. The originally-anonymous user
 *                      becomes orphaned (reinstall path only — at this point
 *                      it has no bonds yet).
 *   - already_linked : current user has the SAME googleUserId → no-op.
 *
 * Conflicts:
 *   - 409 conflict   : current user has a different googleUserId already.
 *
 * Setup checklist for production (so the verify actually succeeds):
 *   1. Set `GOOGLE_OAUTH_AUDIENCES` on the worker (wrangler.jsonc vars). It's
 *      a comma-separated list of OAuth client ids (iOS + web).
 *   2. The client posts the ID token from `@react-native-google-signin/google-signin`
 *      (or any web Google sign-in flow); `aud` must match an entry above.
 */

import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { z } from 'zod/v4'

import { users } from '../../db/schema'
import type { AppEnv, CloudflareBindings } from '../../infra-types'
import { ApiErrorCode, jsonErr, jsonOk } from '../../lib/api-response'
import { requireUserId } from '../../lib/auth'

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

const googleLinkSchema = z.object({
  identityToken: z.string().min(20),
})

export const onboardingGoogleLinkRoutes = new Hono<AppEnv>().post('/', async (c) => {
  const userId = requireUserId(c)

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return jsonErr(c, 400, ApiErrorCode.invalid_input, 'Expected JSON body')
  }

  const parsed = googleLinkSchema.safeParse(body)
  if (!parsed.success) {
    return jsonErr(c, 400, ApiErrorCode.invalid_input, 'Invalid payload', {
      issues: parsed.error.issues,
    })
  }

  const audiences = googleAudiences(c.env)
  if (audiences.length === 0) {
    // 待配置: no OAuth client ids bound — refuse rather than trust any token.
    // Surfaces a clear server-side error if the env var isn't set yet.
    return jsonErr(
      c,
      503,
      ApiErrorCode.upstream_unavailable,
      'Google sign-in is not configured on this server'
    )
  }

  const { identityToken } = parsed.data

  let sub: string
  let googleEmail: string | null = null
  let googleName: string | null = null
  try {
    const { payload } = await jwtVerify(identityToken, googleJwks, {
      issuer: GOOGLE_ISSUERS,
      audience: audiences,
    })
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      return jsonErr(c, 401, ApiErrorCode.unauthorized, 'Invalid Google token')
    }
    sub = payload.sub
    // Google always sends email + name in the ID token when the openid + email
    // + profile scopes are requested (which the client lib does by default).
    if (typeof payload.email === 'string' && payload.email.includes('@')) {
      googleEmail = payload.email.toLowerCase()
    }
    if (typeof payload.name === 'string' && payload.name.length > 0) {
      googleName = payload.name
    }
  } catch (err) {
    console.warn('[onboarding/google-link] jwtVerify failed', err)
    return jsonErr(c, 401, ApiErrorCode.unauthorized, 'Google identity token invalid')
  }

  const db = c.get('db')

  const currentUser = await db.select().from(users).where(eq(users.id, userId)).get()
  if (!currentUser) {
    return jsonErr(c, 404, ApiErrorCode.not_found, 'Current user not found')
  }

  // Already linked to the same Google ID — no-op.
  if (currentUser.googleUserId === sub) {
    return jsonOk(c, { outcome: 'already_linked', userId: currentUser.id })
  }

  // Currently linked to a different Google ID — refuse.
  if (currentUser.googleUserId && currentUser.googleUserId !== sub) {
    return jsonErr(
      c,
      409,
      ApiErrorCode.conflict,
      'This account is already linked to a different Google account',
      { existingGoogleLink: true }
    )
  }

  // Is this Google ID already mapped to another user?
  const existing = await db.select().from(users).where(eq(users.googleUserId, sub)).get()
  if (existing && existing.id !== userId) {
    // Recovery path — return the original user's id + secret so the client
    // can swap its local identity. The current (anonymous) user remains in
    // the table but is orphaned. No data migration: at this moment the
    // anonymous user has no bonds (sign-in is the FIRST action the user takes).
    const recoveryUpdates: Partial<typeof users.$inferInsert> = {}
    let deviceSecret = existing.deviceSecret
    if (!deviceSecret) {
      deviceSecret = crypto.randomUUID()
      recoveryUpdates.deviceSecret = deviceSecret
    }
    if (googleEmail && !existing.email) {
      recoveryUpdates.email = googleEmail
    }
    if (googleName && !existing.name) {
      recoveryUpdates.name = googleName
    }
    if (Object.keys(recoveryUpdates).length > 0) {
      recoveryUpdates.updatedAt = new Date().toISOString()
      await db.update(users).set(recoveryUpdates).where(eq(users.id, existing.id))
    }
    return jsonOk(c, {
      outcome: 'recovered',
      userId: existing.id,
      deviceSecret,
    })
  }

  // First-time link — attach googleUserId to the current user.
  const updates: Partial<typeof users.$inferInsert> = {
    googleUserId: sub,
    updatedAt: new Date().toISOString(),
  }
  // Don't clobber an explicit name / email the user (or Apple) already set —
  // only fill blanks. Google sends both on every successful sign-in.
  if (googleName && !currentUser.name) {
    updates.name = googleName
  }
  if (googleEmail && !currentUser.email) {
    updates.email = googleEmail
  }

  await db.update(users).set(updates).where(eq(users.id, userId))

  return jsonOk(c, { outcome: 'linked', userId })
})
