/**
 * /api/bonds — 关系图谱 CRUD (缘·Bonds)
 *
 * 双模式: Solo (默念) + Resonance (共振)
 *
 * Solo:     A 输入 B 的生辰 → SVC_ASTRO 合盘 → 私密 reading (Pro/IAP required)
 * Resonance: A 发邮件邀请 → B 输入生辰 → 双向 bond + 双向 reading (3 free for viral growth)
 *
 * Bond limits: Free ≤ 3 (Resonance only), Pro/Premium = unlimited
 */

import { dayGanZhi, getFourPillars } from '@zhop/astro-core/ganzhi'
import { calculateDailySynastry } from '@zhop/astro-core/synastry'
import { and, eq, inArray, ne, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import * as schemaAll from '../db/schema'
import {
  bondInviteCredits,
  bondInvitations,
  pairReadings,
  sharedReports,
  userBonds,
  users,
} from '../db/schema'
import type { AppDb, AppEnv, CloudflareBindings } from '../infra-types'
import { checkReadingAccess, isProUser } from '../lib/access-check'
import { alertAdmin } from '../lib/admin-alert'
import { callAstro } from '../lib/astro-client'
import { requireUserId } from '../lib/auth'
import { logEvent } from '../lib/event-log'
import { sendPushEvent } from '../lib/push'
import { mailerClient } from '../lib/service-clients'
import { solarDateSchema } from '../lib/validation'
import { getBondInviteCreditStatus } from '../services/quota'

/** Convert shichen timeIndex (0-12) to a representative 24h hour for getFourPillars */
function timeIndexToHour(timeIndex: number): number {
  if (timeIndex === 0) return 0
  if (timeIndex === 12) return 23
  return timeIndex * 2 - 1
}

/** Parse "YYYY-M-D" solarDate string + timeIndex → DateTimeInput parts */
function parseSolarParts(
  solarDate: string,
  timeIndex: number
): { year: number; month: number; day: number; hour: number } | null {
  const parts = solarDate.split('-')
  if (parts.length < 3) return null
  const year = Number.parseInt(parts[0]!, 10)
  const month = Number.parseInt(parts[1]!, 10)
  const day = Number.parseInt(parts[2]!, 10)
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null
  return { year, month, day, hour: timeIndexToHour(timeIndex) }
}

export const bondRoutes = new Hono<AppEnv>()

const FREE_BOND_LIMIT = 3
const INVITATION_TTL_DAYS = 7

// ── Schemas ──────────────────────────────────────────────────

const personBirthSchema = z.object({
  solarDate: solarDateSchema,
  timeIndex: z.int().min(0).max(12),
  gender: z.enum(['男', '女']),
  city: z.string().optional(),
})

const soloCreateSchema = z.object({
  targetName: z.string().min(1).max(50),
  relationshipLabel: z.string().min(1).max(30),
  targetBirth: personBirthSchema,
  language: z.string().optional().default('zh-CN'),
})

const resonanceInviteSchema = z.object({
  targetEmail: z.string().email().max(254),
  targetName: z.string().min(1).max(50),
  relationshipLabel: z.string().min(1).max(30),
  message: z.string().max(500).optional(),
})

const respondSchema = z.object({
  action: z.enum(['accept', 'decline']),
  birthData: personBirthSchema.optional(),
  language: z.string().optional().default('zh-CN'),
})

const updateBondSchema = z.object({
  targetName: z.string().min(1).max(50).optional(),
  relationshipLabel: z.string().min(1).max(30).optional(),
})

bondRoutes.get('/credits', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')
  const credits = await getBondInviteCreditStatus(db, userId)
  return c.json({ data: credits })
})

// ── Helpers ──────────────────────────────────────────────────

function expiresAt(): string {
  const d = new Date()
  d.setDate(d.getDate() + INVITATION_TTL_DAYS)
  return d.toISOString()
}

/** Generate a 12-char URL-safe alphanumeric slug for share links */
function generateShareId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const array = new Uint8Array(12)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => chars[b % 62] ?? 'a').join('')
}

/** Check bond limit for free users */
async function checkBondLimit(db: AppDb, userId: string): Promise<void> {
  const user = await db
    .select({ subscriptionStatus: users.subscriptionStatus })
    .from(users)
    .where(eq(users.id, userId))
    .get()
  if (!user) throw new HTTPException(404, { message: 'User not found' })

  const isPro = isProUser(user)
  if (isPro) return

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userBonds)
    .where(and(eq(userBonds.ownerId, userId), ne(userBonds.status, 'removed')))

  if ((countRow?.count ?? 0) >= FREE_BOND_LIMIT) {
    throw new HTTPException(403, {
      message: `Free users limited to ${FREE_BOND_LIMIT} bonds. Upgrade to Pro for unlimited.`,
    })
  }
}

/** Get user with email + birth data for pair reading */
async function getUserForHehun(db: AppDb, userId: string) {
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      birthSolarDate: users.birthSolarDate,
      birthTimeIndex: users.birthTimeIndex,
      birthGender: users.birthGender,
      birthCity: users.birthCity,
      subscriptionStatus: users.subscriptionStatus,
      locale: users.locale,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get()
}

// ── POST /solo — Solo 模式: 默念合盘 ────────────────────────

