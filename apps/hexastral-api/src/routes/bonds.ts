/**
 * /api/bonds — 关系图谱 CRUD (Kindred·Bonds)
 *
 * 双模式: Solo (默念) + Resonance (共振)
 *
 * Solo:     A 输入 B 的生辰 → SVC_ASTRO 合盘 → 私密 reading (Pro/IAP required)
 * Resonance: A 发邮件邀请 → B 输入生辰 → 双向 bond + 双向 reading (3 free for viral growth)
 *
 * Bond limits: Free ≤ 3 (Resonance only), Pro/Premium = unlimited
 */

import type { ExecutionContext } from '@cloudflare/workers-types/2023-07-01'
import { STEM_WUXING, type ZiweiTimingSummary } from '@zhop/astro-core'
import { dayGanZhi, getFourPillars } from '@zhop/astro-core/ganzhi'
import { calculateDailySynastry } from '@zhop/astro-core/synastry'
import { and, eq, inArray, ne, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import * as schemaAll from '../db/schema'
import {
  bondInvitations,
  bondInviteCredits,
  pairReadings,
  sharedReports,
  singlePurchases,
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
  buildEgoLiuYue,
  buildEgoTimeline,
  type PairReadingBirth,
  type ResolvedBond,
  resolveResonanceCounterpart,
  resolveResonanceZiwei,
} from '../lib/bonds-timeline'
import { logEvent } from '../lib/event-log'
import { sendPushEvent } from '../lib/push'
import { buildBondMakeIf } from '../lib/relationship-makeif'
import { explainRelationshipTimelineNode } from '../lib/relationship-timeline-explain'
import { mailerClient } from '../lib/service-clients'
import { gateInterpretationChapters, resolveUnlockedChapterCount } from '../lib/synastry-chapters'
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

/** Day-master 五行 (金木水火土) from a stored birth — drives the report's ink
 *  centerpiece (生/克/比和). Privacy-safe: a coarse element, not the raw birth.
 *  Returns null on unparseable input. */
function dayMasterElement(solarDate: string, timeIndex: number): string | null {
  const parts = parseSolarParts(solarDate, timeIndex)
  if (!parts) return null
  try {
    return STEM_WUXING[getFourPillars(parts).day.stem]
  } catch {
    return null
  }
}

export const bondRoutes = new Hono<AppEnv>()

/** Free FULL *solo* readings before a solo bond falls back to the teaser (free
 *  chapters + unlock wall). Invites are uncapped and never draw from this. Subject
 *  to change — disclosed in Terms. */
const FREE_SOLO_FULL_READS = 2
const INVITATION_TTL_DAYS = 7

// ── Schemas ──────────────────────────────────────────────────

const personBirthSchema = z.object({
  solarDate: solarDateSchema,
  timeIndex: z.int().min(0).max(12),
  /** 精确出生分钟数 0-1439（精确模式）→ 真太阳时校准；与本人侧 / solo 对齐。 */
  clockMinutes: z.int().min(0).max(1439).optional(),
  calibrate: z.boolean().optional(),
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
  /**
   * Cross-app hand-off from Auspice (the 亲友 → Kindred funnel). When set, the
   * compatibility paywall is skipped so the imported bond lands on a real report
   * — but only the free 3 chapters (chaptersUnlocked stays false; the rest unlock
   * via the wall). Abuse is bounded by the free ≤3-bond limit checked above, so
   * no extra cap is needed.
   */
  fromHandoff: z.boolean().optional().default(false),
})

const resonanceInviteSchema = z.object({
  /**
   * Optional. Only used server-side when `deliveryMode === 'server'`
   * (legacy path); for `deliveryMode === 'user'` the email is composed
   * entirely on A's device via mailto and never reaches the server.
   * Stored as empty string in the user-initiated path so the database
   * column (non-null) remains valid while holding no PII for B.
   */
  targetEmail: z.string().email().max(254).optional(),
  targetName: z.string().min(1).max(50),
  relationshipLabel: z.string().min(1).max(30),
  message: z.string().max(500).optional(),
  /**
   * `'user'` (default): the server never sends an email. A's device opens
   *   the system mail composer (mailto:) with a server-provided locale-aware
   *   subject + body containing the invitation link. Eliminates the
   *   cross-jurisdiction commercial-email exposure (JP 特定電子メール法,
   *   SG Spam Control Act, MY PDPA, US CAN-SPAM) because the message
   *   originates from A's personal mailbox.
   * `'server'` (legacy): existing flow — the server sends a hardened
   *   transactional invite via SES. Retained for clients without mailto
   *   support; subject is `<ADV>`-prefixed for English to satisfy SG SCA.
   */
  deliveryMode: z.enum(['server', 'user']).default('user').optional(),
  /**
   * Locale A is composing in (app `resolveLocale()` → 'en' | 'zh' | 'zh-Hant'
   * | 'ja'). Used for the share message body + the resonate landing URL so the
   * invite stays in A's language. Optional for older clients; falls back to the
   * stored user locale, then 'en'.
   */
  language: z.string().max(16).optional(),
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

/** The pair_combo_uniq columns — one reading per (user, A-birth, B-birth). */
const PAIR_COMBO_TARGET = [
  pairReadings.userId,
  pairReadings.personASolarDate,
  pairReadings.personATimeIndex,
  pairReadings.personBSolarDate,
  pairReadings.personBTimeIndex,
]

/**
 * Insert a pair reading, or — when one already exists for this
 * (userId, A-birth, B-birth) combo (pair_combo_uniq) — refresh it in place and reuse
 * its id. Returns the id the bond should link to. Makes reading creation idempotent so
 * a re-accept, a solo bond recreated after a delete, or a same-device self-invite
 * (where the inviter + responder rows resolve to the same combo) no longer 500 with
 * "UNIQUE constraint failed: pair_readings…".
 */
async function upsertPairReading(
  db: AppDb,
  values: typeof pairReadings.$inferInsert
): Promise<string> {
  const {
    id: _id,
    userId: _userId,
    personASolarDate: _aDate,
    personATimeIndex: _aTime,
    personBSolarDate: _bDate,
    personBTimeIndex: _bTime,
    ...refresh
  } = values
  const [row] = await db
    .insert(pairReadings)
    .values(values)
    .onConflictDoUpdate({ target: PAIR_COMBO_TARGET, set: refresh })
    .returning({ id: pairReadings.id })
  return row?.id ?? values.id
}

/** Bond limit check result. `allowed: false` callers should respond via jsonErr. */
const YUAN_PRO_PRODUCT_IDS = {
  monthly: 'hexastral_kindred_pro_monthly',
  annual: 'hexastral_kindred_pro_annual',
} as const

/** Informational free-tier usage, surfaced on GET / for display. `used` = FULL
 *  *solo* readings consumed (mode='solo' + chaptersUnlocked); `limit` =
 *  FREE_SOLO_FULL_READS. Counts all rows incl. soft-deleted, so "Let go" can't
 *  refund a free slot. The server NEVER blocks create on this — over-allowance
 *  solo bonds simply land on the teaser, and invites are uncapped. (The mobile
 *  "pre-empt New Thread" gate is now informational only and must not block
 *  invites — a client follow-up.) */
interface BondQuota {
  isPro: boolean
  used: number
  limit: number
}

async function getBondQuota(db: AppDb, userId: string): Promise<BondQuota> {
  // Count real solo unlocks for EVERYONE — Pro is the 体验层 and no longer grants
  // free 合盘 unlocks, so a subscriber gets the same 2 free solo reads then buys
  // per report. `isPro` stays in the payload for display only.
  const isPro = await userHasCapability(db, userId, 'kindred')
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userBonds)
    .where(
      and(
        eq(userBonds.ownerId, userId),
        eq(userBonds.mode, 'solo'),
        eq(userBonds.chaptersUnlocked, true)
      )
    )
  return { isPro, used: row?.count ?? 0, limit: FREE_SOLO_FULL_READS }
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
      birthClockMinutes: users.birthClockMinutes,
      birthSolarCalibrate: users.birthSolarCalibrate,
      birthLongitude: users.birthLongitude,
      birthTimezoneId: users.birthTimezoneId,
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

  // Free model: a solo bond is always free to CREATE (no up-front paywall, no
  // bond cap). The first FREE_SOLO_FULL_READS solo bonds get the FULL report;
  // beyond that — and for the Auspice hand-off — it lands on the teaser (free
  // chapters + unlock wall), unlocked later via Pro or a single purchase. The
  // unlock decision (`soloUnlock`) is computed below once Pro status is known.

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

  // Call SVC_ASTRO hehun/compute. `isPro` only sets the AI tier for generation — it
  // no longer unlocks chapters (Yuel Pro = 体验层; 合盘 is single-purchase).
  const isPro = await userHasCapability(db, user.id, 'kindred')

  // Full report for the first FREE_SOLO_FULL_READS free solo bonds; beyond that,
  // and for the Auspice hand-off, the bond lands on the teaser (unlocked later by a
  // single purchase — NOT by a subscription).
  const soloUnlock =
    !input.fromHandoff && (await getBondQuota(db, userId)).used < FREE_SOLO_FULL_READS

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
      // 真太阳时 (同 solo / 本人侧)：A 的精确时间来自 users 行。
      clockMinutes: user.birthClockMinutes ?? undefined,
      calibrate: user.birthSolarCalibrate ?? undefined,
      longitude: user.birthLongitude != null ? Number(user.birthLongitude) : undefined,
      timezoneId: user.birthTimezoneId ?? undefined,
      city: user.birthCity ?? undefined,
    },
    personB: {
      solarDate: input.targetBirth.solarDate,
      timeIndex: input.targetBirth.timeIndex,
      gender: input.targetBirth.gender,
      name: input.targetName,
      clockMinutes: input.targetBirth.clockMinutes ?? undefined,
      calibrate: input.targetBirth.calibrate ?? undefined,
      longitude:
        input.targetBirth.longitude != null ? Number(input.targetBirth.longitude) : undefined,
      timezoneId: input.targetBirth.timezoneId ?? undefined,
      city: input.targetBirth.city ?? undefined,
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

  // Save hehun reading (idempotent: reuse the existing row if this exact pair was
  // read before, so recreating a deleted solo bond can't 500 on pair_combo_uniq).
  const bondId = crypto.randomUUID()

  const readingId = await upsertPairReading(db, {
    id: crypto.randomUUID(),
    userId,
    // Solo bond: the creator is personA (甲).
    ownerIsPersonA: true,
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
  })

  await db.insert(userBonds).values({
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
    // Full six chapters for the first FREE_SOLO_FULL_READS free solo bonds (or
    // Pro); beyond that, and for the Auspice hand-off, land on the free chapters
    // + unlock wall. See soloUnlock above.
    chaptersUnlocked: soloUnlock,
    status: 'active',
  })

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

  // Invites are uncapped — sharing is the viral action and is never blocked. The
  // full-vs-teaser decision happens at accept (acquisition unlocks; see respond).

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

  const deliveryMode = input.deliveryMode ?? 'user'
  // In user-initiated mode, deliberately discard any targetEmail the client
  // may have supplied — B's email must never reach our database. The mailto
  // recipient is set on A's device using A's locally-held input.
  const normalizedEmail =
    deliveryMode === 'server' ? input.targetEmail?.trim().toLowerCase() : undefined

  // Self-invite check — only meaningful when the inviter declared a target
  // email (server delivery). User mode has no email to compare against.
  if (normalizedEmail && user.email && normalizedEmail === user.email.toLowerCase()) {
    return jsonErr(c, 400, ApiErrorCode.invalid_input, 'Cannot invite yourself')
  }

  // Dedup by (inviter, targetEmail) — only when we actually hold the email.
  // For user-initiated invites without a stored email, A can issue multiple
  // pending invitations; cleanup happens on accept/decline/expiry.
  if (normalizedEmail) {
    const existing = await db
      .select({ id: bondInvitations.id })
      .from(bondInvitations)
      .where(
        and(
          eq(bondInvitations.inviterUserId, userId),
          eq(bondInvitations.targetEmail, normalizedEmail),
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
      // Empty-string sentinel for user-initiated invites — keeps the existing
      // NOT NULL constraint valid without storing PII for B. The /respond
      // handler treats `''` as "no email-match check required" and falls back
      // to token-only matching.
      targetEmail: normalizedEmail ?? '',
      token,
      status: 'pending',
      message: input.message ?? null,
      expiresAt: expiresAt(),
    }),
  ])

  // Persist A's compose locale. The kindred client never syncs users.locale on
  // registration (only `{ id }` is sent), so without this A's locale stays the
  // 'zh' default and the accept handler can't regenerate A's mirror report in
  // A's language (see /invite/:token/respond). This is also the daily-fortune
  // language, so refreshing it on every invite keeps it current.
  if (input.language) {
    await db.update(users).set({ locale: input.language }).where(eq(users.id, userId))
  }

  const inviterName = user.name ?? 'Someone'
  // Locale priority: request language (A's app locale) → stored user locale →
  // 'en'. Previously defaulted to 'zh', so any user without a stored locale got
  // a Chinese share message + landing even when composing in English.
  const locale = input.language ?? user.locale ?? 'en'
  const resonateUrl = `https://hexastral.com/${webLocalePrefix(locale)}resonate/${token}`

  if (deliveryMode === 'server') {
    // Legacy / fallback path — server sends the hardened transactional invite.
    // Only reached when the client explicitly opts in (older builds without
    // mailto support); new clients default to `user` mode where this branch
    // is skipped entirely and no email leaves our infrastructure.
    if (!normalizedEmail) {
      return jsonErr(
        c,
        400,
        ApiErrorCode.missing_required,
        'targetEmail required for server delivery mode'
      )
    }
    const html = buildInvitationEmailHtml({
      inviterName,
      relationshipLabel: input.relationshipLabel,
      message: input.message,
      resonateUrl,
      locale,
    })
    try {
      await mailerClient.post(c.env.SVC_MAILER, '/send', {
        to: normalizedEmail,
        subject: buildInvitationSubject({ inviterName, locale }),
        html,
        ...(user.email ? { replyTo: user.email } : {}),
      })
    } catch {
      return jsonErr(c, 502, ApiErrorCode.upstream_unavailable, 'Failed to send invitation email')
    }
  }

  c.executionCtx.waitUntil(
    logEvent(db, userId, 'bond_create', {
      bondId,
      invitationId,
      mode: 'resonance',
      deliveryMode,
      label: input.relationshipLabel,
      ...(normalizedEmail && deliveryMode === 'server' ? { targetEmail: normalizedEmail } : {}),
    })
  )

  return jsonOk(
    c,
    {
      bondId,
      invitationId,
      status: 'pending_invite',
      token,
      resonateUrl,
      deliveryMode,
      // mailto template — A's device composes the actual email. Always
      // returned so the client has a graceful fallback even when it opted
      // into server delivery.
      mailto: buildInvitationMailto({
        inviterName,
        relationshipLabel: input.relationshipLabel,
        message: input.message,
        resonateUrl,
        locale,
      }),
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
    // True when the inviter actually has a stored name (Apple sign-in /
    // explicit profile name). Lets the recipient surface know whether
    // "Invitation from {name}" is honest or just a fallback — when false,
    // the web page should use a name-less phrasing instead of "From Someone".
    inviterHasName: !!inviter?.name,
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
            interpretation: pairReadings.interpretation,
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

  // The ahaHook is the single most striking line — lead the teaser with it.
  let ahaHook: string | undefined
  if (reading?.interpretation) {
    try {
      const parsed = JSON.parse(reading.interpretation) as { ahaHook?: unknown }
      if (typeof parsed.ahaHook === 'string' && parsed.ahaHook) ahaHook = parsed.ahaHook
    } catch {
      // ignore — teaser still works without it
    }
  }

  return jsonOk(c, {
    selfName: inviter?.name ?? 'Someone',
    otherName: bond.targetName,
    ahaHook,
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
  // Email-match check only runs when A's invite stored a target email
  // (legacy `deliveryMode: 'server'` path). In the user-initiated mailto
  // path, `invitation.targetEmail` is an empty string by design — A's
  // device sent the link directly, so the token in the URL is the
  // sufficient authorization. We still require the responder to have an
  // account; we just don't pin them to a specific bound email.
  const storedTargetEmail = invitation.targetEmail?.trim().toLowerCase() ?? ''
  if (storedTargetEmail) {
    if (!responder.email) {
      return jsonErr(
        c,
        400,
        ApiErrorCode.missing_required,
        'Link your email in Settings before responding'
      )
    }
    if (responder.email.toLowerCase() !== storedTargetEmail) {
      return jsonErr(
        c,
        403,
        ApiErrorCode.forbidden,
        'Invitation email mismatch. Please sign in with the invited email.'
      )
    }
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

  // NO access gate here. Resonance (invite → accept) is FREE for BOTH parties by
  // design — it's the viral loop, not a paid surface (the $6.99 wall lives on
  // SOLO bonds where A enters someone's birth directly; see the create handler's
  // checkReadingAccess). The invited party must always be able to complete the
  // Thread they were invited to.
  //
  // BUG (fixed): this used to call checkReadingAccess(..., allowBondInviteCredit:
  // true), which tries to CONSUME a bond-invite credit — but B's credit is only
  // GRANTED ~200 lines below, AFTER the reading is computed. So B had no credit
  // yet, fell through to "purchase_required", and 403'd before ever reaching the
  // grant. Net effect: every invited user paywalled and the resonance flow never
  // completed for anyone. Removing the gate matches the "free for both" intent
  // documented immediately below.
  const isPro = await userHasCapability(db, inviter.id, 'kindred')

  // Resonance bonds use the standard AI tier (not Pro HIGH thinking); isPro only
  // controls AI quality, not access gating.

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
      clockMinutes: inviter.birthClockMinutes ?? undefined,
      calibrate: inviter.birthSolarCalibrate ?? undefined,
      longitude: inviter.birthLongitude != null ? Number(inviter.birthLongitude) : undefined,
      timezoneId: inviter.birthTimezoneId ?? undefined,
      city: inviter.birthCity ?? undefined,
    },
    personB: {
      solarDate: input.birthData.solarDate,
      timeIndex: input.birthData.timeIndex,
      gender: input.birthData.gender,
      clockMinutes: input.birthData.clockMinutes ?? undefined,
      calibrate: input.birthData.calibrate ?? undefined,
      longitude: input.birthData.longitude != null ? Number(input.birthData.longitude) : undefined,
      timezoneId: input.birthData.timezoneId ?? undefined,
      city: input.birthData.city ?? undefined,
    },
    userId: invitation.inviterUserId,
    isPro,
    language: input.language,
    relationshipCategory: resonanceDerivedCategory,
    customRelationshipLabel: resonanceDerivedCustomLabel,
  })

  // Stamp the language this prose was generated in. B (the responder) reads in
  // their own locale (input.language); both mirror rows get this version now and
  // A's is upgraded to A's locale in the background below. The stamp lets a
  // future GET-time check tell which language a row holds.
  interpretation.language = input.language

  // Save two mirrored reading rows so both A/B history libraries can resolve by ownerId.
  // Idempotent: reuse each side's existing row if this pair was already read (a
  // re-accept, or a same-device self-invite where both rows share the combo) so the
  // accept can't 500 on pair_combo_uniq.
  const readingIdForInviter = await upsertPairReading(db, {
    id: crypto.randomUUID(),
    userId: invitation.inviterUserId,
    // Inviter's library row — the inviter IS personA (甲).
    ownerIsPersonA: true,
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
  })

  const readingIdForResponder = await upsertPairReading(db, {
    id: crypto.randomUUID(),
    userId: respondUserId,
    // Responder's library row — the responder is personB (乙), never personA.
    ownerIsPersonA: false,
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
  })

  // Get or create B's bond (mirror)
  const bond = await db
    .select({ targetName: userBonds.targetName, relationshipLabel: userBonds.relationshipLabel })
    .from(userBonds)
    .where(eq(userBonds.id, invitation.bondId))
    .get()

  const mirrorBondId = crypto.randomUUID()

  // Acquisition gate: a real connection unlocks the FULL report for both sides
  // ONLY when the accepter is NEW to 合盘 (no prior bonds) — the referral reward.
  // If the accepter already has bonds, this isn't acquisition, so each side stays
  // on the teaser (unlocked later by a single purchase — NOT by a subscription;
  // Yuel Pro is the 体验层). The accepter's mirror bond isn't inserted yet, so a
  // 0-count means a genuinely new member.
  const [accepterPriorBonds] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userBonds)
    .where(eq(userBonds.ownerId, respondUserId))
  const accepterIsNew = (accepterPriorBonds?.count ?? 0) === 0
  const inviterUnlock = accepterIsNew
  const responderUnlock = accepterIsNew

  // Update invitation + A's bond. A's synastry chapters for THIS bond unlock via
  // the per-bond `chaptersUnlocked` flag set below — the only synastry unlock path.
  // A 合盘 accept deliberately does NOT touch users.unlockedChapterCount: the natal
  // deep report (chapter-access.ts) has its own invite mechanic and must not be
  // unlocked for free by a relationship invitation.
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
        // Full report on A's bond only when this accept brought a NEW member
        // (acquisition); otherwise A stays on the teaser (single-purchase to unlock,
        // not subscription). Per-bond is the authoritative (and only) unlock path.
        chaptersUnlocked: inviterUnlock,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userBonds.id, invitation.bondId)),
  ])

  await db.insert(userBonds).values({
    id: mirrorBondId,
    ownerId: respondUserId,
    targetUserId: invitation.inviterUserId,
    // Never store the literal "Unknown": when the inviter signed up without a
    // name (no Apple full-name scope), fall back to the relationship label A
    // chose for the bond, else empty — the client gracefully resolves a display
    // name from relationshipLabel/你 (see (bonds)/[id].tsx, ThreadRow).
    targetName: inviter.name ?? (bond?.relationshipLabel || ''),
    relationshipLabel: bond?.relationshipLabel ?? '',
    mode: 'resonance',
    hehunReadingId: readingIdForResponder,
    mirrorBondId: invitation.bondId,
    unlockedDimensions: '4',
    // The invited party's mirror bond: a NEW accepter's first 合盘 is full (the
    // hook); an existing accepter stays on the teaser (single-purchase to unlock).
    chaptersUnlocked: responderUnlock,
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
        responderEmail: responder.email ?? null,
        responderName: responder.name ?? null,
        relationshipLabel: bond?.relationshipLabel ?? '',
      }),
    ])
  )

  // Per-recipient language: A (the inviter) should read the report in A's locale,
  // not B's. The synastry compute is deterministic (same births → identical
  // score/grade/dimensions), so only the AI prose differs — regenerate it in A's
  // locale and update A's mirror row in place. Best-effort (waitUntil); on any
  // failure A keeps the B-language version stored above. Skipped when A and B
  // share a locale (the version we already stored is correct for both).
  const inviterLang = inviter.locale ?? null
  if (inviterLang && inviterLang !== input.language && input.birthData) {
    const aBirth = input.birthData
    c.executionCtx.waitUntil(
      (async () => {
        try {
          const a = await callAstro<{
            result: { compatibility: Record<string, unknown> }
            interpretation: Record<string, string>
          }>(c.env.SVC_ASTRO, '/pair/compute', {
            personA: {
              solarDate: inviter.birthSolarDate,
              timeIndex: inviter.birthTimeIndex,
              gender: inviter.birthGender,
              name: inviter.name,
            },
            personB: {
              solarDate: aBirth.solarDate,
              timeIndex: aBirth.timeIndex,
              gender: aBirth.gender,
            },
            userId: invitation.inviterUserId,
            isPro,
            language: inviterLang,
            relationshipCategory: resonanceDerivedCategory,
            customRelationshipLabel: resonanceDerivedCustomLabel,
          })
          const aInterp = a.interpretation
          aInterp.language = inviterLang
          await db
            .update(pairReadings)
            .set({
              score: a.result.compatibility.score as number,
              grade: a.result.compatibility.grade as string,
              archetypeName: aInterp.archetypeName ?? null,
              archetypeTagline: aInterp.archetypeTagline ?? null,
              archetypeCategory:
                (aInterp.archetypeCategory as
                  | 'harmony'
                  | 'tension'
                  | 'growth'
                  | 'karmic'
                  | 'volatile'
                  | undefined) ?? null,
              hookDimension:
                (aInterp.hookDimension as
                  | 'long_term'
                  | 'communication'
                  | 'attraction'
                  | 'emotional'
                  | undefined) ?? null,
              compatibilityData: JSON.stringify(a.result.compatibility),
              interpretation: JSON.stringify(aInterp),
            })
            .where(eq(pairReadings.id, readingIdForInviter))
        } catch {
          // best-effort — A keeps the B-language fallback stored synchronously above
        }
      })()
    )
  }

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
    // The accept screen navigates to `result.bondId` (RespondResult contract) —
    // B's OWN mirror bond. It was only returned as `mirrorBondId`, so
    // result.bondId was undefined and "Open the thread" routed to
    // /(bonds)/undefined: a dead screen that looked stuck/pending even though
    // the accept fully succeeded server-side. Return it as `bondId` too.
    bondId: mirrorBondId,
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
      ownerIsPersonA: boolean | null
      generatedAt: string
      personASolarDate: string
      personATimeIndex: number
      personAGender: string
      personBSolarDate: string
      personBTimeIndex: number
      personBGender: string
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
        ownerIsPersonA: pairReadings.ownerIsPersonA,
        generatedAt: pairReadings.createdAt,
        personASolarDate: pairReadings.personASolarDate,
        personATimeIndex: pairReadings.personATimeIndex,
        personAGender: pairReadings.personAGender,
        personBSolarDate: pairReadings.personBSolarDate,
        personBTimeIndex: pairReadings.personBTimeIndex,
        personBGender: pairReadings.personBGender,
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
  const isPro = await userHasCapability(db, userId, 'kindred')

  // Viewer's current birth — used to flag bonds whose reading predates a later
  // birth-info edit. The report is a snapshot; changing your birth doesn't touch
  // it (see GET /:id), so the list tags those reports as "based on earlier birth".
  // Coarse fields only (solarDate / timeIndex / gender) — matches the snapshot grain.
  const viewer = await db
    .select({ d: users.birthSolarDate, ti: users.birthTimeIndex, g: users.birthGender })
    .from(users)
    .where(eq(users.id, userId))
    .get()

  // Compute today's day pillar once for synastry
  const now = new Date()
  const todayGanZhi = dayGanZhi(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate())
  const todayDateStr = now.toISOString().slice(0, 10)

  const enriched = ownBonds.map((b) => {
    const reading = b.hehunReadingId ? readingMap.get(b.hehunReadingId) : null
    const targetUser = b.targetUserId ? userMap.get(b.targetUserId) : null
    const invitation = invitationMap.get(b.id)

    // A report is "stale" once it no longer reflects the viewer's current birth.
    // The viewer is personA or personB depending on the bond; rather than resolve
    // the side, flag stale when NEITHER snapshot matches current birth — exactly the
    // case after the viewer edits their own birth (their old slot stops matching,
    // and the counterpart never matched).
    const basedOnStaleBirth =
      !!reading &&
      viewer?.d != null &&
      !(
        reading.personASolarDate === viewer.d &&
        reading.personATimeIndex === viewer.ti &&
        reading.personAGender === viewer.g
      ) &&
      !(
        reading.personBSolarDate === viewer.d &&
        reading.personBTimeIndex === viewer.ti &&
        reading.personBGender === viewer.g
      )

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

    // Coarse day-master 五行 for both parties (privacy D2: element only, never
    // raw birth). Drives the list/home 意象 chip — the 生克平 essence that
    // replaces the blunt numeric score (see EssenceTag).
    const aElement = reading
      ? dayMasterElement(reading.personASolarDate, reading.personATimeIndex)
      : null
    const bElement = reading
      ? dayMasterElement(reading.personBSolarDate, reading.personBTimeIndex)
      : null
    // The OTHER person's element from the VIEWER's side — drives this thread's star
    // (sky) + list dot, so each bond shows up in its own 五行 colour. Viewer is
    // personA unless the stamped flag says otherwise (legacy null → assume A).
    const counterpartElement = reading?.ownerIsPersonA === false ? aElement : bElement

    return {
      ...b,
      score: reading?.score ?? null,
      grade: reading?.grade ?? null,
      aElement,
      bElement,
      counterpartElement,
      // When the report was generated (resonance: B-accept time, not the invite).
      generatedAt: reading?.generatedAt ?? null,
      archetypeName: reading?.archetypeName ?? null,
      archetypeTagline: reading?.archetypeTagline ?? null,
      archetypeCategory: reading?.archetypeCategory ?? null,
      hookDimension: reading?.hookDimension ?? null,
      targetUser,
      invitation: invitation ?? null,
      todaySynastry,
      basedOnStaleBirth,
    }
  })

  // Quota rides along on the list (the home already fetches this) so the client can
  // gate "New Thread" up-front instead of letting the user fill the form and bounce
  // off the create-time 403 (2026-06 feedback).
  const quota = await getBondQuota(db, userId)

  return jsonOk(c, { bonds: enriched, quota }, 200, { total: enriched.length })
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
// 闸 (BT.6 → Phase 3, 2026-06): 深度分层, 不再是硬墙。免费层得「近 3 月流月」近期尝鲜
// (轻量), 十年全轴 + 满 12 月流月 + 主动推送时刻表 仍为 Pro 护城河。免费层**绝不**跑
// buildEgoTimeline (旧「免费=当前年全部 bond」那条偶发悬挂的重路径) —— 只跑小窗口
// buildEgoLiuYue; 配合客户端 20s 超时, 即使偶发慢也退化为 error+retry, 不再无限 loading。
//
// 注意路由顺序: 静态 `/timeline` 须先于 `/:id` 命中 (Hono RegExpRouter 静态优先, 仍置于前)。
bondRoutes.get('/timeline', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')

  const isPro = await userHasCapability(db, userId, 'kindred')

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
        ziweiSummaryA: pairReadings.ziweiSummaryA,
        ziweiSummaryB: pairReadings.ziweiSummaryB,
      })
      .from(pairReadings)
      .where(inArray(pairReadings.id, resonanceReadingIds))
    for (const r of readings) readingMap.set(r.id, r)
  }

  // 本我紫微摘要 — 任一 resonance reading 里本我侧的摘要 (跨 bond 同一人, 取首个有效)。
  let egoZiwei: ZiweiTimingSummary | undefined
  const resolved: ResolvedBond[] = []
  for (const r of rows) {
    let counterpart: BirthTriple | null = null
    let counterpartZiwei: ZiweiTimingSummary | undefined
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
      if (reading) {
        counterpart = resolveResonanceCounterpart(egoBirth, reading)
        const z = resolveResonanceZiwei(egoBirth, reading)
        counterpartZiwei = z.counterpartZiwei
        if (!egoZiwei && z.egoZiwei) egoZiwei = z.egoZiwei
      }
    }
    if (!counterpart) continue
    resolved.push({
      bondId: r.id,
      name: r.targetName,
      relationshipLabel: r.relationshipLabel,
      counterpart,
      counterpartZiwei,
    })
  }

  // 免费层 (Phase 3): 只给近 3 月流月尝鲜 —— 轻量(小窗口), 绝不跑 buildEgoTimeline。
  // 十年全轴 / 满 12 月流月 / 推送 均 Pro 护城河。
  if (!isPro) {
    const liuyue = buildEgoLiuYue(egoBirth, resolved, { fromDate: new Date(), months: 3 })
    return jsonOk(c, {
      nodes: [],
      liuyue,
      notifications: [],
      pro: false,
      upsell: { capability: 'kindred', iapProductIds: YUAN_PRO_PRODUCT_IDS },
    })
  }

  // Pro: 全部 bond 进合并，前瞻全轴 + 满 12 月流月 + 推送时刻表。默认前瞻 10 年(短期最有
  // 意义); `?horizon=far` 打开更远(隐蔽口子, 30 年)。每年保留平年锚点(keepRoutineYears)。
  const currentYear = new Date().getUTCFullYear()
  const far = c.req.query('horizon') === 'far'
  const timeline = buildEgoTimeline(egoBirth, resolved, {
    fromYear: currentYear,
    toYear: currentYear + (far ? 30 : 10),
    keepRoutineYears: true,
    notifyFromDate: new Date(),
    // 紫微 第二系统印证: 八字显著 + 紫微亦点亮关系宫的年份升档显著度 (两套系统不约而同)。
    egoZiwei,
  })

  // 流月 living layer (近期月度明细) —— 满 12 个月 (订阅价值)。无推送 (流月不推)。
  timeline.liuyue = buildEgoLiuYue(egoBirth, resolved, {
    fromDate: new Date(),
    months: 12,
  })

  return jsonOk(c, { ...timeline, pro: true })
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
    // server-to-server births → 紫微 流年印证 (P4); never sent to the device.
    selfBirth: egoBirth,
    partnerBirth: counterpart,
  })
  return jsonOk(c, result)
})

