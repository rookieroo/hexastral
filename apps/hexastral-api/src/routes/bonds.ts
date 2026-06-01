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

import type { ExecutionContext } from '@cloudflare/workers-types/2023-07-01'
import { dayGanZhi, getFourPillars } from '@zhop/astro-core/ganzhi'
import { calculateDailySynastry } from '@zhop/astro-core/synastry'
import { and, eq, inArray, ne, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { type Context, Hono } from 'hono'
import { z } from 'zod/v4'
import * as schemaAll from '../db/schema'
import {
  bondInvitations,
  bondInviteCredits,
  pairReadings,
  sharedReports,
  userBonds,
  users,
} from '../db/schema'
import type { AppDb, AppEnv, CloudflareBindings } from '../infra-types'
import { userHasCapability } from '../lib/access/entitlement-access'
import { checkReadingAccess } from '../lib/access-check'
import { ApiErrorCode, jsonErr, jsonOk } from '../lib/api-response'
import { callAstro } from '../lib/astro-client'
import { requireUserId } from '../lib/auth'
import {
  type BirthTriple,
  birthToInput,
  buildEgoTimeline,
  type PairReadingBirth,
  resolveResonanceCounterpart,
  type ResolvedBond,
} from '../lib/bonds-timeline'
import { logEvent } from '../lib/event-log'
import { explainRelationshipTimelineNode } from '../lib/relationship-timeline-explain'
import { sendPushEvent } from '../lib/push'
import { mailerClient } from '../lib/service-clients'
import { solarDateSchema } from '../lib/validation'
import { getBondInviteCreditStatus } from '../services/quota'
import { resolveLlmGuardSubject } from '../services/shared/llm-guard'

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
  // 生辰精度 (BT.2, ADR-0014) — 与 Fate onboarding (user.ts saveBirthInfoSchema) 对齐,
  // 为关系流月/流日级时间轴预留真太阳时。年级时间轴不消费, 故全部可选。
  longitude: z.string().max(20).optional(),
  latitude: z.string().max(20).optional(),
  timezoneId: z.string().max(40).optional(),
  calendarType: z.enum(['solar', 'lunar']).optional(),
  lunarDate: z.string().max(20).optional(),
  isLeapMonth: z.boolean().optional(),
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

/**
 * Unified bond update schema. Phase F (per phase-f-plan §3.2): merged the
 * legacy split between `PATCH /:id` (name + label) and `PATCH /:id/stage`
 * (relationship stage) into a single endpoint with a union payload — at
 * least one field must be present.
 */
const updateBondSchema = z
  .object({
    targetName: z.string().min(1).max(50).optional(),
    relationshipLabel: z.string().min(1).max(30).optional(),
    relationshipStage: z
      .enum(['crush', 'dating', 'committed', 'engaged', 'married', 'ex'])
      .optional(),
  })
  .refine(
    (v) =>
      v.targetName !== undefined ||
      v.relationshipLabel !== undefined ||
      v.relationshipStage !== undefined,
    { message: 'At least one field must be provided' }
  )

bondRoutes.get('/credits', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')
  const credits = await getBondInviteCreditStatus(db, userId)
  return jsonOk(c, credits)
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

/** Bond limit check result. `allowed: false` callers should respond via jsonErr. */
type BondLimitResult =
  | { allowed: true }
  | {
      allowed: false
      reason: 'user_not_found' | 'paywall_required'
      message: string
      limit?: number
      iapProductIds?: { monthly: string; annual: string }
    }

const YUAN_PRO_PRODUCT_IDS = {
  monthly: 'hexastral_yuan_pro_monthly',
  annual: 'hexastral_yuan_pro_annual',
} as const

/** Check bond limit for free users — returns instead of throws so route can emit envelope. */
async function checkBondLimit(db: AppDb, userId: string): Promise<BondLimitResult> {
  const user = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).get()
  if (!user) {
    return { allowed: false, reason: 'user_not_found', message: 'User not found' }
  }

  const isPro = await userHasCapability(db, userId, 'yuan')
  if (isPro) return { allowed: true }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userBonds)
    .where(and(eq(userBonds.ownerId, userId), ne(userBonds.status, 'removed')))

  if ((countRow?.count ?? 0) >= FREE_BOND_LIMIT) {
    return {
      allowed: false,
      reason: 'paywall_required',
      message: `Free users are limited to ${FREE_BOND_LIMIT} bonds. Upgrade to Yuán Pro for unlimited.`,
      limit: FREE_BOND_LIMIT,
      iapProductIds: YUAN_PRO_PRODUCT_IDS,
    }
  }
  return { allowed: true }
}