bondRoutes.post('/solo', async (c) => {
  const userId = requireUserId(c)

  const { success: rlOk } = await c.env.RATE_LIMITER.limit({ key: `bond:${userId}` })
  if (!rlOk) throw new HTTPException(429, { message: 'Too many requests' })

  const body = await c.req.json()
  const input = soloCreateSchema.parse(body)
  const db = c.get('db')

  // Bond limit check
  await checkBondLimit(db, userId)

  // Access check — Pro quota or single IAP required
  const access = await checkReadingAccess(db, userId, 'compatibility', {
    allowBondInviteCredit: false,
  })
  if (!access.granted) {
    return c.json(
      {
        error: access.reason,
        iapProductId: access.iapProductId,
        price: access.price,
      },
      403
    )
  }

  // Get user birth data for person A
  const user = await getUserForHehun(db, userId)
  if (!user) throw new HTTPException(404, { message: 'User not found' })
  if (!user.birthSolarDate || user.birthTimeIndex == null || !user.birthGender) {
    throw new HTTPException(400, { message: 'Complete your birth info before creating bonds' })
  }

  // Call SVC_ASTRO hehun/compute
  const isPro = isProUser(user)

  // Map iOS preset label → relationshipCategory enum; freetext → customRelationshipLabel
  const PRESET_CATEGORIES = new Set([
    'spouse',
    'partner',
    'parent',
    'child',
    'sibling',
    'friend',
    'colleague',
    'boss',
  ])
  const isPreset = PRESET_CATEGORIES.has(input.relationshipLabel)
  const derivedCategory = isPreset
    ? (input.relationshipLabel as
        | 'spouse'
        | 'partner'
        | 'parent'
        | 'child'
        | 'sibling'
        | 'friend'
        | 'colleague'
        | 'boss')
    : undefined
  const derivedCustomLabel = isPreset ? undefined : input.relationshipLabel

  const hehunPayload = {
    personA: {
      solarDate: user.birthSolarDate,
      timeIndex: user.birthTimeIndex,
      gender: user.birthGender,
      name: user.name,
    },
    personB: {
      solarDate: input.targetBirth.solarDate,
      timeIndex: input.targetBirth.timeIndex,
      gender: input.targetBirth.gender,
      name: input.targetName,
    },
    userId,
    isPro,
    language: input.language,
    relationshipCategory: derivedCategory,
    customRelationshipLabel: derivedCustomLabel,
  }

  const { result, interpretation } = await callAstro<{
    result: {
      compatibility: Record<string, unknown>
      personA: Record<string, unknown>
      personB: Record<string, unknown>
    }
    interpretation: Record<string, string>
  }>(c.env.SVC_ASTRO, '/pair/compute', hehunPayload)

  // Save hehun reading
  const readingId = crypto.randomUUID()
  const bondId = crypto.randomUUID()

  await db.batch([
    db.insert(pairReadings).values({
      id: readingId,
      userId,
      personASolarDate: user.birthSolarDate,
      personATimeIndex: user.birthTimeIndex,
      personAGender: user.birthGender,
      personAName: user.name ?? null,
      personBSolarDate: input.targetBirth.solarDate,
      personBTimeIndex: input.targetBirth.timeIndex,
      personBGender: input.targetBirth.gender,
      personBName: input.targetName,
      score: result.compatibility.score as number,
      grade: result.compatibility.grade as string,
      archetypeName: (interpretation as Record<string, string>).archetypeName ?? null,
      archetypeTagline: (interpretation as Record<string, string>).archetypeTagline ?? null,
      archetypeCategory:
        ((interpretation as Record<string, string>).archetypeCategory as
          | 'harmony'
          | 'tension'
          | 'growth'
          | 'karmic'
          | 'volatile'
          | undefined) ?? null,
      hookDimension:
        ((interpretation as Record<string, string>).hookDimension as
          | 'long_term'
          | 'communication'
          | 'attraction'
          | 'emotional'
          | undefined) ?? null,
      relationshipCategory: derivedCategory ?? null,
      customRelationshipLabel: derivedCustomLabel ?? null,
      compatibilityData: JSON.stringify(result.compatibility),
      interpretation: JSON.stringify(interpretation),
    }),
    db.insert(userBonds).values({
      id: bondId,
      ownerId: userId,
      targetName: input.targetName,
      relationshipLabel: input.relationshipLabel,
      mode: 'solo',
      hehunReadingId: readingId,
      targetBirthSolarDate: input.targetBirth.solarDate,
      targetBirthTimeIndex: input.targetBirth.timeIndex,
      targetBirthGender: input.targetBirth.gender,
      targetBirthCity: input.targetBirth.city ?? null,
      unlockedDimensions: '4',
      status: 'active',
    }),
  ])

  c.executionCtx.waitUntil(
    logEvent(db, userId, 'bond_create', {
      bondId,
      readingId,
      mode: 'solo',
      label: input.relationshipLabel,
    })
  )

  return c.json(
    {
      data: {
        bondId,
        readingId,
        mode: 'solo',
        score: result.compatibility.score,
        grade: result.compatibility.grade,
        compatibility: result.compatibility,
        interpretation,
      },
    },
    201
  )
})

// ── POST /invite — Resonance 模式: 邮件邀请 ─────────────────

bondRoutes.post('/invite', async (c) => {
  const userId = requireUserId(c)

  const { success: rlOk } = await c.env.RATE_LIMITER.limit({ key: `bond_invite:${userId}` })
  if (!rlOk) throw new HTTPException(429, { message: 'Too many invitations' })

  const body = await c.req.json()
  const input = resonanceInviteSchema.parse(body)
  const db = c.get('db')

  // Bond limit check
  await checkBondLimit(db, userId)

  // Validate inviter
  const user = await getUserForHehun(db, userId)
  if (!user) throw new HTTPException(404, { message: 'User not found' })

  // Must have email to use resonance
  if (!user.email) {
    throw new HTTPException(400, {
      message: 'Link your email in Settings before sending invitations',
    })
  }

  // Must have birth data
  if (!user.birthSolarDate || user.birthTimeIndex == null || !user.birthGender) {
    throw new HTTPException(400, { message: 'Complete your birth info before creating bonds' })
  }

  // Cannot invite yourself
  if (input.targetEmail.toLowerCase() === user.email.toLowerCase()) {
    throw new HTTPException(400, { message: 'Cannot invite yourself' })
  }

  // Check no pending invitation to same email
  const existing = await db
    .select({ id: bondInvitations.id })
    .from(bondInvitations)
    .where(
      and(
        eq(bondInvitations.inviterUserId, userId),
        eq(bondInvitations.targetEmail, input.targetEmail.toLowerCase()),
        eq(bondInvitations.status, 'pending')
      )
    )
    .get()
  if (existing) {
    throw new HTTPException(409, { message: 'Pending invitation already exists for this email' })
  }

  // Create bond + invitation
  const bondId = crypto.randomUUID()
  const invitationId = crypto.randomUUID()
  // High-entropy token for URL: 32 chars alphanumeric
  const token =
    crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8)

  await db.batch([
    db.insert(userBonds).values({
      id: bondId,
      ownerId: userId,
      targetName: input.targetName,
      relationshipLabel: input.relationshipLabel,
      mode: 'resonance',
      invitationId,
      status: 'pending_invite',
    }),
    db.insert(bondInvitations).values({
      id: invitationId,
      bondId,
      inviterUserId: userId,
      targetEmail: input.targetEmail.toLowerCase(),
      token,
      status: 'pending',
      message: input.message ?? null,
      expiresAt: expiresAt(),
    }),
  ])

  // Send invitation email via SVC_MAILER
  const inviterName = user.name ?? 'Someone'
  const resonateUrl = `https://hexastral.com/resonate/${token}`

  const html = buildInvitationEmailHtml({
    inviterName,
    relationshipLabel: input.relationshipLabel,
    message: input.message,
    resonateUrl,
    locale: user.locale ?? 'zh',
  })

  try {
    await mailerClient.post(c.env.SVC_MAILER, '/send', {
      to: input.targetEmail.toLowerCase(),
      subject: `${inviterName} wants to discover your cosmic connection · HexAstral`,
      html,
      replyTo: user.email,
    })
  } catch {
    throw new HTTPException(502, { message: 'Failed to send invitation email' })
  }

  c.executionCtx.waitUntil(
    logEvent(db, userId, 'bond_create', {
      bondId,
      invitationId,
      mode: 'resonance',
      label: input.relationshipLabel,
      targetEmail: input.targetEmail.toLowerCase(),
    })
  )

  return c.json(
    {
      data: { bondId, invitationId, status: 'pending_invite', token },
    },
    201
  )
})

// ── GET /invite/:token/info — Public: invitation details ────