// ── POST /:id/makeif — 关系决策推演 (Workstream B, ADR-0023 forward-decision frame) ──
//
// "假如我们在某个窗口推进这段关系，哪个时机最合？" Ranks the bond's forward 流月 windows
// by 用神 alignment + 冲/合 and returns a deterministic verdict. Forward-only (never
// past rumination — the risky use the Auspice S5 cut flagged). Pro/subscription gated
// (living layer). Privacy D2: only derived facts (月柱/五行/冲合/评分), never raw birth.
bondRoutes.post('/:id/makeif', async (c) => {
  const bondId = c.req.param('id')
  const userId = requireUserId(c)
  const db = c.get('db')

  // Depth-gated (Phase 3): both tiers compute below; free is handed the near-term
  // monthly windows and the 10-year `longterm` tier is withheld (Pro moat). The
  // make-if is a per-bond compute (no heavy ego merge), so the free path is light.
  const isPro = await userHasCapability(db, userId, 'kindred')

  // 本我盘 (D2: 仅 users 持全精度本我盘)
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
    return jsonErr(
      c,
      400,
      ApiErrorCode.missing_required,
      'Complete your birth info to run a relationship make-if'
    )
  }
  const egoBirth: BirthTriple = {
    solarDate: ego.birthSolarDate,
    timeIndex: ego.birthTimeIndex,
    gender: ego.birthGender as '男' | '女',
  }

  const bond = await db
    .select({
      id: userBonds.id,
      mode: userBonds.mode,
      relationshipLabel: userBonds.relationshipLabel,
      hehunReadingId: userBonds.hehunReadingId,
      targetBirthSolarDate: userBonds.targetBirthSolarDate,
      targetBirthTimeIndex: userBonds.targetBirthTimeIndex,
      targetBirthGender: userBonds.targetBirthGender,
    })
    .from(userBonds)
    .where(and(eq(userBonds.id, bondId), eq(userBonds.ownerId, userId)))
    .get()
  if (!bond) {
    return jsonErr(c, 404, ApiErrorCode.not_found, 'Bond not found')
  }

  // 对方盘: solo → userBonds.targetBirth*; resonance → pairReadings + 非对称解析 (D2 服务端持盘)
  let counterpart: BirthTriple | null = null
  let egoZiwei: ZiweiTimingSummary | undefined
  let counterpartZiwei: ZiweiTimingSummary | undefined
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
        ziweiSummaryA: pairReadings.ziweiSummaryA,
        ziweiSummaryB: pairReadings.ziweiSummaryB,
      })
      .from(pairReadings)
      .where(eq(pairReadings.id, bond.hehunReadingId))
      .get()
    if (reading) {
      counterpart = resolveResonanceCounterpart(egoBirth, reading)
      const z = resolveResonanceZiwei(egoBirth, reading)
      egoZiwei = z.egoZiwei
      counterpartZiwei = z.counterpartZiwei
    }
  }
  if (!counterpart) {
    return jsonErr(
      c,
      400,
      ApiErrorCode.missing_required,
      'This bond has no birth info yet for a make-if'
    )
  }

  // Near-term monthly windows (always, free taste) + the 10-year `longterm` tier
  // (Pro only — withheld for free so the upsell has something to sell). 紫微 第二
  // 系统印证 folds into each window's score when both summaries exist (A=本我/B=对方).
  const now = new Date()
  const makeif = buildBondMakeIf(egoBirth, counterpart, {
    fromDate: now,
    months: 12,
    ziweiA: egoZiwei,
    ziweiB: counterpartZiwei,
    relationshipLabel: bond.relationshipLabel,
    ...(isPro ? { fromYear: now.getUTCFullYear(), years: 10 } : {}),
  })
  return jsonOk(c, {
    ...makeif,
    pro: isPro,
    ...(isPro ? {} : { upsell: { capability: 'kindred', iapProductIds: YUAN_PRO_PRODUCT_IDS } }),
  })
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
      chaptersUnlocked: userBonds.chaptersUnlocked,
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
  // True when the reading's birth snapshot no longer matches the viewer's current
  // birth (they edited it after generation). Powers the report's "recompute with
  // new birth" affordance. Same rule as GET / (neither snapshot matches current).
  let basedOnStaleBirth = false
  // Which side of the reading the VIEWER is. Both mirror rows store personA=inviter /
  // personB=invitee and the prose is written once with 甲方/乙方 tokens, so the client
  // must know the viewer's role to render "you" correctly. Owner-id can't tell them
  // apart (each viewer owns their own bond), so match the viewer's birth to the
  // snapshot (same rule as basedOnStaleBirth). Default A on a stale/absent match.
  let viewerIsPersonA = true

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
        ownerIsPersonA: pairReadings.ownerIsPersonA,
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
      // Surface both day-master 五行 so the report screen can render the ink
      // centerpiece (生/克/比和). Coarse element only — D2-safe (not raw birth).
      if (interpretation) {
        const elA = dayMasterElement(rawReading.personASolarDate, rawReading.personATimeIndex)
        const elB = dayMasterElement(rawReading.personBSolarDate, rawReading.personBTimeIndex)
        if (elA) interpretation.personAElement = elA
        if (elB) interpretation.personBElement = elB
      }
      // Flag a report that predates a later birth-info edit — its snapshot no longer
      // matches the viewer's current birth. Report stays as-is; the client offers a
      // Pro "recompute with new birth". (Rule mirrors GET /: neither slot matches.)
      const me = await db
        .select({ d: users.birthSolarDate, ti: users.birthTimeIndex, g: users.birthGender })
        .from(users)
        .where(eq(users.id, userId))
        .get()
      basedOnStaleBirth =
        me?.d != null &&
        !(
          rawReading.personASolarDate === me.d &&
          rawReading.personATimeIndex === me.ti &&
          rawReading.personAGender === me.g
        ) &&
        !(
          rawReading.personBSolarDate === me.d &&
          rawReading.personBTimeIndex === me.ti &&
          rawReading.personBGender === me.g
        )
      // Prefer the role STAMPED on the row at creation (immune to a later birth
      // edit — the invitee stays the invitee). Fall back to birth-matching only for
      // legacy rows written before the flag existed (null): viewer is B only when
      // their birth matches the B snapshot, else default A.
      viewerIsPersonA =
        rawReading.ownerIsPersonA ??
        !(
          me?.d != null &&
          rawReading.personBSolarDate === me.d &&
          rawReading.personBTimeIndex === me.ti &&
          rawReading.personBGender === me.g
        )
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
            token: bondInvitations.token,
          })
          .from(bondInvitations)
          .where(eq(bondInvitations.id, bond.invitationId))
          .get()
      : null

  // Re-share link should open the landing in the viewer's (A's) language, same
  // as the create path. Only looked up when there's actually a pending invite.
  let viewerLocale = 'en'
  if (invitation) {
    const v = await db
      .select({ locale: users.locale })
      .from(users)
      .where(eq(users.id, userId))
      .get()
    viewerLocale = v?.locale ?? 'en'
  }

  // Gate the six synastry chapters before they leave the server: free viewers get
  // the first SYNASTRY_FREE_CHAPTERS in full + teasers for the rest (locked BODIES
  // never ship). Unlock is PER BOND only — THIS bond unlocked (a new-member Resonance
  // accept / single purchase). A subscription no longer opens it (Yuel Pro = 体验层),
  // and a global invite no longer opens every bond.
  if (interpretation && Array.isArray(interpretation.chapters)) {
    const unlockedCount = resolveUnlockedChapterCount({
      bondUnlocked: bond.chaptersUnlocked,
    })
    interpretation = gateInterpretationChapters(interpretation, unlockedCount)
  }

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
      ? {
          expiresAt: invitation.expiresAt,
          targetEmail: invitation.targetEmail,
          // Re-shareable invite link for the unlock wall's invite CTA (T2),
          // locale-prefixed so the landing matches the viewer's language.
          resonateUrl: `https://hexastral.com/${webLocalePrefix(viewerLocale)}resonate/${invitation.token}`,
        }
      : null,
    dimensions: dimensionData,
    interpretation,
    basedOnStaleBirth,
    viewerIsPersonA,
  })
})