/** Translate a denied BondLimitResult to a properly-coded jsonErr response. */
function bondLimitError(c: Context<AppEnv>, denied: Extract<BondLimitResult, { allowed: false }>) {
  if (denied.reason === 'user_not_found') {
    return jsonErr(c, 404, ApiErrorCode.not_found, denied.message)
  }
  return jsonErr(c, 403, ApiErrorCode.paywall_required, denied.message, {
    limit: denied.limit,
    iapProductIds: denied.iapProductIds,
  })
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
  if (!rlOk) {
    return jsonErr(c, 429, ApiErrorCode.quota_exhausted, 'Too many requests')
  }

  const body = await c.req.json()
  const input = soloCreateSchema.parse(body)
  const db = c.get('db')

  // Bond limit check
  const bondLimit = await checkBondLimit(db, userId)
  if (!bondLimit.allowed) return bondLimitError(c, bondLimit)

  // Access check — Pro quota or single IAP required
  const access = await checkReadingAccess(db, userId, 'compatibility', {
    allowBondInviteCredit: false,
  })
  if (!access.granted) {
    return jsonErr(c, 403, ApiErrorCode.paywall_required, access.reason ?? 'Paywall required', {
      iapProductId: access.iapProductId,
      price: access.price,
    })
  }

  // Get user birth data for person A
  const user = await getUserForHehun(db, userId)
  if (!user) {
    return jsonErr(c, 404, ApiErrorCode.not_found, 'User not found')
  }
  if (!user.birthSolarDate || user.birthTimeIndex == null || !user.birthGender) {
    return jsonErr(
      c,
      400,
      ApiErrorCode.missing_required,
      'Complete your birth info before creating bonds'
    )
  }

  // Call SVC_ASTRO hehun/compute
  const isPro = await userHasCapability(db, user.id, 'yuan')

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
      personBLongitude: input.targetBirth.longitude ?? null,
      personBLatitude: input.targetBirth.latitude ?? null,
      personBTimezoneId: input.targetBirth.timezoneId ?? null,
      personBCalendarType: input.targetBirth.calendarType ?? null,
      personBLunarDate: input.targetBirth.lunarDate ?? null,
      personBIsLeapMonth: input.targetBirth.isLeapMonth ?? null,
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
      targetBirthLongitude: input.targetBirth.longitude ?? null,
      targetBirthLatitude: input.targetBirth.latitude ?? null,
      targetBirthTimezoneId: input.targetBirth.timezoneId ?? null,
      targetBirthCalendarType: input.targetBirth.calendarType ?? null,
      targetBirthLunarDate: input.targetBirth.lunarDate ?? null,
      targetBirthIsLeapMonth: input.targetBirth.isLeapMonth ?? null,
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

  return jsonOk(
    c,
    {
      bondId,
      readingId,
      mode: 'solo',
      score: result.compatibility.score,
      grade: result.compatibility.grade,
      compatibility: result.compatibility,
      interpretation,
    },
    201
  )
})

// ── POST /invite — Resonance 模式: 邮件邀请 ─────────────────