bondRoutes.get('/invite/:token/info', async (c) => {
  const token = c.req.param('token')
  const db = c.get('db')

  const invitation = await db
    .select({
      id: bondInvitations.id,
      bondId: bondInvitations.bondId,
      inviterUserId: bondInvitations.inviterUserId,
      status: bondInvitations.status,
      message: bondInvitations.message,
      expiresAt: bondInvitations.expiresAt,
    })
    .from(bondInvitations)
    .where(eq(bondInvitations.token, token))
    .get()

  if (!invitation) throw new HTTPException(404, { message: 'Invitation not found' })

  // Check expiry
  if (invitation.status === 'pending' && new Date(invitation.expiresAt) < new Date()) {
    // Mark expired (lazy expiry)
    await expireInvitation(db, invitation.id, invitation.bondId, invitation.inviterUserId, c)
    throw new HTTPException(410, { message: 'Invitation has expired' })
  }

  if (invitation.status !== 'pending') {
    throw new HTTPException(410, { message: `Invitation already ${invitation.status}` })
  }

  // Get bond + inviter info (no sensitive data)
  const bond = await db
    .select({
      targetName: userBonds.targetName,
      relationshipLabel: userBonds.relationshipLabel,
      hehunReadingId: userBonds.hehunReadingId,
    })
    .from(userBonds)
    .where(eq(userBonds.id, invitation.bondId))
    .get()

  const [inviter, reading] = await Promise.all([
    db
      .select({ name: users.name, avatarKey: users.avatarKey })
      .from(users)
      .where(eq(users.id, invitation.inviterUserId))
      .get(),
    bond?.hehunReadingId
      ? db
          .select({
            archetypeName: pairReadings.archetypeName,
            archetypeTagline: pairReadings.archetypeTagline,
            archetypeCategory: pairReadings.archetypeCategory,
          })
          .from(pairReadings)
          .where(eq(pairReadings.id, bond.hehunReadingId))
          .get()
      : null,
  ])

  return c.json({
    data: {
      invitationId: invitation.id,
      inviterName: inviter?.name ?? 'Someone',
      inviterAvatarUrl: inviter?.avatarKey 
        ? `${new URL(c.req.url).origin}/api/media/public/${inviter.avatarKey}` 
        : null,
      relationshipLabel: bond?.relationshipLabel ?? '',
      targetName: bond?.targetName ?? '',
      message: invitation.message,
      expiresAt: invitation.expiresAt,
      archetypeName: reading?.archetypeName ?? null,
      archetypeTagline: reading?.archetypeTagline ?? null,
      archetypeCategory: reading?.archetypeCategory ?? null,
    },
  })
})

// ── GET /invite/:token/teaser — public preview shown to B after respond ─────
//
// Returns the 3 quotable lines + score B should see on the web teaser page
// (/yuan/invite/[token]/teaser) to drive App Store download. Public — no
// auth required because B has the token in the URL.
//
// Differs from /info: /info is BEFORE B responds (no reading exists yet);
// /teaser is AFTER respond (reading has been generated). Both are token-
// addressed for stateless web rendering.

bondRoutes.get('/invite/:token/teaser', async (c) => {
  const token = c.req.param('token')
  const db = c.get('db')

  const invitation = await db
    .select({
      bondId: bondInvitations.bondId,
      inviterUserId: bondInvitations.inviterUserId,
      status: bondInvitations.status,
    })
    .from(bondInvitations)
    .where(eq(bondInvitations.token, token))
    .get()

  if (!invitation) throw new HTTPException(404, { message: 'Invitation not found' })
  if (invitation.status === 'declined' || invitation.status === 'expired') {
    throw new HTTPException(410, { message: `Invitation already ${invitation.status}` })
  }

  const bond = await db
    .select({
      targetName: userBonds.targetName,
      hehunReadingId: userBonds.hehunReadingId,
    })
    .from(userBonds)
    .where(eq(userBonds.id, invitation.bondId))
    .get()

  if (!bond) throw new HTTPException(404, { message: 'Bond not found' })

  const [inviter, reading] = await Promise.all([
    db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, invitation.inviterUserId))
      .get(),
    bond.hehunReadingId
      ? db
          .select({
            score: pairReadings.score,
            grade: pairReadings.grade,
            archetypeName: pairReadings.archetypeName,
            archetypeTagline: pairReadings.archetypeTagline,
            compatibilityData: pairReadings.compatibilityData,
          })
          .from(pairReadings)
          .where(eq(pairReadings.id, bond.hehunReadingId))
          .get()
      : null,
  ])

  // Extract up to 3 "golden lines" from the reading. Priority order:
  //   1. archetypeTagline (always present once reading exists)
  //   2. compatibilityData.highlights[0] (a quotable interpretation snippet)
  //   3. archetypeName (fallback flavor)
  const goldenLines: string[] = []
  if (reading?.archetypeTagline) goldenLines.push(reading.archetypeTagline)
  if (reading?.compatibilityData) {
    try {
      const parsed = JSON.parse(reading.compatibilityData) as {
        highlights?: string[]
        advice?: string[]
      }
      if (Array.isArray(parsed.highlights) && parsed.highlights[0]) {
        goldenLines.push(parsed.highlights[0])
      }
      if (goldenLines.length < 3 && Array.isArray(parsed.advice) && parsed.advice[0]) {
        goldenLines.push(parsed.advice[0])
      }
    } catch {
      // ignore — fall through to fewer lines
    }
  }
  if (goldenLines.length === 0 && reading?.archetypeName) {
    goldenLines.push(reading.archetypeName)
  }

  return c.json({
    data: {
      selfName: inviter?.name ?? 'Someone',
      otherName: bond.targetName,
      goldenLines: goldenLines.slice(0, 3),
      score: reading?.score ?? undefined,
    },
  })
})

// ── POST /invite/:token/respond — B accepts or declines ─────