// ── POST /:id/unlock — buy-to-unlock the full six-chapter report for one bond ──
// Free resonance bonds gate to SYNASTRY_FREE_CHAPTERS; this applies a single
// purchase (hexastral_compatibility) to reveal all six for THIS bond. Solo bonds
// are unlocked at creation and subscribers/invite-unlocked users never reach the
// wall, so this is the resonance-bond buy path. Idempotent.
bondRoutes.post('/:id/unlock', async (c) => {
  const bondId = c.req.param('id')
  const userId = requireUserId(c)
  const db = c.get('db')

  const bond = await db
    .select({
      id: userBonds.id,
      hehunReadingId: userBonds.hehunReadingId,
      chaptersUnlocked: userBonds.chaptersUnlocked,
    })
    .from(userBonds)
    .where(and(eq(userBonds.id, bondId), eq(userBonds.ownerId, userId)))
    .get()

  if (!bond) return jsonErr(c, 404, ApiErrorCode.not_found, 'Bond not found')
  if (bond.chaptersUnlocked) return jsonOk(c, { unlocked: true, via: 'already' })

  const access = await checkReadingAccess(db, userId, 'compatibility', {
    readingId: bond.hehunReadingId ?? undefined,
  })

  if (!access.granted) {
    // No subscription / credit / available purchase — client must buy first.
    return jsonErr(c, 402, ApiErrorCode.paywall_required, 'Unlock requires purchase', {
      iapProductId: access.iapProductId,
      price: access.price,
    })
  }

  // Spend the single purchase (subscribers / credits are granted without a row).
  if (access.via === 'single_purchase') {
    await db
      .update(singlePurchases)
      .set({
        status: 'consumed',
        readingId: bond.hehunReadingId ?? null,
        consumedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(singlePurchases.id, access.purchaseId),
          eq(singlePurchases.userId, userId),
          eq(singlePurchases.status, 'purchased')
        )
      )
  }

  await db
    .update(userBonds)
    .set({ chaptersUnlocked: true, updatedAt: new Date().toISOString() })
    .where(and(eq(userBonds.id, bondId), eq(userBonds.ownerId, userId)))

  return jsonOk(c, { unlocked: true, via: access.via })
})

