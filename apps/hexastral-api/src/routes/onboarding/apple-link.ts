/**
 * POST /api/onboarding/apple-link — link an Apple ID to the current anonymous user.
 *
 * HMAC-protected (the caller already has a userId + deviceSecret from
 * POST /api/user). Used by Kindred, Fēng, and other flagships that ship with
 * anonymous-first onboarding and offer Apple Sign In as a recovery affordance.
 *
 * Three outcomes:
 *   - linked       : current user had no appleUserId → set it. Same userId.
 *   - recovered    : appleUserId is already mapped to ANOTHER user → return
 *                    that user's id + deviceSecret. The client overwrites its
 *                    local userId. The originally-anonymous user becomes
 *                    orphaned (no bonds yet — only happens on reinstall).
 *   - already_linked : current user has the SAME appleUserId already → no-op.
 *
 * Conflicts:
 *   - 409 conflict : current user has a different appleUserId already.
 */

import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { z } from 'zod/v4'

import { users } from '../../db/schema'
import type { AppEnv } from '../../infra-types'
import { ApiErrorCode, jsonErr, jsonOk } from '../../lib/api-response'
import { requireUserId } from '../../lib/auth'

const APPLE_ISSUER = 'https://appleid.apple.com'
const jwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'))

const VALID_AUDIENCES = new Set<string>([
  'com.hexastral.fate',
  'com.hexastral.kindred',
  'com.hexastral.feng',
])

const appleLinkSchema = z.object({
  identityToken: z.string().min(20),
  /** Optional display name from `expo-apple-authentication` (only present on the very first sign-in per Apple). */
  fullName: z.string().max(120).optional(),
})

export const onboardingAppleLinkRoutes = new Hono<AppEnv>().post('/', async (c) => {
  const userId = requireUserId(c)

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return jsonErr(c, 400, ApiErrorCode.invalid_input, 'Expected JSON body')
  }

  const parsed = appleLinkSchema.safeParse(body)
  if (!parsed.success) {
    return jsonErr(c, 400, ApiErrorCode.invalid_input, 'Invalid payload', {
      issues: parsed.error.issues,
    })
  }

  const { identityToken, fullName } = parsed.data

  let sub: string
  let appleEmail: string | null = null
  try {
    const { payload } = await jwtVerify(identityToken, jwks, {
      issuer: APPLE_ISSUER,
    })
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      return jsonErr(c, 401, ApiErrorCode.unauthorized, 'Invalid Apple token')
    }
    const aud = typeof payload.aud === 'string' ? payload.aud : null
    if (!aud || !VALID_AUDIENCES.has(aud)) {
      return jsonErr(c, 401, ApiErrorCode.unauthorized, 'Unsupported audience')
    }
    sub = payload.sub
    // Apple includes `email` in the identity token on first authorization per
    // device, and on every authorization for non-private-relay emails. We
    // capture it so the Y1 viral-invite flow can credit either an explicitly
    // entered email or an Apple-bound one. Private-relay (@privaterelay.appleid.com)
    // emails are valid for delivery and treated the same as any other.
    if (typeof payload.email === 'string' && payload.email.includes('@')) {
      appleEmail = payload.email.toLowerCase()
    }
  } catch (err) {
    console.warn('[onboarding/apple-link] jwtVerify failed', err)
    return jsonErr(c, 401, ApiErrorCode.unauthorized, 'Apple identity token invalid')
  }

  const db = c.get('db')

  const currentUser = await db.select().from(users).where(eq(users.id, userId)).get()
  if (!currentUser) {
    return jsonErr(c, 404, ApiErrorCode.not_found, 'Current user not found')
  }

  // Already linked to the same Apple ID — no-op.
  if (currentUser.appleUserId === sub) {
    return jsonOk(c, { outcome: 'already_linked', userId: currentUser.id })
  }

  // Currently linked to a different Apple ID — refuse.
  if (currentUser.appleUserId && currentUser.appleUserId !== sub) {
    return jsonErr(
      c,
      409,
      ApiErrorCode.conflict,
      'This account is already linked to a different Apple ID',
      { existingAppleLink: true }
    )
  }

  // Is this Apple ID already mapped to another user?
  const existing = await db.select().from(users).where(eq(users.appleUserId, sub)).get()
  if (existing && existing.id !== userId) {
    // Recovery path — return the original user's id + secret so the client
    // can swap its local identity. The current (anonymous) user remains in the
    // table but is orphaned. No data migration: at this moment the anonymous
    // user has no bonds (Apple Sign In is the FIRST action the user takes).
    const recoveryUpdates: Partial<typeof users.$inferInsert> = {}
    let deviceSecret = existing.deviceSecret
    if (!deviceSecret) {
      // Defensive: legacy users may lack a deviceSecret. Issue one now.
      deviceSecret = crypto.randomUUID()
      recoveryUpdates.deviceSecret = deviceSecret
    }
    // Backfill email if the recovered user has none and Apple gave us one.
    if (appleEmail && !existing.email) {
      recoveryUpdates.email = appleEmail
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

  // First-time link — attach appleUserId to the current user.
  const updates: Partial<typeof users.$inferInsert> = {
    appleUserId: sub,
    updatedAt: new Date().toISOString(),
  }
  // Apple includes fullName ONLY on first authorization per device; if the user
  // has no name yet and we got one, persist it.
  if (fullName && !currentUser.name) {
    updates.name = fullName
  }
  // Same idea for email — Apple provides it on first authorization (and on
  // every authorization for non-relay addresses). Don't clobber an explicit
  // email the user already typed in elsewhere.
  if (appleEmail && !currentUser.email) {
    updates.email = appleEmail
  }

  await db.update(users).set(updates).where(eq(users.id, userId))

  return jsonOk(c, { outcome: 'linked', userId })
})