bondRoutes.post('/invite/:token/respond', async (c) => {
  const respondUserId = requireUserId(c)
  const token = c.req.param('token')
  const body = await c.req.json()
  const input = respondSchema.parse(body)
  const db = c.get('db')

  const invitation = await db
    .select()
    .from(bondInvitations)
    .where(eq(bondInvitations.token, token))
    .get()

  if (!invitation) throw new HTTPException(404, { message: 'Invitation not found' })
  if (invitation.status !== 'pending') {
    throw new HTTPException(410, { message: `Invitation already ${invitation.status}` })
  }

  // Check expiry
  if (new Date(invitation.expiresAt) < new Date()) {
    await expireInvitation(db, invitation.id, invitation.bondId, invitation.inviterUserId, c)
    throw new HTTPException(410, { message: 'Invitation has expired' })
  }

  const responder = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, respondUserId))
    .get()
  if (!responder) throw new HTTPException(404, { message: 'User not found' })
  if (!responder.email) {
    throw new HTTPException(400, { message: 'Link your email in Settings before responding' })
  }
  if (responder.email.toLowerCase() !== invitation.targetEmail.toLowerCase()) {
    throw new HTTPException(403, {
      message: 'Invitation email mismatch. Please sign in with the invited email.',
    })
  }

  // ── Decline ──
  if (input.action === 'decline') {
    await db.batch([
      db
        .update(bondInvitations)
        .set({ status: 'declined', respondedAt: new Date().toISOString() })
        .where(eq(bondInvitations.id, invitation.id)),
      db
        .update(userBonds)
        .set({
          status: 'declined',
          hehunReadingId: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(userBonds.id, invitation.bondId)),
    ])

    // Notify inviter (fire-and-forget)
    c.executionCtx.waitUntil(sendPushEvent(c.env, invitation.inviterUserId, 'bond_declined'))

    return c.json({ data: { status: 'declined' } })
  }

  // ── Accept ──
  // B must provide birth data (for hehun calculation)
  if (!input.birthData) {
    throw new HTTPException(400, { message: 'Birth data required to accept' })
  }

  // Get inviter (person A) birth data
  const inviter = await getUserForHehun(db, invitation.inviterUserId)
  if (!inviter?.birthSolarDate || inviter.birthTimeIndex == null || !inviter.birthGender) {
    throw new HTTPException(500, { message: 'Inviter birth data incomplete' })
  }

  const access = await checkReadingAccess(db, respondUserId, 'compatibility', {
    allowBondInviteCredit: true,
  })
  if (!access.granted) {
    return c.json(
      {
        error: access.reason,
        iapProductId: access.iapProductId,
        price: access.price,
      },
      403
    )
  }

  const isPro = isProUser(inviter)

  // Resonance bonds are free for both parties — use standard AI tier (not Pro HIGH thinking)
  // isPro only controls AI quality tier, not access gating

  // Derive relationship category from bond's relationshipLabel
  const bondForLabel = await db
    .select({ relationshipLabel: userBonds.relationshipLabel })
    .from(userBonds)
    .where(eq(userBonds.id, invitation.bondId))
    .get()
  const PRESET_CATS = new Set([
    'spouse',
    'partner',
    'parent',
    'child',
    'sibling',
    'friend',
    'colleague',
    'boss',
  ])
  const bondLabel = bondForLabel?.relationshipLabel ?? ''
  const resonanceDerivedCategory = PRESET_CATS.has(bondLabel)
    ? (bondLabel as
        | 'spouse'
        | 'partner'
        | 'parent'
        | 'child'
        | 'sibling'
        | 'friend'
        | 'colleague'
        | 'boss')
    : undefined
  const resonanceDerivedCustomLabel = PRESET_CATS.has(bondLabel)
    ? undefined
    : bondLabel || undefined

  // Call SVC_ASTRO hehun/compute
  const { result, interpretation } = await callAstro<{
    result: {
      compatibility: Record<string, unknown>
      personA: Record<string, unknown>
      personB: Record<string, unknown>
    }
    interpretation: Record<string, string>
  }>(c.env.SVC_ASTRO, '/pair/compute', {
    personA: {
      solarDate: inviter.birthSolarDate,
      timeIndex: inviter.birthTimeIndex,
      gender: inviter.birthGender,
      name: inviter.name,
    },
    personB: {
      solarDate: input.birthData.solarDate,
      timeIndex: input.birthData.timeIndex,
      gender: input.birthData.gender,
    },
    userId: invitation.inviterUserId,
    isPro,
    language: input.language,
    relationshipCategory: resonanceDerivedCategory,
    customRelationshipLabel: resonanceDerivedCustomLabel,
  })

  // Save two mirrored reading rows so both A/B history libraries can resolve by ownerId.
  const readingIdForInviter = crypto.randomUUID()
  const readingIdForResponder = crypto.randomUUID()
  await db.batch([
    db.insert(pairReadings).values({
      id: readingIdForInviter,
      userId: invitation.inviterUserId,
      personASolarDate: inviter.birthSolarDate,
      personATimeIndex: inviter.birthTimeIndex,
      personAGender: inviter.birthGender,
      personAName: inviter.name ?? null,
      personBSolarDate: input.birthData.solarDate,
      personBTimeIndex: input.birthData.timeIndex,
      personBGender: input.birthData.gender,
      personBName: responder.name ?? null,
      score: result.compatibility.score as number,
      grade: result.compatibility.grade as string,
      archetypeName: interpretation.archetypeName ?? null,
      archetypeTagline: interpretation.archetypeTagline ?? null,
      archetypeCategory:
        (interpretation.archetypeCategory as
          | 'harmony'
          | 'tension'
          | 'growth'
          | 'karmic'
          | 'volatile'
          | undefined) ?? null,
      hookDimension:
        (interpretation.hookDimension as
          | 'long_term'
          | 'communication'
          | 'attraction'
          | 'emotional'
          | undefined) ?? null,
      relationshipCategory: resonanceDerivedCategory ?? null,
      customRelationshipLabel: resonanceDerivedCustomLabel ?? null,
      compatibilityData: JSON.stringify(result.compatibility),
      interpretation: JSON.stringify(interpretation),
    }),
    db.insert(pairReadings).values({
      id: readingIdForResponder,
      userId: respondUserId,
      personASolarDate: inviter.birthSolarDate,
      personATimeIndex: inviter.birthTimeIndex,
      personAGender: inviter.birthGender,
      personAName: inviter.name ?? null,
      personBSolarDate: input.birthData.solarDate,
      personBTimeIndex: input.birthData.timeIndex,
      personBGender: input.birthData.gender,
      personBName: responder.name ?? null,
      score: result.compatibility.score as number,
      grade: result.compatibility.grade as string,
      archetypeName: interpretation.archetypeName ?? null,
      archetypeTagline: interpretation.archetypeTagline ?? null,
      archetypeCategory:
        (interpretation.archetypeCategory as
          | 'harmony'
          | 'tension'
          | 'growth'
          | 'karmic'
          | 'volatile'
          | undefined) ?? null,
      hookDimension:
        (interpretation.hookDimension as
          | 'long_term'
          | 'communication'
          | 'attraction'
          | 'emotional'
          | undefined) ?? null,
      relationshipCategory: resonanceDerivedCategory ?? null,
      customRelationshipLabel: resonanceDerivedCustomLabel ?? null,
      compatibilityData: JSON.stringify(result.compatibility),
      interpretation: JSON.stringify(interpretation),
    }),
  ])

  // Get or create B's bond (mirror)
  const bond = await db
    .select({ targetName: userBonds.targetName, relationshipLabel: userBonds.relationshipLabel })
    .from(userBonds)
    .where(eq(userBonds.id, invitation.bondId))
    .get()

  const mirrorBondId = crypto.randomUUID()

  // Update invitation + A's bond (A always has full access)
  await db.batch([
    db
      .update(bondInvitations)
      .set({ status: 'accepted', respondedAt: new Date().toISOString() })
      .where(eq(bondInvitations.id, invitation.id)),
    db
      .update(userBonds)
      .set({
        status: 'active',
        hehunReadingId: readingIdForInviter,
        targetUserId: respondUserId,
        mirrorBondId,
        unlockedDimensions: '4',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userBonds.id, invitation.bondId)),
  ])

  await db.insert(userBonds).values({
    id: mirrorBondId,
    ownerId: respondUserId,
    targetUserId: invitation.inviterUserId,
    targetName: inviter.name ?? 'Unknown',
    relationshipLabel: bond?.relationshipLabel ?? '',
    mode: 'resonance',
    hehunReadingId: readingIdForResponder,
    mirrorBondId: invitation.bondId,
    unlockedDimensions: '4',
    status: 'active',
  })
  await db
    .insert(bondInviteCredits)
    .values([
      {
        id: crypto.randomUUID(),
        userId: invitation.inviterUserId,
        inviteId: invitation.id,
        earnedFrom: 'invite_sent',
      },
      {
        id: crypto.randomUUID(),
        userId: respondUserId,
        inviteId: invitation.id,
        earnedFrom: 'invite_received',
      },
    ])
    .onConflictDoNothing()

  // Notify inviter (fire-and-forget)
  c.executionCtx.waitUntil(
    Promise.all([
      sendPushEvent(c.env, invitation.inviterUserId, 'bond_accepted'),
      sendPushEvent(c.env, respondUserId, 'bond_accepted'),
      logEvent(db, invitation.inviterUserId, 'reading_pair', {
        readingId: readingIdForInviter,
        bondId: invitation.bondId,
        mode: 'resonance',
      }),
      logEvent(db, respondUserId, 'reading_pair', {
        readingId: readingIdForResponder,
        bondId: mirrorBondId,
        mode: 'resonance',
      }),
      sendBondAcceptedEmails(c.env, {
        inviterEmail: inviter.email ?? null,
        inviterName: inviter.name ?? null,
        responderEmail: responder.email,
        responderName: responder.name ?? null,
        relationshipLabel: bond?.relationshipLabel ?? '',
      }),
    ])
  )

  // Extract one exposed dimension for B's free briefing (性格契合度 personality)
  const compat = result.compatibility as Record<string, unknown>
  const dimensions = compat.dimensions as Record<string, unknown>[] | undefined
  let exposedDimension: { key: string; label: string; score: number; description: string } | null =
    null
  if (Array.isArray(dimensions) && dimensions.length > 0) {
    const dim = dimensions[0] as Record<string, unknown>
    exposedDimension = {
      key: (dim.key as string) ?? 'personality',
      label: (dim.label as string) ?? '性格契合度',
      score: (dim.score as number) ?? 0,
      description: (dim.description as string) ?? '',
    }
  }

  // Return the free summary for B (limited — no full interpretation)
  return c.json({
    data: {
      status: 'accepted',
      readingId: readingIdForResponder,
      mirrorBondId,
      score: result.compatibility.score,
      grade: result.compatibility.grade,
      // B gets limited summary — no full AI interpretation
      summary: (interpretation as Record<string, string>).summary ?? null,
      // One exposed dimension as teaser
      exposedDimension,
    },
  })
})