// ── POST /:id/recompute — re-run THIS bond's reading with the viewer's CURRENT
// birth (Pro). For when the viewer edited their birth after the report was made
// (the list/detail flag it `basedOnStaleBirth`). owner-local + IN-PLACE: only the
// viewer's slot is refreshed to their current birth; the counterpart's stored birth
// — and the counterpart's OWN mirror reading — are untouched. Destructive: the old
// reading is overwritten (the client confirms the irreversible action first).
bondRoutes.post('/:id/recompute', async (c) => {
  const bondId = c.req.param('id')
  const userId = requireUserId(c)
  const db = c.get('db')

  if (!(await userHasCapability(db, userId, 'kindred'))) {
    return jsonErr(c, 403, ApiErrorCode.paywall_required, 'Recompute requires Kindred Pro')
  }

  const bond = await db
    .select({
      mode: userBonds.mode,
      invitationId: userBonds.invitationId,
      hehunReadingId: userBonds.hehunReadingId,
    })
    .from(userBonds)
    .where(and(eq(userBonds.id, bondId), eq(userBonds.ownerId, userId)))
    .get()
  if (!bond?.hehunReadingId) return jsonErr(c, 404, ApiErrorCode.not_found, 'Bond not found')

  const [reading, user] = await Promise.all([
    db
      .select({
        relationshipCategory: pairReadings.relationshipCategory,
        customRelationshipLabel: pairReadings.customRelationshipLabel,
        personASolarDate: pairReadings.personASolarDate,
        personATimeIndex: pairReadings.personATimeIndex,
        personAGender: pairReadings.personAGender,
        personAName: pairReadings.personAName,
        personBSolarDate: pairReadings.personBSolarDate,
        personBTimeIndex: pairReadings.personBTimeIndex,
        personBGender: pairReadings.personBGender,
        personBName: pairReadings.personBName,
        personBLongitude: pairReadings.personBLongitude,
        personBTimezoneId: pairReadings.personBTimezoneId,
      })
      .from(pairReadings)
      .where(eq(pairReadings.id, bond.hehunReadingId))
      .get(),
    db
      .select({
        name: users.name,
        locale: users.locale,
        birthSolarDate: users.birthSolarDate,
        birthTimeIndex: users.birthTimeIndex,
        birthGender: users.birthGender,
        birthClockMinutes: users.birthClockMinutes,
        birthSolarCalibrate: users.birthSolarCalibrate,
        birthLongitude: users.birthLongitude,
        birthTimezoneId: users.birthTimezoneId,
        birthCity: users.birthCity,
      })
      .from(users)
      .where(eq(users.id, userId))
      .get(),
  ])
  if (!reading) return jsonErr(c, 404, ApiErrorCode.not_found, 'Reading not found')
  if (!user?.birthSolarDate || user.birthTimeIndex == null || !user.birthGender) {
    return jsonErr(c, 400, ApiErrorCode.missing_required, 'Complete your birth info first')
  }

  // Which slot is the viewer? solo + the inviter's bond (carries invitationId) → A;
  // the responder's mirror bond (no invitationId) → B. personA is always the
  // inviter / solo creator (see the /solo + /invite/:token/respond paths).
  const ownerIsPersonA = bond.mode === 'solo' || bond.invitationId != null

  // Viewer's CURRENT birth (full) → their slot; counterpart keeps its stored birth.
  // (personB's clockMinutes/calibrate were never persisted, so the counterpart is
  // recomputed at 时辰 granularity — the same fidelity the stored reading had.)
  const self = {
    solarDate: user.birthSolarDate,
    timeIndex: user.birthTimeIndex,
    gender: user.birthGender,
    name: user.name ?? undefined,
    clockMinutes: user.birthClockMinutes ?? undefined,
    calibrate: user.birthSolarCalibrate ?? undefined,
    longitude: user.birthLongitude != null ? Number(user.birthLongitude) : undefined,
    timezoneId: user.birthTimezoneId ?? undefined,
    city: user.birthCity ?? undefined,
  }
  const otherA = {
    solarDate: reading.personASolarDate,
    timeIndex: reading.personATimeIndex,
    gender: reading.personAGender,
    name: reading.personAName ?? undefined,
  }
  const otherB = {
    solarDate: reading.personBSolarDate,
    timeIndex: reading.personBTimeIndex,
    gender: reading.personBGender,
    name: reading.personBName ?? undefined,
    longitude: reading.personBLongitude != null ? Number(reading.personBLongitude) : undefined,
    timezoneId: reading.personBTimezoneId ?? undefined,
  }
  const language = user.locale ?? 'zh-CN'

  const { result, interpretation } = await callAstro<{
    result: { compatibility: Record<string, unknown> }
    interpretation: Record<string, string>
  }>(c.env.SVC_ASTRO, '/pair/compute', {
    personA: ownerIsPersonA ? self : otherA,
    personB: ownerIsPersonA ? otherB : self,
    userId,
    isPro: true,
    language,
    relationshipCategory: reading.relationshipCategory ?? undefined,
    customRelationshipLabel: reading.customRelationshipLabel ?? undefined,
  })
  interpretation.language = language

  // In-place overwrite: refresh the viewer's slot to current + the new score/prose.
  const refreshedSlot = ownerIsPersonA
    ? {
        personASolarDate: user.birthSolarDate,
        personATimeIndex: user.birthTimeIndex,
        personAGender: user.birthGender,
      }
    : {
        personBSolarDate: user.birthSolarDate,
        personBTimeIndex: user.birthTimeIndex,
        personBGender: user.birthGender,
      }

  await db
    .update(pairReadings)
    .set({
      ...refreshedSlot,
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
      compatibilityData: JSON.stringify(result.compatibility),
      interpretation: JSON.stringify(interpretation),
    })
    .where(eq(pairReadings.id, bond.hehunReadingId))

  return jsonOk(c, { recomputed: true })
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
  const isPro = await userHasCapability(db, userId, 'kindred')
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
  const titleHint = `${reading.personAName ?? ''} · Kindred · ${reading.personBName ?? bond.targetName}`

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
    responderEmail: string | null
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

  if (input.responderEmail) {
    tasks.push(
      mailerClient.post(env.SVC_MAILER, '/send', {
        to: input.responderEmail,
        subject: 'Resonance connected successfully',
        html: `<p>You are now connected with ${inviterDisplay} in Resonance.</p><p>Relationship: ${input.relationshipLabel}</p><p>Your compatibility reading is ready in HexAstral.</p>`,
      })
    )
  }

  await Promise.all(tasks)
}

/**
 * Operator identity for the email footer — required by:
 *   - US CAN-SPAM Act §5(a)(5): commercial sender's valid physical postal address
 *   - JP 特定電子メール法 §4: 送信者氏名・住所・受信拒否通知方法
 *   - SG Spam Control Act §11: sender identification
 *   - MY PDPA: data user identification
 *
 * TODO(legal): replace POSTAL with the registered UseOne Tech LLC address before
 * public launch. Tracked in docs/local-manual-checklist.md.
 */
const OPERATOR = {
  brand: 'HexAstral',
  legal: 'UseOne Tech LLC',
  postal: '30 N Gould St, Ste R, Sheridan, WY 82801, USA',
  privacyUrl: 'https://hexastral.com/privacy',
} as const

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

type InviteLocale = 'en' | 'zh' | 'zh-Hant' | 'ja'

/**
 * App/user locale → web resonate-landing route prefix.
 *
 * Web routing (hexastral-web/i18n/routing.ts): locales zh|tw|en|ja, default en,
 * `as-needed` prefix → en has NO prefix, others use their short code. Keeps the
 * landing page in the same language A composed the invite in. Returns a trailing
 * slash so callers can interpolate `${prefix}resonate/...` directly.
 */
function webLocalePrefix(locale: string): string {
  const l = locale.toLowerCase()
  if (l === 'zh' || l === 'zh-hans' || l.startsWith('zh-cn')) return 'zh/'
  if (l === 'zh-hant' || l === 'tw' || l.startsWith('zh-tw') || l.startsWith('zh-hk')) return 'tw/'
  if (l === 'ja' || l.startsWith('ja')) return 'ja/'
  return '' // en — default locale, no prefix
}

function normalizeInviteLocale(locale: string): InviteLocale {
  if (locale === 'zh' || locale === 'zh-Hans' || locale.startsWith('zh-CN')) return 'zh'
  if (locale === 'zh-Hant' || locale.startsWith('zh-TW') || locale.startsWith('zh-HK'))
    return 'zh-Hant'
  if (locale === 'ja' || locale.startsWith('ja-')) return 'ja'
  return 'en'
}

interface InviteCopy {
  preheader: string
  heading: (name: string) => string
  relationshipLabel: string
  bodyIntro: string
  bodyPrivacy: string
  cta: string
  expiryNote: string
  disclosureWhy: (name: string) => string
  disclosureOptOut: string
  disclosureNoMailingList: string
  operatorLine: string
}

const INVITE_COPY: Record<InviteLocale, InviteCopy> = {
  en: {
    preheader:
      'You have been invited to confirm participation in a private birth-chart compatibility reading.',
    heading: (n) =>
      `${n} has invited you to confirm your birth details for a compatibility reading.`,
    relationshipLabel: 'Indicated relationship',
    bodyIntro:
      'If you choose to participate, you will enter your own birth details. Your data is used only to compute the reading; the inviter never sees your exact birth information.',
    bodyPrivacy:
      'Only the reading result is shared. You may decline by ignoring this email; the invitation expires automatically.',
    cta: 'Open invitation',
    expiryNote: 'This invitation expires in 7 days.',
    disclosureWhy: (n) =>
      `You received this one-time message because ${n} entered your email address while creating a connection request on HexAstral.`,
    disclosureOptOut:
      'No further messages will be sent. To have your email deleted immediately, do not respond — the invitation and your email are removed at expiry. For privacy questions, contact privacy@hexastral.com.',
    disclosureNoMailingList: 'Your email is not added to any mailing list.',
    operatorLine: '',
  },
  zh: {
    preheader: '你被邀请确认是否参与一次私人星盘合盘解读。',
    heading: (n) => `${n} 邀请你确认生辰信息以完成合盘解读`,
    relationshipLabel: '关系标签',
    bodyIntro:
      '如果你选择参与，由你本人填写自己的生辰信息；邀请人不会看到你的具体生辰，仅会看到合盘结果。',
    bodyPrivacy: '若不愿参与，可直接忽略本邮件，邀请将自动过期并删除。',
    cta: '查看邀请',
    expiryNote: '本邀请将在 7 天后过期。',
    disclosureWhy: (n) =>
      `你收到这封一次性邮件，是因为 ${n} 在 HexAstral 上填入了你的邮箱以发起合盘邀请。`,
    disclosureOptOut:
      '本邮件不会有任何后续。如希望立即删除你的邮箱记录，无需回复——邀请过期后邮箱将自动清除。隐私问题请联系 privacy@hexastral.com。',
    disclosureNoMailingList: '你的邮箱不会被加入任何邮件列表。',
    operatorLine: '',
  },
  'zh-Hant': {
    preheader: '您被邀請確認是否參與一次私人星盤合盤解讀。',
    heading: (n) => `${n} 邀請您確認生辰資料以完成合盤解讀`,
    relationshipLabel: '關係標籤',
    bodyIntro:
      '若您選擇參與，由您本人填寫自己的生辰資料；邀請人不會看到您的具體生辰，僅會看到合盤結果。',
    bodyPrivacy: '若不願參與，可直接忽略本郵件，邀請將自動過期並刪除。',
    cta: '查看邀請',
    expiryNote: '本邀請將於 7 天後過期。',
    disclosureWhy: (n) =>
      `您收到這封一次性郵件，是因為 ${n} 在 HexAstral 上填入了您的電子郵件以發起合盤邀請。`,
    disclosureOptOut:
      '本郵件不會有任何後續。若希望立即刪除您的電郵記錄，無需回覆——邀請過期後電郵將自動清除。隱私相關問題請聯絡 privacy@hexastral.com。',
    disclosureNoMailingList: '您的電郵不會被加入任何郵件列表。',
    operatorLine: '',
  },
  ja: {
    preheader: '相性鑑定への参加確認のご案内です（一回限りの送信）。',
    heading: (n) => `${n} 様より、相性鑑定のご招待が届いています`,
    relationshipLabel: '関係性ラベル',
    bodyIntro:
      'ご参加いただける場合は、ご自身の生年月日等の情報をご入力いただきます。招待者にはお客様の生年月日情報そのものは共有されず、鑑定結果のみが表示されます。',
    bodyPrivacy:
      'ご参加されない場合は、本メールをそのまま無視していただいて構いません。招待は自動的に期限切れとなり、削除されます。',
    cta: '招待を確認する',
    expiryNote: '本招待は 7 日後に失効します。',
    disclosureWhy: (n) =>
      `本メールは、${n} 様が HexAstral にてお客様のメールアドレスを入力されたため、一回限り送信されています。`,
    disclosureOptOut:
      '今後追加でメールが送信されることはありません。受信を希望されない場合、ご返信は不要です——招待の失効と同時にメールアドレスは自動的に削除されます。受信拒否・個人情報に関するお問い合わせは privacy@hexastral.com までご連絡ください。',
    disclosureNoMailingList:
      'お客様のメールアドレスがメーリングリストに追加されることはありません。',
    operatorLine: '送信者：',
  },
}

/**
 * Locale-aware subject for the bond invitation email.
 *
 * - English subjects are prefixed with `<ADV>` to satisfy Singapore Spam Control
 *   Act §11(2) — we don't know the recipient's country reliably, but the
 *   English market is the most likely SG destination, so we tag all English
 *   subjects defensively. Other locales (zh/zh-Hant/ja) skip the tag.
 * - Tone is strictly transactional: no "discover your cosmic connection"-style
 *   marketing language. JP 特定電子メール法 transactional-exemption hinges on
 *   the message being a direct response to recipient-triggered context (here,
 *   the inviter entering the email).
 */
function buildInvitationSubject(opts: { inviterName: string; locale: string }): string {
  const loc = normalizeInviteLocale(opts.locale)
  const name = opts.inviterName
  if (loc === 'zh') return `${name} 邀请你确认合盘信息 · HexAstral`
  if (loc === 'zh-Hant') return `${name} 邀請您確認合盤資料 · HexAstral`
  if (loc === 'ja') return `${name} 様より相性鑑定のご招待 · HexAstral`
  return `<ADV> ${name} has invited you to a birth-chart compatibility reading · HexAstral`
}

interface MailtoTemplate {
  subject: string
  body: string
}

/**
 * Build the locale-aware mailto subject + body that A's device will hand to
 * the system mail composer. Critically: no `<ADV>` prefix here — the message
 * originates from A's personal mailbox, not from our service, so it is a
 * private one-to-one communication exempt from commercial-email regulation
 * across US/SG/MY/JP. The body is friendly first-person; A can edit it.
 */
function buildInvitationMailto(opts: {
  inviterName: string
  relationshipLabel: string
  message?: string | null
  resonateUrl: string
  locale: string
}): MailtoTemplate {
  const loc = normalizeInviteLocale(opts.locale)
  const { message, resonateUrl } = opts
  // A's optional personal note rides at the TOP. No auto-signature — over SMS /
  // mail / WeChat / AirDrop the sender is already obvious, and "— Someone" reads
  // badly when A has no name on file. Copy is minimalist + relation-NEUTRAL
  // (asserting "I added you as my 恋人/partner" felt presumptuous + the label
  // mapping is locale-fraught). `inviterName` / `relationshipLabel` intentionally
  // unused in the body now.
  const note = message ? `${message.trim()}\n\n` : ''

  if (loc === 'zh') {
    return {
      subject: '合盘邀请',
      body:
        `${note}我在 HexAstral 上做了个生辰合盘，把你加上了，想看看两个人的盘合不合。\n\n` +
        `填一下你的生辰就行（我只看得到结果，看不到你的信息）：\n${resonateUrl}\n\n` +
        '链接 7 天有效。',
    }
  }
  if (loc === 'zh-Hant') {
    return {
      subject: '合盤邀請',
      body:
        `${note}我在 HexAstral 上做了個生辰合盤，把你加上了，想看看兩個人的盤合不合。\n\n` +
        `填一下你的生辰就行（我只看得到結果，看不到你的資料）：\n${resonateUrl}\n\n` +
        '連結 7 天有效。',
    }
  }
  if (loc === 'ja') {
    return {
      subject: '相性、見てみませんか？',
      body:
        `${note}HexAstral で相性を見てみたくて、あなたを追加しました。\n\n` +
        `生年月日を入力すると二人の結果が出ます（入力内容は私には見えず、結果だけ共有されます）：\n${resonateUrl}\n\n` +
        '7日間有効です。',
    }
  }
  // en + fallback
  return {
    subject: 'Curious how our two charts line up?',
    body:
      `${note}I ran a birth-chart compatibility reading on HexAstral and added you.\n\n` +
      `Add your birth details to see how the two charts fit — I only see the result, never your info:\n${resonateUrl}\n\n` +
      'Expires in 7 days.',
  }
}

function buildInvitationEmailHtml(opts: {
  inviterName: string
  relationshipLabel: string
  message?: string | null
  resonateUrl: string
  locale: string
}): string {
  const loc = normalizeInviteLocale(opts.locale)
  const c = INVITE_COPY[loc]
  const name = escapeHtml(opts.inviterName)
  const rel = escapeHtml(opts.relationshipLabel)
  const url = escapeHtml(opts.resonateUrl)
  const msg = opts.message ? escapeHtml(opts.message) : null
  const headingHtml = escapeHtml(c.heading(opts.inviterName)).replace(
    name,
    `<strong>${name}</strong>`
  )
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${OPERATOR.brand}</title></head>
<body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;font-size:1px;line-height:1px;mso-hide:all;">${escapeHtml(c.preheader)}</span>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e4e4e7;">
      <tr><td style="padding:40px 32px;text-align:left;">
        <p style="margin:0 0 8px;font-size:11px;color:#71717a;letter-spacing:4px;text-transform:uppercase;">${OPERATOR.brand}</p>
        <h1 style="margin:0 0 20px;font-size:18px;font-weight:400;color:#09090b;line-height:1.5;">
          ${headingHtml}
        </h1>
        <p style="margin:0 0 12px;font-size:13px;color:#52525b;line-height:1.6;">
          ${escapeHtml(c.relationshipLabel)}: <strong style="color:#09090b;">${rel}</strong>
        </p>
        ${msg ? `<p style="margin:0 0 20px;padding:12px 14px;background:#fafafa;border-left:2px solid #e4e4e7;font-size:13px;color:#52525b;line-height:1.6;">${msg}</p>` : ''}
        <p style="margin:0 0 16px;font-size:13px;color:#52525b;line-height:1.6;">
          ${escapeHtml(c.bodyIntro)}
        </p>
        <p style="margin:0 0 24px;font-size:13px;color:#52525b;line-height:1.6;">
          ${escapeHtml(c.bodyPrivacy)}
        </p>
        <a href="${url}" style="display:inline-block;padding:12px 28px;background:#09090b;color:#fafafa;font-size:13px;font-weight:500;letter-spacing:1px;text-decoration:none;">
          ${escapeHtml(c.cta)}
        </a>
        <p style="margin:24px 0 0;font-size:11px;color:#a1a1aa;line-height:1.6;">
          ${escapeHtml(c.expiryNote)}
        </p>
        <div style="margin:24px 0 0;border-top:1px solid #f4f4f5;padding-top:16px;font-size:10px;color:#a1a1aa;line-height:1.7;">
          <p style="margin:0 0 6px;">${escapeHtml(c.disclosureWhy(opts.inviterName))}</p>
          <p style="margin:0 0 6px;">${escapeHtml(c.disclosureOptOut)}</p>
          <p style="margin:0 0 6px;">${escapeHtml(c.disclosureNoMailingList)}</p>
          <p style="margin:8px 0 0;">
            ${escapeHtml(c.operatorLine)}${OPERATOR.brand} · ${OPERATOR.legal}<br>
            ${OPERATOR.postal}<br>
            <a href="${OPERATOR.privacyUrl}" style="color:#a1a1aa;">${OPERATOR.privacyUrl}</a>
          </p>
        </div>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}