bondRoutes.post('/invite', async (c) => {
  const userId = requireUserId(c)

  const { success: rlOk } = await c.env.RATE_LIMITER.limit({ key: `bond_invite:${userId}` })
  if (!rlOk) {
    return jsonErr(c, 429, ApiErrorCode.quota_exhausted, 'Too many invitations')
  }

  const body = await c.req.json()
  const input = resonanceInviteSchema.parse(body)
  const db = c.get('db')

  // Bond limit check
  const bondLimit = await checkBondLimit(db, userId)
  if (!bondLimit.allowed) return bondLimitError(c, bondLimit)

  // Validate inviter
  const user = await getUserForHehun(db, userId)
  if (!user) {
    return jsonErr(c, 404, ApiErrorCode.not_found, 'User not found')
  }

  // Must have birth data
  if (!user.birthSolarDate || user.birthTimeIndex == null || !user.birthGender) {
    return jsonErr(
      c,
      400,
      ApiErrorCode.missing_required,
      'Complete your birth info before creating bonds'
    )
  }

  // Cannot invite yourself (only when inviter email is known)
  if (user.email && input.targetEmail.toLowerCase() === user.email.toLowerCase()) {
    return jsonErr(c, 400, ApiErrorCode.invalid_input, 'Cannot invite yourself')
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
    return jsonErr(
      c,
      409,
      ApiErrorCode.conflict,
      'Pending invitation already exists for this email'
    )
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
      ...(user.email ? { replyTo: user.email } : {}),
    })
  } catch {
    return jsonErr(c, 502, ApiErrorCode.upstream_unavailable, 'Failed to send invitation email')
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

  return jsonOk(c, { bondId, invitationId, status: 'pending_invite', token }, 201)
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

  if (!invitation) {
    return jsonErr(c, 404, ApiErrorCode.not_found, 'Invitation not found')
  }

  // Check expiry
  if (invitation.status === 'pending' && new Date(invitation.expiresAt) < new Date()) {
    // Mark expired (lazy expiry)
    await expireInvitation(db, invitation.id, invitation.bondId, invitation.inviterUserId, c)
    return jsonErr(c, 410, ApiErrorCode.gone, 'Invitation has expired')
  }

  if (invitation.status !== 'pending') {
    return jsonErr(c, 410, ApiErrorCode.gone, `Invitation already ${invitation.status}`)
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

  return jsonOk(c, {
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

  if (!invitation) {
    return jsonErr(c, 404, ApiErrorCode.not_found, 'Invitation not found')
  }
  if (invitation.status === 'declined' || invitation.status === 'expired') {
    return jsonErr(c, 410, ApiErrorCode.gone, `Invitation already ${invitation.status}`)
  }

  const bond = await db
    .select({
      targetName: userBonds.targetName,
      hehunReadingId: userBonds.hehunReadingId,
    })
    .from(userBonds)
    .where(eq(userBonds.id, invitation.bondId))
    .get()

  if (!bond) {
    return jsonErr(c, 404, ApiErrorCode.not_found, 'Bond not found')
  }

  const [inviter, reading] = await Promise.all([
    db.select({ name: users.name }).from(users).where(eq(users.id, invitation.inviterUserId)).get(),
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

  return jsonOk(c, {
    selfName: inviter?.name ?? 'Someone',
    otherName: bond.targetName,
    goldenLines: goldenLines.slice(0, 3),
    score: reading?.score ?? undefined,
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

  if (!invitation) {
    return jsonErr(c, 404, ApiErrorCode.not_found, 'Invitation not found')
  }
  if (invitation.status !== 'pending') {
    return jsonErr(c, 410, ApiErrorCode.gone, `Invitation already ${invitation.status}`)
  }

  // Check expiry
  if (new Date(invitation.expiresAt) < new Date()) {
    await expireInvitation(db, invitation.id, invitation.bondId, invitation.inviterUserId, c)
    return jsonErr(c, 410, ApiErrorCode.gone, 'Invitation has expired')
  }

  const responder = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, respondUserId))
    .get()
  if (!responder) {
    return jsonErr(c, 404, ApiErrorCode.not_found, 'User not found')
  }
  if (!responder.email) {
    return jsonErr(
      c,
      400,
      ApiErrorCode.missing_required,
      'Link your email in Settings before responding'
    )
  }
  if (responder.email.toLowerCase() !== invitation.targetEmail.toLowerCase()) {
    return jsonErr(
      c,
      403,
      ApiErrorCode.forbidden,
      'Invitation email mismatch. Please sign in with the invited email.'
    )
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

    return jsonOk(c, { status: 'declined' })
  }

  // ── Accept ──
  // B must provide birth data (for hehun calculation)
  if (!input.birthData) {
    return jsonErr(c, 400, ApiErrorCode.missing_required, 'Birth data required to accept')
  }

  // Get inviter (person A) birth data
  const inviter = await getUserForHehun(db, invitation.inviterUserId)
  if (!inviter?.birthSolarDate || inviter.birthTimeIndex == null || !inviter.birthGender) {
    return jsonErr(c, 500, ApiErrorCode.internal_error, 'Inviter birth data incomplete')
  }

  const access = await checkReadingAccess(db, respondUserId, 'compatibility', {
    allowBondInviteCredit: true,
  })
  if (!access.granted) {
    return jsonErr(c, 403, ApiErrorCode.paywall_required, access.reason ?? 'Paywall required', {
      iapProductId: access.iapProductId,
      price: access.price,
    })
  }

  const isPro = await userHasCapability(db, inviter.id, 'yuan')

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
      personBLongitude: input.birthData.longitude ?? null,
      personBLatitude: input.birthData.latitude ?? null,
      personBTimezoneId: input.birthData.timezoneId ?? null,
      personBCalendarType: input.birthData.calendarType ?? null,
      personBLunarDate: input.birthData.lunarDate ?? null,
      personBIsLeapMonth: input.birthData.isLeapMonth ?? null,
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
      personBLongitude: input.birthData.longitude ?? null,
      personBLatitude: input.birthData.latitude ?? null,
      personBTimezoneId: input.birthData.timezoneId ?? null,
      personBCalendarType: input.birthData.calendarType ?? null,
      personBLunarDate: input.birthData.lunarDate ?? null,
      personBIsLeapMonth: input.birthData.isLeapMonth ?? null,
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
  return jsonOk(c, {
    status: 'accepted',
    readingId: readingIdForResponder,
    mirrorBondId,
    score: result.compatibility.score,
    grade: result.compatibility.grade,
    // B gets limited summary — no full AI interpretation
    summary: (interpretation as Record<string, string>).summary ?? null,
    // One exposed dimension as teaser
    exposedDimension,
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
        avatarKey: u.avatarKey,
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
  const isPro = await userHasCapability(db, userId, 'yuan')

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

  return jsonOk(c, { bonds: enriched }, 200, { total: enriched.length })
})

// ── GET /timeline — 本我中心多关系时间轴 (BT.3 + BT.6, ADR-0014) ─────────────
//
// 枚举本我 + 全部 active bond, 按模式取对方生辰 (solo=userBonds; resonance=pairReadings,
// 服务端持盘), 喂 astro-core composeBondsTimeline, 回**只含派生节点**的 DTO —— 绝不回对方
// 原始 date/time (隐私 D2)。
//
// 写时重算 (D2 founder call #2): 每请求按当前 DB 状态纯函数重算 (亚毫秒, N 小)。无 cron、
// 无 KV 缓存 → 永不陈旧。plan §2.2 明示「缓存非必需」, 且 §7 把「失效点漏一处则轴不更新」
// 列为风险 —— 重算即读消除该风险类。若日后 compute 成本显现再加 per-user KV 缓存 + 失效。
//
// 闸 (BT.6, plan §5-Q3 已定): yuan_pro/universe_pro = 前瞻全轴(+15y) + 主动推送;
// 免费 = 当前年 + **全部** bond (免费上限 3 个 resonance, 已够慷慨; 奖励裂变 —— 拉来 3 段
// 关系的用户能看到全部 3 段的本年节点), 无推送。前瞻全轴与推送是护城河, Pro only。
//
// 注意路由顺序: 静态 `/timeline` 须先于 `/:id` 命中 (Hono RegExpRouter 静态优先, 仍置于前)。
bondRoutes.get('/timeline', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')

  // 本我生辰 (canonical, D2: 仅 users 表持全精度本我盘)
  const ego = await db
    .select({
      birthSolarDate: users.birthSolarDate,
      birthTimeIndex: users.birthTimeIndex,
      birthGender: users.birthGender,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get()
  if (!ego) {
    return jsonErr(c, 404, ApiErrorCode.not_found, 'User not found')
  }
  if (!ego.birthSolarDate || ego.birthTimeIndex == null || !ego.birthGender) {
    return jsonErr(
      c,
      400,
      ApiErrorCode.missing_required,
      'Complete your birth info to see your bonds timeline'
    )
  }
  const egoBirth: BirthTriple = {
    solarDate: ego.birthSolarDate,
    timeIndex: ego.birthTimeIndex,
    gender: ego.birthGender as '男' | '女',
  }

  const isPro = await userHasCapability(db, userId, 'yuan')

  // active bonds — 最早创建在前, 让免费层「第 1 个 bond」稳定。
  const rows = await db
    .select({
      id: userBonds.id,
      targetName: userBonds.targetName,
      relationshipLabel: userBonds.relationshipLabel,
      mode: userBonds.mode,
      hehunReadingId: userBonds.hehunReadingId,
      targetBirthSolarDate: userBonds.targetBirthSolarDate,
      targetBirthTimeIndex: userBonds.targetBirthTimeIndex,
      targetBirthGender: userBonds.targetBirthGender,
    })
    .from(userBonds)
    .where(and(eq(userBonds.ownerId, userId), eq(userBonds.status, 'active')))
    .orderBy(userBonds.createdAt)

  // resonance: 批量取 pairReadings 双方原始盘 (仅服务端可读, D2)。
  const resonanceReadingIds = rows
    .filter((r) => r.mode === 'resonance' && r.hehunReadingId)
    .map((r) => r.hehunReadingId as string)
  const readingMap = new Map<string, PairReadingBirth>()
  if (resonanceReadingIds.length > 0) {
    const readings = await db
      .select({
        id: pairReadings.id,
        personASolarDate: pairReadings.personASolarDate,
        personATimeIndex: pairReadings.personATimeIndex,
        personAGender: pairReadings.personAGender,
        personBSolarDate: pairReadings.personBSolarDate,
        personBTimeIndex: pairReadings.personBTimeIndex,
        personBGender: pairReadings.personBGender,
      })
      .from(pairReadings)
      .where(inArray(pairReadings.id, resonanceReadingIds))
    for (const r of readings) readingMap.set(r.id, r)
  }

  const resolved: ResolvedBond[] = []
  for (const r of rows) {
    let counterpart: BirthTriple | null = null
    if (r.mode === 'solo') {
      if (r.targetBirthSolarDate && r.targetBirthTimeIndex != null && r.targetBirthGender) {
        counterpart = {
          solarDate: r.targetBirthSolarDate,
          timeIndex: r.targetBirthTimeIndex,
          gender: r.targetBirthGender as '男' | '女',
        }
      }
    } else if (r.hehunReadingId) {
      const reading = readingMap.get(r.hehunReadingId)
      if (reading) counterpart = resolveResonanceCounterpart(egoBirth, reading)
    }
    if (!counterpart) continue
    resolved.push({
      bondId: r.id,
      name: r.targetName,
      relationshipLabel: r.relationshipLabel,
      counterpart,
    })
  }

  // 闸 (BT.6) + 视图窗口: 全部 bond 都进合并 (免费层奖励裂变); 前瞻深度与推送区分 Pro/免费。
  const currentYear = new Date().getUTCFullYear()
  const timeline = buildEgoTimeline(egoBirth, resolved, {
    fromYear: currentYear,
    toYear: isPro ? currentYear + 15 : currentYear, // 免费仅当前年, Pro 前瞻 15 年
    notifyFromDate: new Date(),
  })
  // 主动推送是护城河 → Pro only。免费层全展示当前年(全部 bond)钩子节点, 但不排程推送。
  if (!isPro) timeline.notifications = []

  return jsonOk(c, {
    ...timeline,
    pro: isPro,
    ...(isPro ? {} : { upsell: { capability: 'yuan', iapProductIds: YUAN_PRO_PRODUCT_IDS } }),
  })
})

// ── POST /timeline/explain — 节点深解分发 (BT.4, ADR-0014) ─────────────────────
//
// 客户端只带 { bondId, year, nodeType, daYunOf? }; 服务端解析本我 + 对方生辰后调用关系深解
// 核心 (lib/relationship-timeline-explain)。对方原始盘**绝不**下发到设备 (隐私 D2): 解析与
// 排盘全在服务端, 仅回 explanation 文本。本我大运/对方大运/流年 节点统一走关系框架深解
// (与 fate_pro 单人本命走势区分, plan §6 边界)。HMAC 已鉴权 → userId 作 K.4 配额主体。
const timelineExplainSchema = z.object({
  bondId: z.string().min(1),
  year: z.int().min(1900).max(2200),
  nodeType: z.enum(['大运', '流年']),
  daYunOf: z.enum(['A', 'B']).optional(),
  locale: z.string().max(16).optional().default('zh'),
})

bondRoutes.post('/timeline/explain', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')
  const body = timelineExplainSchema.parse(await c.req.json().catch(() => ({})))

  const ego = await db
    .select({
      birthSolarDate: users.birthSolarDate,
      birthTimeIndex: users.birthTimeIndex,
      birthGender: users.birthGender,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get()
  if (!ego?.birthSolarDate || ego.birthTimeIndex == null || !ego.birthGender) {
    return jsonErr(c, 400, ApiErrorCode.missing_required, 'Complete your birth info first')
  }
  const egoBirth: BirthTriple = {
    solarDate: ego.birthSolarDate,
    timeIndex: ego.birthTimeIndex,
    gender: ego.birthGender as '男' | '女',
  }

  // 对方生辰按模式取 (resonance 仅服务端可读 → D2)
  const bond = await db
    .select({
      id: userBonds.id,
      mode: userBonds.mode,
      hehunReadingId: userBonds.hehunReadingId,
      targetBirthSolarDate: userBonds.targetBirthSolarDate,
      targetBirthTimeIndex: userBonds.targetBirthTimeIndex,
      targetBirthGender: userBonds.targetBirthGender,
    })
    .from(userBonds)
    .where(and(eq(userBonds.id, body.bondId), eq(userBonds.ownerId, userId)))
    .get()
  if (!bond) {
    return jsonErr(c, 404, ApiErrorCode.not_found, 'Bond not found')
  }

  let counterpart: BirthTriple | null = null
  if (bond.mode === 'solo') {
    if (bond.targetBirthSolarDate && bond.targetBirthTimeIndex != null && bond.targetBirthGender) {
      counterpart = {
        solarDate: bond.targetBirthSolarDate,
        timeIndex: bond.targetBirthTimeIndex,
        gender: bond.targetBirthGender as '男' | '女',
      }
    }
  } else if (bond.hehunReadingId) {
    const reading = await db
      .select({
        personASolarDate: pairReadings.personASolarDate,
        personATimeIndex: pairReadings.personATimeIndex,
        personAGender: pairReadings.personAGender,
        personBSolarDate: pairReadings.personBSolarDate,
        personBTimeIndex: pairReadings.personBTimeIndex,
        personBGender: pairReadings.personBGender,
      })
      .from(pairReadings)
      .where(eq(pairReadings.id, bond.hehunReadingId))
      .get()
    if (reading) counterpart = resolveResonanceCounterpart(egoBirth, reading)
  }

  const egoInput = birthToInput(egoBirth)
  const partnerInput = counterpart ? birthToInput(counterpart) : null
  if (!egoInput || !counterpart || !partnerInput) {
    return jsonErr(c, 422, ApiErrorCode.conflict, 'Bond birth data incomplete')
  }

  const subject = resolveLlmGuardSubject({ userId })
  const result = await explainRelationshipTimelineNode(c.env, {
    self: { input: egoInput, gender: egoBirth.gender },
    partner: { input: partnerInput, gender: counterpart.gender },
    year: body.year,
    nodeType: body.nodeType,
    daYunOf: body.daYunOf,
    locale: body.locale,
    subject,
  })
  return jsonOk(c, result)
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

  if (!bond) {
    return jsonErr(c, 404, ApiErrorCode.not_found, 'Bond not found')
  }

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

  return jsonOk(c, {
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
  })
})

// ── GET /:id/synastry — 流日感应 (daily synastry for a bond) ──
// Accepts optional query param ?date=YYYY-MM-DD (defaults to UTC today)

bondRoutes.get('/:id/synastry', async (c) => {
  const bondId = c.req.param('id')
  const userId = requireUserId(c)
  const db = c.get('db')

  // Pro gate — daily synastry is a Pro feature
  const user = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).get()
  if (!user) {
    return jsonErr(c, 404, ApiErrorCode.not_found, 'User not found')
  }
  const isPro = await userHasCapability(db, userId, 'yuan')
  if (!isPro) {
    return jsonErr(
      c,
      403,
      ApiErrorCode.subscription_required,
      'Daily synastry requires Pro subscription'
    )
  }

  // Validate optional date param
  const dateParam = c.req.query('date')
  let targetYear: number
  let targetMonth: number
  let targetDay: number
  let targetDateStr: string
  if (dateParam) {
    if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateParam)) {
      return jsonErr(c, 400, ApiErrorCode.invalid_input, 'Invalid date format. Use YYYY-MM-DD.')
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

  if (!bond) {
    return jsonErr(c, 404, ApiErrorCode.not_found, 'Bond not found')
  }
  if (!bond.hehunReadingId) {
    return jsonErr(
      c,
      422,
      ApiErrorCode.conflict,
      'Synastry requires a completed compatibility reading'
    )
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

  if (!reading) {
    return jsonErr(c, 404, ApiErrorCode.not_found, 'Reading not found')
  }

  const inputA = parseSolarParts(reading.personASolarDate, reading.personATimeIndex)
  const inputB = parseSolarParts(reading.personBSolarDate, reading.personBTimeIndex)
  if (!inputA || !inputB) {
    return jsonErr(c, 422, ApiErrorCode.conflict, 'Invalid birth data in reading')
  }

  const pillarsA = getFourPillars(inputA)
  const pillarsB = getFourPillars(inputB)
  const todayGz = dayGanZhi(targetYear, targetMonth, targetDay)
  const result = calculateDailySynastry(pillarsA, pillarsB, todayGz, targetDateStr)

  return jsonOk(c, result)
})

// ── PATCH /:id — 修改关系标签/名称 / 阶段 ────────────────────
//
// Phase F: this endpoint now also accepts `relationshipStage` (previously a
// separate `PATCH /:id/stage` route). Per phase-f-plan §3.2 we collapsed the
// two into one unified mutation. Clients pass any subset of:
//   { targetName?, relationshipLabel?, relationshipStage? }
// At least one field is required. The legacy `/:id/stage` path is removed.

bondRoutes.patch('/:id', async (c) => {
  const bondId = c.req.param('id')
  const userId = requireUserId(c)

  const body = await c.req.json().catch(() => null)
  const parsed = updateBondSchema.safeParse(body)
  if (!parsed.success) {
    return jsonErr(c, 400, ApiErrorCode.invalid_input, 'Invalid bond update', {
      issues: parsed.error.issues,
    })
  }
  const input = parsed.data
  const db = c.get('db')

  const bond = await db
    .select({ id: userBonds.id, ownerId: userBonds.ownerId })
    .from(userBonds)
    .where(eq(userBonds.id, bondId))
    .get()

  if (!bond) {
    return jsonErr(c, 404, ApiErrorCode.not_found, 'Bond not found')
  }
  if (bond.ownerId !== userId) {
    return jsonErr(c, 403, ApiErrorCode.forbidden, 'Not your bond')
  }

  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (input.targetName !== undefined) patch.targetName = input.targetName
  if (input.relationshipLabel !== undefined) patch.relationshipLabel = input.relationshipLabel
  if (input.relationshipStage !== undefined) patch.relationshipStage = input.relationshipStage

  await db.update(userBonds).set(patch).where(eq(userBonds.id, bondId))

  return jsonOk(c, { id: bondId, ...input })
})

// ── POST /:id/unlock — B 解锁完整合盘 (消耗 5 coins) ────────

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

  if (!bond) {
    return jsonErr(c, 404, ApiErrorCode.not_found, 'Bond not found')
  }
  if (bond.status !== 'active') {
    return jsonErr(c, 400, ApiErrorCode.conflict, 'Bond is not active')
  }
  // Only B (non-owner) can call unlock; A already has full access
  if (bond.ownerId === userId) {
    return jsonErr(
      c,
      400,
      ApiErrorCode.conflict,
      'You already have full access as the bond creator'
    )
  }
  // Must own this bond (it must be the mirror bond in B's list)
  const accessible = await db
    .select({ id: userBonds.id })
    .from(userBonds)
    .where(and(eq(userBonds.id, bondId), eq(userBonds.ownerId, userId)))
    .get()
  if (!accessible) {
    return jsonErr(c, 403, ApiErrorCode.forbidden, 'Not your bond')
  }

  // Already fully unlocked
  if (bond.unlockedDimensions === '4') {
    return jsonOk(c, { alreadyUnlocked: true })
  }

  await db
    .update(userBonds)
    .set({ unlockedDimensions: '4', updatedAt: new Date().toISOString() })
    .where(eq(userBonds.id, bondId))

  return jsonOk(c, { unlocked: true })
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

  if (!bond) {
    return jsonErr(c, 404, ApiErrorCode.not_found, 'Bond not found')
  }
  if (bond.ownerId !== userId) {
    return jsonErr(c, 403, ApiErrorCode.forbidden, 'Only bond owner can gift')
  }
  if (bond.status !== 'active') {
    return jsonErr(c, 400, ApiErrorCode.conflict, 'Bond is not active')
  }
  if (!bond.mirrorBondId) {
    return jsonErr(c, 400, ApiErrorCode.conflict, 'No partner bond to gift (solo mode)')
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

  return jsonOk(c, { gifted: true })
})

// ── POST /:id/share ─ 创建合婚报告分享链接 ──────────────────

bondRoutes.post('/:id/share', async (c) => {
  const bondId = c.req.param('id')
  const userId = requireUserId(c)

  const { success: rlOk } = await c.env.RATE_LIMITER.limit({ key: `bond_share:${userId}` })
  if (!rlOk) {
    return jsonErr(c, 429, ApiErrorCode.quota_exhausted, 'Too many requests')
  }

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

  if (!bond) {
    return jsonErr(c, 404, ApiErrorCode.not_found, 'Bond not found')
  }
  if (bond.ownerId !== userId) {
    return jsonErr(c, 403, ApiErrorCode.forbidden, 'Not your bond')
  }
  if (bond.status !== 'active') {
    return jsonErr(c, 400, ApiErrorCode.conflict, 'Bond is not active')
  }
  if (!bond.hehunReadingId) {
    return jsonErr(c, 400, ApiErrorCode.conflict, 'No reading available for this bond')
  }

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

  if (!reading) {
    return jsonErr(c, 404, ApiErrorCode.not_found, 'Reading not found')
  }

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

  return jsonOk(c, { shareId, url: `${baseUrl}/report/${shareId}` }, 201)
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
    return jsonErr(c, 401, ApiErrorCode.unauthorized, 'Unauthorized')
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

  return jsonOk(
    c,
    data.map((r) => ({
      bondId: r.bondId,
      ownerUserId: r.ownerUserId,
      personASolarDate: r.personASolarDate,
      personATimeIndex: r.personATimeIndex,
      personBSolarDate: r.personBSolarDate,
      personBTimeIndex: r.personBTimeIndex,
      locale: r.ownerLocale ?? 'en',
    })),
    200,
    { cursor: hasMore ? String(cursor + limit) : undefined }
  )
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

  if (!bond) {
    return jsonErr(c, 404, ApiErrorCode.not_found, 'Bond not found')
  }
  if (bond.ownerId !== userId) {
    return jsonErr(c, 403, ApiErrorCode.forbidden, 'Not your bond')
  }

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

  return jsonOk(c, { id: bondId, status: 'removed' })
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
        <p style="margin:16px 0 0;border-top:1px solid #f4f4f5;padding-top:16px;font-size:10px;color:#a1a1aa;line-height:1.6;">
          You received this one-time invitation because ${inviterName} entered your email to connect on HexAstral.
          Your email is used only to deliver this invitation — it is not added to any mailing list, and no
          further emails are sent unless you respond. No action is needed to decline; the invitation expires on its own.
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}