// ── GET / — 列出当前用户的关系 ───────────────────────────────

bondRoutes.get('/', async (c) => {
  const userId = requireUserId(c)

  const db = c.get('db')

  // Own bonds (excluding removed)
  const ownBonds = await db
    .select({
      id: userBonds.id,
      ownerId: userBonds.ownerId,
      targetUserId: userBonds.targetUserId,
      targetName: userBonds.targetName,
      relationshipLabel: userBonds.relationshipLabel,
      mode: userBonds.mode,
      hehunReadingId: userBonds.hehunReadingId,
      mirrorBondId: userBonds.mirrorBondId,
      unlockedDimensions: userBonds.unlockedDimensions,
      sharedByOwner: userBonds.sharedByOwner,
      status: userBonds.status,
      createdAt: userBonds.createdAt,
    })
    .from(userBonds)
    .where(and(eq(userBonds.ownerId, userId), ne(userBonds.status, 'removed')))

  // Enrich with pair scores + birth data (batch query)
  const readingIds = ownBonds.map((b) => b.hehunReadingId).filter(Boolean) as string[]
  const readingMap = new Map<
    string,
    {
      score: number
      grade: string
      archetypeName: string | null
      archetypeTagline: string | null
      archetypeCategory: string | null
      hookDimension: string | null
      personASolarDate: string
      personATimeIndex: number
      personBSolarDate: string
      personBTimeIndex: number
    }
  >()
  if (readingIds.length > 0) {
    const readingRows = await db
      .select({
        id: pairReadings.id,
        score: pairReadings.score,
        grade: pairReadings.grade,
        archetypeName: pairReadings.archetypeName,
        archetypeTagline: pairReadings.archetypeTagline,
        archetypeCategory: pairReadings.archetypeCategory,
        hookDimension: pairReadings.hookDimension,
        personASolarDate: pairReadings.personASolarDate,
        personATimeIndex: pairReadings.personATimeIndex,
        personBSolarDate: pairReadings.personBSolarDate,
        personBTimeIndex: pairReadings.personBTimeIndex,
      })
      .from(pairReadings)
      .where(inArray(pairReadings.id, readingIds))
    for (const r of readingRows) readingMap.set(r.id, r)
  }

  // Enrich with target user info (batch query)
  const targetUserIds = ownBonds.map((b) => b.targetUserId).filter(Boolean) as string[]
  const userMap = new Map<string, { name: string | null; avatarKey: string | null }>()
  if (targetUserIds.length > 0) {
    const userRows = await db
      .select({ id: users.id, name: users.name, avatarKey: users.avatarKey })
      .from(users)
      .where(inArray(users.id, targetUserIds))
    for (const u of userRows) {
      userMap.set(u.id, {
        name: u.name,
        avatarKey: u.avatarKey
      })
    }
  }

  // Enrich with invitation status for pending bonds (batch query)
  const pendingBondIds = ownBonds.filter((b) => b.status === 'pending_invite').map((b) => b.id)
  const invitationMap = new Map<string, { expiresAt: string; targetEmail: string }>()
  if (pendingBondIds.length > 0) {
    const invRows = await db
      .select({
        bondId: bondInvitations.bondId,
        expiresAt: bondInvitations.expiresAt,
        targetEmail: bondInvitations.targetEmail,
      })
      .from(bondInvitations)
      .where(
        and(inArray(bondInvitations.bondId, pendingBondIds), eq(bondInvitations.status, 'pending'))
      )
    for (const inv of invRows) invitationMap.set(inv.bondId, inv)
  }

  // Check subscription for Pro-only features (todaySynastry)
  const owner = await db
    .select({ subscriptionStatus: users.subscriptionStatus })
    .from(users)
    .where(eq(users.id, userId))
    .get()
  const isPro = isProUser(owner)

  // Compute today's day pillar once for synastry
  const now = new Date()
  const todayGanZhi = dayGanZhi(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate())
  const todayDateStr = now.toISOString().slice(0, 10)

  const enriched = ownBonds.map((b) => {
    const reading = b.hehunReadingId ? readingMap.get(b.hehunReadingId) : null
    const targetUser = b.targetUserId ? userMap.get(b.targetUserId) : null
    const invitation = invitationMap.get(b.id)

    // Compute daily synastry when both birth dates are available (Pro only)
    let todaySynastry = null
    if (reading && isPro) {
      const inputA = parseSolarParts(reading.personASolarDate, reading.personATimeIndex)
      const inputB = parseSolarParts(reading.personBSolarDate, reading.personBTimeIndex)
      if (inputA && inputB) {
        try {
          const pillarsA = getFourPillars(inputA)
          const pillarsB = getFourPillars(inputB)
          todaySynastry = calculateDailySynastry(pillarsA, pillarsB, todayGanZhi, todayDateStr)
        } catch {
          // silently skip if birth data is malformed
        }
      }
    }

    return {
      ...b,
      score: reading?.score ?? null,
      grade: reading?.grade ?? null,
      archetypeName: reading?.archetypeName ?? null,
      archetypeTagline: reading?.archetypeTagline ?? null,
      archetypeCategory: reading?.archetypeCategory ?? null,
      hookDimension: reading?.hookDimension ?? null,
      targetUser,
      invitation: invitation ?? null,
      todaySynastry,
    }
  })

  return c.json({ data: { bonds: enriched } })
})

// ── GET /:id — detail with filtered dimensions ────────────────

// Semantic key mapping matches calculateHeHun dimension order:
//  dimensions[0] 日主五行 (40%) → long_term
//  dimensions[1] 年支缘分 (20%) → attraction
//  dimensions[2] 月支生活 (20%) → communication
//  dimensions[3] 日支亲密 (20%) → emotional
const DIMENSION_SEMANTIC_KEYS = ['long_term', 'attraction', 'communication', 'emotional'] as const

bondRoutes.get('/:id', async (c) => {
  const bondId = c.req.param('id')
  const userId = requireUserId(c)
  const db = c.get('db')

  const bond = await db
    .select({
      id: userBonds.id,
      ownerId: userBonds.ownerId,
      targetUserId: userBonds.targetUserId,
      targetName: userBonds.targetName,
      relationshipLabel: userBonds.relationshipLabel,
      mode: userBonds.mode,
      hehunReadingId: userBonds.hehunReadingId,
      mirrorBondId: userBonds.mirrorBondId,
      invitationId: userBonds.invitationId,
      unlockedDimensions: userBonds.unlockedDimensions,
      sharedByOwner: userBonds.sharedByOwner,
      status: userBonds.status,
      createdAt: userBonds.createdAt,
    })
    .from(userBonds)
    .where(and(eq(userBonds.id, bondId), eq(userBonds.ownerId, userId)))
    .get()

  if (!bond) throw new HTTPException(404, { message: 'Bond not found' })

  type DimensionRow = { name: string; score: number; maxScore: number; note: string }

  let dimensionData: Array<{
    key: string
    name: string
    score: number | null
    maxScore: number | null
    note: string | null
    isLocked: boolean
  }> | null = null

  let reading: {
    score: number
    grade: string
    archetypeName: string | null
    archetypeTagline: string | null
    archetypeCategory: string | null
    hookDimension: string | null
  } | null = null

  let interpretation: Record<string, unknown> | null = null

  if (bond.hehunReadingId) {
    const rawReading = await db
      .select({
        score: pairReadings.score,
        grade: pairReadings.grade,
        archetypeName: pairReadings.archetypeName,
        archetypeTagline: pairReadings.archetypeTagline,
        archetypeCategory: pairReadings.archetypeCategory,
        hookDimension: pairReadings.hookDimension,
        compatibilityData: pairReadings.compatibilityData,
        interpretation: pairReadings.interpretation,
      })
      .from(pairReadings)
      .where(eq(pairReadings.id, bond.hehunReadingId))
      .get()

    if (rawReading) {
      reading = {
        score: rawReading.score,
        grade: rawReading.grade,
        archetypeName: rawReading.archetypeName,
        archetypeTagline: rawReading.archetypeTagline,
        archetypeCategory: rawReading.archetypeCategory,
        hookDimension: rawReading.hookDimension,
      }

      try {
        const parsed = JSON.parse(rawReading.interpretation) as Record<string, unknown>
        if (parsed && typeof parsed === 'object') interpretation = parsed
      } catch {
        // Malformed interpretation JSON — leave as null so the client falls back gracefully.
      }
      // '4' or null (legacy) means full access; '1' means restricted to hookDimension only
      const canSeeAll = bond.unlockedDimensions === '4' || bond.unlockedDimensions === null

      try {
        const compat = JSON.parse(rawReading.compatibilityData) as {
          dimensions?: DimensionRow[]
        }
        if (Array.isArray(compat.dimensions)) {
          dimensionData = compat.dimensions.slice(0, 4).map((dim, i) => {
            const key = DIMENSION_SEMANTIC_KEYS[i] ?? 'long_term'
            const isLocked = !canSeeAll && key !== rawReading.hookDimension
            return {
              key,
              name: dim.name,
              score: isLocked ? null : (dim.score ?? null),
              maxScore: isLocked ? null : (dim.maxScore ?? null),
              note: isLocked ? null : (dim.note ?? null),
              isLocked,
            }
          })
        }
      } catch {
        // Malformed compatibilityData — skip dimensions
      }
    }
  }

  const targetUser = bond.targetUserId
    ? await db
        .select({ name: users.name, avatarKey: users.avatarKey })
        .from(users)
        .where(eq(users.id, bond.targetUserId))
        .get()
    : null

  const invitation =
    bond.invitationId && bond.status === 'pending_invite'
      ? await db
          .select({
            expiresAt: bondInvitations.expiresAt,
            targetEmail: bondInvitations.targetEmail,
          })
          .from(bondInvitations)
          .where(eq(bondInvitations.id, bond.invitationId))
          .get()
      : null

  return c.json({
    data: {
      ...bond,
      score: reading?.score ?? null,
      grade: reading?.grade ?? null,
      archetypeName: reading?.archetypeName ?? null,
      archetypeTagline: reading?.archetypeTagline ?? null,
      archetypeCategory: reading?.archetypeCategory ?? null,
      hookDimension: reading?.hookDimension ?? null,
      targetUser: targetUser ?? null,
      invitation: invitation
        ? { expiresAt: invitation.expiresAt, targetEmail: invitation.targetEmail }
        : null,
      dimensions: dimensionData,
      interpretation,
    },
  })
})

// ── GET /:id/synastry — 流日感应 (daily synastry for a bond) ──
// Accepts optional query param ?date=YYYY-MM-DD (defaults to UTC today)

bondRoutes.get('/:id/synastry', async (c) => {
  const bondId = c.req.param('id')
  const userId = requireUserId(c)
  const db = c.get('db')

  // Pro gate — daily synastry is a Pro feature
  const user = await db
    .select({ subscriptionStatus: users.subscriptionStatus })
    .from(users)
    .where(eq(users.id, userId))
    .get()
  if (!user) throw new HTTPException(404, { message: 'User not found' })
  const isPro = isProUser(user)
  if (!isPro) {
    throw new HTTPException(403, { message: 'Daily synastry requires Pro subscription' })
  }

  // Validate optional date param
  const dateParam = c.req.query('date')
  let targetYear: number
  let targetMonth: number
  let targetDay: number
  let targetDateStr: string
  if (dateParam) {
    if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateParam)) {
      throw new HTTPException(400, { message: 'Invalid date format. Use YYYY-MM-DD.' })
    }
    const parts = dateParam.split('-')
    targetYear = Number.parseInt(parts[0]!, 10)
    targetMonth = Number.parseInt(parts[1]!, 10)
    targetDay = Number.parseInt(parts[2]!, 10)
    targetDateStr = dateParam
  } else {
    const now = new Date()
    targetYear = now.getUTCFullYear()
    targetMonth = now.getUTCMonth() + 1
    targetDay = now.getUTCDate()
    targetDateStr = now.toISOString().slice(0, 10)
  }

  const bond = await db
    .select({ hehunReadingId: userBonds.hehunReadingId, ownerId: userBonds.ownerId })
    .from(userBonds)
    .where(and(eq(userBonds.id, bondId), eq(userBonds.ownerId, userId)))
    .get()

  if (!bond) throw new HTTPException(404, { message: 'Bond not found' })
  if (!bond.hehunReadingId) {
    throw new HTTPException(422, { message: 'Synastry requires a completed compatibility reading' })
  }

  const reading = await db
    .select({
      personASolarDate: pairReadings.personASolarDate,
      personATimeIndex: pairReadings.personATimeIndex,
      personBSolarDate: pairReadings.personBSolarDate,
      personBTimeIndex: pairReadings.personBTimeIndex,
    })
    .from(pairReadings)
    .where(eq(pairReadings.id, bond.hehunReadingId))
    .get()

  if (!reading) throw new HTTPException(404, { message: 'Reading not found' })

  const inputA = parseSolarParts(reading.personASolarDate, reading.personATimeIndex)
  const inputB = parseSolarParts(reading.personBSolarDate, reading.personBTimeIndex)
  if (!inputA || !inputB) {
    throw new HTTPException(422, { message: 'Invalid birth data in reading' })
  }

  const pillarsA = getFourPillars(inputA)
  const pillarsB = getFourPillars(inputB)
  const todayGz = dayGanZhi(targetYear, targetMonth, targetDay)
  const result = calculateDailySynastry(pillarsA, pillarsB, todayGz, targetDateStr)

  return c.json({ data: result })
})

// ── PATCH /:id — 修改关系标签/名称 ──────────────────────────

bondRoutes.patch('/:id', async (c) => {
  const bondId = c.req.param('id')
  const userId = requireUserId(c)

  const body = await c.req.json()
  const input = updateBondSchema.parse(body)
  const db = c.get('db')

  const bond = await db
    .select({ id: userBonds.id, ownerId: userBonds.ownerId })
    .from(userBonds)
    .where(eq(userBonds.id, bondId))
    .get()

  if (!bond) throw new HTTPException(404, { message: 'Bond not found' })
  if (bond.ownerId !== userId) throw new HTTPException(403, { message: 'Not your bond' })

  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (input.targetName !== undefined) patch.targetName = input.targetName
  if (input.relationshipLabel !== undefined) patch.relationshipLabel = input.relationshipLabel

  await db.update(userBonds).set(patch).where(eq(userBonds.id, bondId))

  return c.json({ data: { id: bondId, ...input } })
})

// ── PATCH /:id/stage — 更新感情阶段 ──────────────────────────

const updateBondStageSchema = z.object({
  relationshipStage: z.enum(['crush', 'dating', 'committed', 'engaged', 'married', 'ex']),
})

bondRoutes.patch('/:id/stage', async (c) => {
  const bondId = c.req.param('id')
  const userId = requireUserId(c)

  const body = await c.req.json()
  const { relationshipStage } = updateBondStageSchema.parse(body)
  const db = c.get('db')

  const bond = await db
    .select({ id: userBonds.id, ownerId: userBonds.ownerId })
    .from(userBonds)
    .where(eq(userBonds.id, bondId))
    .get()

  if (!bond) throw new HTTPException(404, { message: 'Bond not found' })
  if (bond.ownerId !== userId) throw new HTTPException(403, { message: 'Not your bond' })

  await db
    .update(userBonds)
    .set({ relationshipStage, updatedAt: new Date().toISOString() })
    .where(eq(userBonds.id, bondId))

  return c.json({ data: { id: bondId, relationshipStage } })
})

// ── POST /:id/unlock — B 解锁完整合盘 (消耗 5 coins) ────────

const UNLOCK_BOND_COST = 5

bondRoutes.post('/:id/unlock', async (c) => {
  const bondId = c.req.param('id')
  const userId = requireUserId(c)
  const db = c.get('db')

  const bond = await db
    .select({
      id: userBonds.id,
      ownerId: userBonds.ownerId,
      unlockedDimensions: userBonds.unlockedDimensions,
      status: userBonds.status,
      hehunReadingId: userBonds.hehunReadingId,
    })
    .from(userBonds)
    .where(eq(userBonds.id, bondId))
    .get()

  if (!bond) throw new HTTPException(404, { message: 'Bond not found' })
  if (bond.status !== 'active') throw new HTTPException(400, { message: 'Bond is not active' })
  // Only B (non-owner) can call unlock; A already has full access
  if (bond.ownerId === userId) {
    throw new HTTPException(400, { message: 'You already have full access as the bond creator' })
  }
  // Must own this bond (it must be the mirror bond in B's list)
  const accessible = await db
    .select({ id: userBonds.id })
    .from(userBonds)
    .where(and(eq(userBonds.id, bondId), eq(userBonds.ownerId, userId)))
    .get()
  if (!accessible) throw new HTTPException(403, { message: 'Not your bond' })

  // Already fully unlocked
  if (bond.unlockedDimensions === '4') {
    return c.json({ data: { alreadyUnlocked: true } })
  }

  await db
    .update(userBonds)
    .set({ unlockedDimensions: '4', updatedAt: new Date().toISOString() })
    .where(eq(userBonds.id, bondId))

  return c.json({ data: { unlocked: true } })
})

// ── POST /:id/gift — A 免费赠送完整报告给 B ────────────────

bondRoutes.post('/:id/gift', async (c) => {
  const bondId = c.req.param('id')
  const userId = requireUserId(c)
  const db = c.get('db')

  const bond = await db
    .select({
      id: userBonds.id,
      ownerId: userBonds.ownerId,
      mirrorBondId: userBonds.mirrorBondId,
      targetUserId: userBonds.targetUserId,
      status: userBonds.status,
      sharedByOwner: userBonds.sharedByOwner,
    })
    .from(userBonds)
    .where(eq(userBonds.id, bondId))
    .get()

  if (!bond) throw new HTTPException(404, { message: 'Bond not found' })
  if (bond.ownerId !== userId) throw new HTTPException(403, { message: 'Only bond owner can gift' })
  if (bond.status !== 'active') throw new HTTPException(400, { message: 'Bond is not active' })
  if (!bond.mirrorBondId) {
    throw new HTTPException(400, { message: 'No partner bond to gift (solo mode)' })
  }

  // Mark A's bond as shared + unlock B's mirror bond
  await db.batch([
    db
      .update(userBonds)
      .set({ sharedByOwner: true, updatedAt: new Date().toISOString() })
      .where(eq(userBonds.id, bondId)),
    db
      .update(userBonds)
      .set({ unlockedDimensions: '4', updatedAt: new Date().toISOString() })
      .where(eq(userBonds.id, bond.mirrorBondId)),
  ])

  // Notify B (fire-and-forget)
  if (bond.targetUserId) {
    c.executionCtx.waitUntil(sendPushEvent(c.env, bond.targetUserId, 'bond_gifted'))
  }

  return c.json({ data: { gifted: true } })
})

// ── POST /:id/share ─ 创建合婚报告分享链接 ──────────────────

bondRoutes.post('/:id/share', async (c) => {
  const bondId = c.req.param('id')
  const userId = requireUserId(c)

  const { success: rlOk } = await c.env.RATE_LIMITER.limit({ key: `bond_share:${userId}` })
  if (!rlOk) throw new HTTPException(429, { message: 'Too many requests' })

  const db = c.get('db')

  const bond = await db
    .select({
      id: userBonds.id,
      ownerId: userBonds.ownerId,
      targetName: userBonds.targetName,
      relationshipLabel: userBonds.relationshipLabel,
      hehunReadingId: userBonds.hehunReadingId,
      status: userBonds.status,
    })
    .from(userBonds)
    .where(eq(userBonds.id, bondId))
    .get()

  if (!bond) throw new HTTPException(404, { message: 'Bond not found' })
  if (bond.ownerId !== userId) throw new HTTPException(403, { message: 'Not your bond' })
  if (bond.status !== 'active') throw new HTTPException(400, { message: 'Bond is not active' })
  if (!bond.hehunReadingId)
    throw new HTTPException(400, { message: 'No reading available for this bond' })

  const reading = await db
    .select({
      score: pairReadings.score,
      grade: pairReadings.grade,
      compatibilityData: pairReadings.compatibilityData,
      personAName: pairReadings.personAName,
      personBName: pairReadings.personBName,
    })
    .from(pairReadings)
    .where(eq(pairReadings.id, bond.hehunReadingId))
    .get()

  if (!reading) throw new HTTPException(404, { message: 'Reading not found' })

  // Build share content snapshot
  const shareContent = {
    score: reading.score,
    grade: reading.grade,
    personAName: reading.personAName,
    personBName: reading.personBName ?? bond.targetName,
    relationshipLabel: bond.relationshipLabel,
    compatibility: JSON.parse(reading.compatibilityData),
  }

  const shareId = generateShareId()
  const titleHint = `${reading.personAName ?? ''} · 缘 · ${reading.personBName ?? bond.targetName}`

  await db.insert(sharedReports).values({
    id: shareId,
    userId,
    reportType: 'pair',
    reportId: bond.hehunReadingId,
    titleHint,
    contentJson: JSON.stringify(shareContent),
  })

  const baseUrl =
    c.env.ENVIRONMENT === 'production' ? 'https://hexastral.com' : 'http://localhost:3000'

  c.executionCtx.waitUntil(
    logEvent(db, userId, 'share_create', { shareId, reportType: 'pair', bondId })
  )

  return c.json({ data: { shareId, url: `${baseUrl}/report/${shareId}` } }, 201)
})

// ── GET /active-pairs — Internal: active bonds with birth data (for synastry cron) ─────────────────

/**
 * Returns paginated active bond pairs with both people's birth data.
 * Used by svc-fortune cron to enqueue SYNASTRY_QUEUE messages.
 * Auth: X-Internal-Key header.
 */
bondRoutes.get('/active-pairs', async (c) => {
  const internalKey = c.req.header('X-Internal-Key')
  if (!internalKey || internalKey !== c.env.INTERNAL_KEY) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }

  const db = c.get('db')
  const cursor = Number.parseInt(c.req.query('cursor') ?? '0', 10)
  const limit = Math.min(Number.parseInt(c.req.query('limit') ?? '100', 10), 200)

  const rows = await db
    .select({
      bondId: userBonds.id,
      ownerUserId: userBonds.ownerId,
      personASolarDate: pairReadings.personASolarDate,
      personATimeIndex: pairReadings.personATimeIndex,
      personBSolarDate: pairReadings.personBSolarDate,
      personBTimeIndex: pairReadings.personBTimeIndex,
      ownerLocale: users.locale,
    })
    .from(userBonds)
    .innerJoin(pairReadings, eq(userBonds.hehunReadingId, pairReadings.id))
    .innerJoin(users, eq(userBonds.ownerId, users.id))
    .where(eq(userBonds.status, 'active'))
    .limit(limit + 1)
    .offset(cursor)

  const hasMore = rows.length > limit
  const data = hasMore ? rows.slice(0, limit) : rows

  return c.json({
    data: data.map((r) => ({
      bondId: r.bondId,
      ownerUserId: r.ownerUserId,
      personASolarDate: r.personASolarDate,
      personATimeIndex: r.personATimeIndex,
      personBSolarDate: r.personBSolarDate,
      personBTimeIndex: r.personBTimeIndex,
      locale: r.ownerLocale ?? 'en',
    })),
    nextCursor: hasMore ? cursor + limit : null,
  })
})

// ── DELETE /:id — 软删除关系 (+ refund if pending invite) ────

bondRoutes.delete('/:id', async (c) => {
  const bondId = c.req.param('id')
  const userId = requireUserId(c)

  const db = c.get('db')

  const bond = await db
    .select({
      id: userBonds.id,
      ownerId: userBonds.ownerId,
      status: userBonds.status,
      invitationId: userBonds.invitationId,
    })
    .from(userBonds)
    .where(eq(userBonds.id, bondId))
    .get()

  if (!bond) throw new HTTPException(404, { message: 'Bond not found' })
  if (bond.ownerId !== userId) throw new HTTPException(403, { message: 'Not your bond' })

  // If pending invite, cancel
  if (bond.status === 'pending_invite' && bond.invitationId) {
    const invitation = await db
      .select({
        id: bondInvitations.id,
        status: bondInvitations.status,
      })
      .from(bondInvitations)
      .where(eq(bondInvitations.id, bond.invitationId))
      .get()

    if (invitation?.status === 'pending') {
      await db
        .update(bondInvitations)
        .set({ status: 'expired', respondedAt: new Date().toISOString() })
        .where(eq(bondInvitations.id, invitation.id))
    }
  }

  await db
    .update(userBonds)
    .set({
      status: 'removed',
      hehunReadingId: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(userBonds.id, bondId))

  return c.json({ data: { id: bondId, status: 'removed' } })
})

// ── Cron: expire stale invitations ──────────────────────────

/**
 * Called by scheduled trigger to expire overdue invitations.
 * Can also be called on-demand during reads (lazy expiry).
 */
export async function expireStaleInvitations(env: CloudflareBindings): Promise<number> {
  const db = drizzle(env.DB, { schema: schemaAll })
  const now = new Date().toISOString()

  const stale = await db
    .select({
      id: bondInvitations.id,
      bondId: bondInvitations.bondId,
      inviterUserId: bondInvitations.inviterUserId,
    })
    .from(bondInvitations)
    .where(and(eq(bondInvitations.status, 'pending'), sql`${bondInvitations.expiresAt} <= ${now}`))
    .limit(50) // Process in batches to avoid timeout

  for (const inv of stale) {
    await db.batch([
      db.update(bondInvitations).set({ status: 'expired' }).where(eq(bondInvitations.id, inv.id)),
      db
        .update(userBonds)
        .set({ status: 'expired', hehunReadingId: null, updatedAt: now })
        .where(eq(userBonds.id, inv.bondId)),
    ])
  }

  return stale.length
}

// ── Internal helpers ─────────────────────────────────────────

async function expireInvitation(
  db: AppDb,
  invitationId: string,
  bondId: string,
  inviterUserId: string,
  c: { env: CloudflareBindings; executionCtx: ExecutionContext }
) {
  const invitation = await db
    .select({ status: bondInvitations.status })
    .from(bondInvitations)
    .where(eq(bondInvitations.id, invitationId))
    .get()

  if (invitation?.status !== 'pending') return

  await db.batch([
    db
      .update(bondInvitations)
      .set({ status: 'expired' })
      .where(eq(bondInvitations.id, invitationId)),
    db
      .update(userBonds)
      .set({
        status: 'expired',
        hehunReadingId: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userBonds.id, bondId)),
  ])

  c.executionCtx.waitUntil(sendPushEvent(c.env, inviterUserId, 'bond_expired'))
}

async function sendBondAcceptedEmails(
  env: CloudflareBindings,
  input: {
    inviterEmail: string | null
    inviterName: string | null
    responderEmail: string
    responderName: string | null
    relationshipLabel: string
  }
): Promise<void> {
  const responderDisplay = input.responderName ?? 'Your partner'
  const inviterDisplay = input.inviterName ?? 'Your partner'
  const tasks: Promise<unknown>[] = []

  if (input.inviterEmail) {
    tasks.push(
      mailerClient.post(env.SVC_MAILER, '/send', {
        to: input.inviterEmail,
        subject: 'Your Resonance invitation was accepted',
        html: `<p>${responderDisplay} accepted your Resonance invitation.</p><p>Relationship: ${input.relationshipLabel}</p><p>Your compatibility reading is ready in HexAstral.</p>`,
      })
    )
  }

  tasks.push(
    mailerClient.post(env.SVC_MAILER, '/send', {
      to: input.responderEmail,
      subject: 'Resonance connected successfully',
      html: `<p>You are now connected with ${inviterDisplay} in Resonance.</p><p>Relationship: ${input.relationshipLabel}</p><p>Your compatibility reading is ready in HexAstral.</p>`,
    })
  )

  await Promise.all(tasks)
}

function buildInvitationEmailHtml(opts: {
  inviterName: string
  relationshipLabel: string
  message?: string | null
  resonateUrl: string
  locale: string
}): string {
  const { inviterName, relationshipLabel, message, resonateUrl } = opts
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e4e4e7;">
      <tr><td style="padding:40px 32px;text-align:center;">
        <p style="margin:0 0 8px;font-size:11px;color:#71717a;letter-spacing:4px;text-transform:uppercase;">HEXASTRAL</p>
        <h1 style="margin:0 0 24px;font-size:22px;font-weight:300;color:#09090b;letter-spacing:1px;line-height:1.4;">
          ${inviterName} wants to discover<br>your cosmic connection
        </h1>
        <p style="margin:0 0 12px;font-size:13px;color:#71717a;line-height:1.6;">
          Relationship: <strong style="color:#09090b;">${relationshipLabel}</strong>
        </p>
        ${message ? `<p style="margin:0 0 24px;font-size:13px;color:#52525b;line-height:1.6;font-style:italic;">"${message}"</p>` : ''}
        <p style="margin:0 0 28px;font-size:13px;color:#71717a;line-height:1.6;">
          Enter your birth details to reveal the resonance between your star charts.<br>
          Your exact birth data will remain private — only the reading result will be shared.
        </p>
        <a href="${resonateUrl}" style="display:inline-block;padding:14px 40px;background:#09090b;color:#fafafa;font-size:13px;font-weight:500;letter-spacing:2px;text-decoration:none;text-transform:uppercase;">
          Respond to Resonance →
        </a>
        <p style="margin:24px 0 0;font-size:11px;color:#a1a1aa;line-height:1.6;">
          As a responder, you'll receive a free compatibility summary.<br>
          This invitation expires in 7 days.
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}
