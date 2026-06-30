/**
 * 统一用户路由 — 合并 stellar/fengshui/yiching 三个 user.ts
 *
 * 包含 stellar 独有的 PUT /:userId/birth-info
 * DELETE 级联删除所有业务表
 */

import { zValidator } from '@hono/zod-validator'
import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import {
  analyses,
  bondInvitations,
  bondInviteCredits,
  chapterUnlockInvitations,
  contactHashes,
  conversationMessages,
  conversations,
  dailyActivity,
  dailyAlmanac,
  dailySignals,
  divinations,
  fengJobs,
  fengReports,
  fengSites,
  freeMonthlyQuotas,
  lifeEvents,
  notificationAttributions,
  pairAnnualForecasts,
  pairReadings,
  physiognomyReadings,
  portfolioReadings,
  pushTokens,
  readingGifts,
  reportChapters,
  sharedReports,
  singlePurchases,
  userBonds,
  userCharts,
  userCredits,
  userEntitlements,
  userPhysiognomyFeatures,
  users,
} from '../db/schema'
import type { AppDb, AppEnv, CloudflareBindings } from '../infra-types'
import { userHasCapability } from '../lib/access/entitlement-access'
import { requireUserId } from '../lib/auth'
import {
  BIOMETRIC_CONSENT_VERSION,
  recordBiometricConsent,
  revokeBiometricConsent,
} from '../lib/biometric-consent'
import { assertBirthEditQuota, type BirthEditInput } from '../lib/birth-edit-quota'
import { CHAPTER_UNLOCK_DEFAULT, claimChapterUnlocksForEmail } from '../lib/chapter-access'
import { buildChartSkeleton, rebuildUserCharts } from '../lib/chart-skeleton'
import {
  ensureStellarChartForPublicProfile,
  parseStellarChartJson,
} from '../lib/public-stellar-backfill'
import { sendPushEvent } from '../lib/push'
import { mailerClient } from '../lib/service-clients'
import { solarDateSchema } from '../lib/validation'
import { getActiveEntitlements } from '../services/entitlements'
import { reconcileEntitlements } from '../services/revenuecat'
import { parseVisibility } from './visibility'

const optionalEmail = z.preprocess((val) => {
  if (val == null || val === '') return undefined
  if (typeof val === 'string') {
    const trimmed = val.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }
  return val
}, z.email().optional())

const createUserSchema = z.object({
  id: z.string().min(1),
  email: optionalEmail,
  name: z.string().optional(),
  appleUserId: z.string().optional(),
  googleUserId: z.string().optional(),
})

const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.email().optional(),
})

/** Profile sync schema — covers all user-editable identity fields */
const updateProfileSchema = z.object({
  /** 真实姓名 — Profile 可修改；写入 users.name (占卜命理参数) */
  name: z.string().max(50).optional(),
  /** 公开昵称 — 写入 users.display_name */
  displayName: z.string().max(50).optional(),
  username: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Username may only contain lowercase letters, numbers, and underscores')
    .optional(),
  avatarKey: z.string().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  chartPublic: z.boolean().optional(),
})

const saveBirthInfoSchema = z.object({
  birthSolarDate: solarDateSchema,
  birthTimeIndex: z.int().min(0).max(12),
  /** 精确出生分钟数 0-1439（精确模式）。缺省 = 仅时辰，不做真太阳时校准。 */
  birthClockMinutes: z.int().min(0).max(1439).optional(),
  /** 真太阳时校准开关（默认 true）；仅精确模式生效。 */
  birthSolarCalibrate: z.boolean().optional(),
  birthGender: z.enum(['男', '女']),
  birthCity: z.string().max(100).optional(),
  birthLongitude: z.string().max(20).optional(),
  birthLatitude: z.string().max(20).optional(),
  birthTimezoneId: z.string().max(40).optional(),
  /** Optional display name from onboarding name step — only overwrites when non-empty */
  name: z.string().min(1).max(50).optional(),
})

const notifPrefsSchema = z.object({
  dailyFortune: z.boolean(),
  luckyWindow: z.boolean(),
  chartTransit: z.boolean(),
  fateReportReady: z.boolean(),
})

const updatePreferencesSchema = z.object({
  tonePreference: z.enum(['gentle', 'straight', 'poetic']).optional(),
  locale: z.string().max(10).optional(),
  notifPrefs: notifPrefsSchema.optional(),
})

const revokeAppleSchema = z.object({
  authorizationCode: z.string().min(1),
})

/** Generate Apple client_secret JWT (ES256, valid 3 min) */
async function makeAppleClientSecret(
  teamId: string,
  keyId: string,
  privateKeyPem: string
): Promise<string> {
  const pemBody = privateKeyPem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')
  const keyData = Uint8Array.from(atob(pemBody), (ch) => ch.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const now = Math.floor(Date.now() / 1000)
  const header = b64url({ alg: 'ES256', kid: keyId })
  const payload = b64url({
    iss: teamId,
    iat: now,
    exp: now + 180,
    aud: 'https://appleid.apple.com',
    sub: 'com.zhop.hexastral',
  })
  const unsigned = `${header}.${payload}`

  const sigBuf = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsigned)
  )
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  return `${unsigned}.${sig}`
}

const PLAIN_INTRO_MAX_LEN = 320

function truncatePlainIntro(text: string, maxLen: number): string {
  const t = text.trim()
  if (t.length <= maxLen) return t
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`
}

function excerptFromCh1ContentJson(contentJson: string): string | null {
  try {
    const parsed = JSON.parse(contentJson) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const o = parsed as Record<string, unknown>
    const summary = typeof o.summary === 'string' ? o.summary.trim() : ''
    if (summary) return truncatePlainIntro(summary, PLAIN_INTRO_MAX_LEN)
    const sections = o.sections
    if (!Array.isArray(sections) || sections.length === 0) return null
    const first = sections[0]
    if (!first || typeof first !== 'object') return null
    const body = (first as Record<string, unknown>).body
    if (typeof body !== 'string' || !body.trim()) return null
    return truncatePlainIntro(body.trim(), PLAIN_INTRO_MAX_LEN)
  } catch {
    return null
  }
}

async function fetchPlainIntroExcerptForPublic(db: AppDb, userId: string): Promise<string | null> {
  const row = await db
    .select({ contentJson: reportChapters.contentJson })
    .from(reportChapters)
    .where(
      and(
        eq(reportChapters.userId, userId),
        eq(reportChapters.chapter, 'ch1_personality'),
        eq(reportChapters.isCurrent, true)
      )
    )
    .orderBy(desc(reportChapters.generatedAt))
    .limit(1)
    .get()
  if (!row?.contentJson) return null
  return excerptFromCh1ContentJson(row.contentJson)
}

/** 创建或获取用户 */
export const userRoutes = new Hono<AppEnv>()
  .post('/', async (c) => {
    const body = await c.req.json()
    const input = createUserSchema.parse(body)
    const db = c.get('db')

    const existing = await db.select().from(users).where(eq(users.id, input.id)).get()
    if (existing) {
      // Generate deviceSecret if not yet assigned (rolling upgrade)
      if (!existing.deviceSecret) {
        const deviceSecret = crypto.randomUUID()
        await db
          .update(users)
          .set({ deviceSecret, updatedAt: new Date().toISOString() })
          .where(eq(users.id, input.id))
        return c.json({ data: { ...existing, deviceSecret } })
      }
      return c.json({ data: existing })
    }

    const deviceSecret = crypto.randomUUID()
    await db.insert(users).values({
      id: input.id,
      email: input.email ?? null,
      name: input.name ?? null,
      appleUserId: input.appleUserId ?? null,
      googleUserId: input.googleUserId ?? null,
      deviceSecret,
      unlockedChapterCount: CHAPTER_UNLOCK_DEFAULT,
    })

    // No welcome coins — new users get one free base chart reading (handled by feature flag)
    // B's first bond dimension is the hookDimension free preview; A must purchase to run a bond

    const created = await db.select().from(users).where(eq(users.id, input.id)).get()
    return c.json({ data: created }, 201)
  })

  /** 用户名唯一性检查 — debounce 输入时使用，不消耗配额 */
  .get('/check-username', async (c) => {
    const username = c.req.query('username') ?? ''
    if (
      !username ||
      username.length < 2 ||
      username.length > 30 ||
      !/^[a-z0-9_]+$/.test(username)
    ) {
      return c.json({ available: false, reason: 'invalid' })
    }
    const db = c.get('db')
    // Exclude the current user — their own previously-set username must read
    // as available so the edit form can re-confirm without false collisions.
    const selfId = c.get('userId') ?? null
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .get()
    return c.json({ available: !existing || existing.id === selfId })
  })

  /** 获取当前用户聊天点数余额 */
  .get('/balance', async (c) => {
    const userId = requireUserId(c)
    const db = c.get('db')
    const user = await db
      .select({ chatCreditsRemaining: users.chatCreditsRemaining })
      .from(users)
      .where(eq(users.id, userId))
      .get()
    if (!user) throw new HTTPException(404, { message: 'User not found' })
    const active = await getActiveEntitlements(db, userId)
    return c.json({
      chatCreditsRemaining: user.chatCreditsRemaining,
      subscriptionStatus: active.length > 0 ? 'pro' : 'free',
    })
  })

  /**
   * Multi-flagship entitlement snapshot for the signed-in user.
   * Returned shape mirrors `EntitlementsState` in @zhop/satellite-runtime so
   * the client can fall back to this when RevenueCat SDK isn't initialized
   * (web, Expo Go) or for cross-app sync after sign-in.
   */
  .get('/me/entitlements', async (c) => {
    const userId = requireUserId(c)
    const db = c.get('db')
    const active = await getActiveEntitlements(db, userId)
    return c.json({ data: { entitlements: active } })
  })

  /**
   * POST /api/user/:userId/entitlements/reconcile
   * Self-heal a dropped/late RevenueCat webhook by reconciling user_entitlements
   * against the RC REST snapshot (ADR-0013 §5b). The client calls this on launch;
   * it degrades to a no-op (returns the unchanged set) if RC is unreachable or the
   * REST key isn't configured. Returns the fresh active set + a reconcile summary.
   */
  .post('/:userId/entitlements/reconcile', async (c) => {
    const userId = requireUserId(c)
    if (userId !== c.req.param('userId')) throw new HTTPException(403, { message: 'Forbidden' })
    const db = c.get('db')
    const reconcile = await reconcileEntitlements(db, c.env, userId)
    const active = await getActiveEntitlements(db, userId)
    return c.json({ data: { entitlements: active, reconcile } })
  })

  /** 获取用户信息 */
  .get('/:userId', async (c) => {
    const userId = requireUserId(c)
    if (userId !== c.req.param('userId')) throw new HTTPException(403, { message: 'Forbidden' })
    const db = c.get('db')

    const user = await db.select().from(users).where(eq(users.id, userId)).get()
    if (!user) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    // ── Self-heal: backfill chart skeleton ──
    // Some users have birth info on file but their static traits + ziwei
    // main star are NULL — usually because the onboarding bootstrap failed
    // silently. Without these, the fate signature derivation, /signal/today
    // and /report all fail. Trigger the idempotent chart-skeleton builder
    // (LLM-free) and patch the in-memory user so this response is correct.
    if (
      user.birthSolarDate &&
      user.birthTimeIndex != null &&
      user.birthGender &&
      (user.dayMasterStem == null || user.ziweiMingPalaceStar == null)
    ) {
      try {
        const skeleton = await buildChartSkeleton(db, c.env, {
          userId,
          birthSolarDate: user.birthSolarDate,
          birthTimeIndex: user.birthTimeIndex,
          birthClockMinutes: user.birthClockMinutes,
          birthSolarCalibrate: user.birthSolarCalibrate,
          birthGender: user.birthGender as '男' | '女',
          birthCity: user.birthCity,
          birthLongitude: user.birthLongitude,
          birthLatitude: user.birthLatitude,
          birthTimezoneId: user.birthTimezoneId,
          hemisphereReversalEnabled: user.hemisphereReversalEnabled === true,
          language: user.locale ?? 'zh-CN',
        })
        user.dayMasterStem = skeleton.dayMasterStem
        user.dayMasterStrength = skeleton.dayMasterStrength
        user.favorableElement = skeleton.favorableElement
        user.unfavorableElement = skeleton.unfavorableElement
        user.birthBranch = skeleton.birthBranch
        user.ziweiMingPalaceStar = skeleton.ziweiMingPalaceStar
      } catch (err) {
        console.error('[user.get] chart-skeleton self-heal failed', userId, err)
      }
    }

    return c.json({ data: user })
  })

  /** 更新用户信息 */
  .patch('/:userId', async (c) => {
    const userId = requireUserId(c)
    if (userId !== c.req.param('userId')) throw new HTTPException(403, { message: 'Forbidden' })
    const body = await c.req.json()
    const input = updateUserSchema.parse(body)
    const db = c.get('db')

    await db
      .update(users)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(users.id, userId))

    const updated = await db.select().from(users).where(eq(users.id, userId)).get()
    if (!updated) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    return c.json({ data: updated })
  })

  /** 公开资料同步 — iOS 设备间无缝同步 displayName / username / avatar / phone / chartPublic */
  .patch('/:userId/profile', async (c) => {
    const userId = requireUserId(c)
    if (userId !== c.req.param('userId')) throw new HTTPException(403, { message: 'Forbidden' })
    const body = await c.req.json()
    const input = updateProfileSchema.parse(body)
    const db = c.get('db')

    const user = await db.select().from(users).where(eq(users.id, userId)).get()
    if (!user) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    // Username uniqueness check (only when changing)
    if (input.username && input.username !== user.username) {
      const taken = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, input.username))
        .get()
      if (taken) {
        throw new HTTPException(409, { message: 'Username already taken' })
      }
    }

    const mergedUsername = input.username !== undefined ? input.username : user.username
    const mergedChartPublic = input.chartPublic !== undefined ? input.chartPublic : user.chartPublic
    if (mergedChartPublic === true) {
      const u = (mergedUsername ?? '').trim()
      if (u.length < 2 || !/^[a-z0-9_]+$/.test(u)) {
        throw new HTTPException(400, { message: 'Username required for public chart' })
      }
    }

    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    // Profile-editable nickname maps to its OWN column (display_name).
    // 真实姓名 (users.name) 仅由 onboarding birth-info 写入，绝不被 Profile 覆盖。
    if (input.displayName !== undefined) patch.displayName = input.displayName
    // 真实姓名 — onboarding 录入后用户在 Profile 可修改，写入 users.name
    if (input.name !== undefined) patch.name = input.name
    if (input.username !== undefined) patch.username = input.username

    // Asynchronously delete prior owned avatar key on successful replacement
    if (input.avatarKey !== undefined) {
      if (input.avatarKey !== user.avatarKey) {
        patch.avatarKey = input.avatarKey
        if (user.avatarKey && user.avatarKey.startsWith(`avatars/${userId}/`)) {
          c.executionCtx.waitUntil(c.env.MEDIA_BUCKET.delete(user.avatarKey))
        }
      }
    }

    if (input.phone !== undefined) patch.phone = input.phone
    if (input.chartPublic !== undefined) patch.chartPublic = input.chartPublic

    // Compute phoneHash when phone is set or changed
    if (input.phone) {
      const encoder = new TextEncoder()
      const data = encoder.encode(input.phone)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      patch.phoneHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
    } else if (input.phone === null) {
      patch.phoneHash = null
    }

    await db.update(users).set(patch).where(eq(users.id, userId))

    // Auto-match pending bonds when phoneHash is newly set
    if (patch.phoneHash && typeof patch.phoneHash === 'string') {
      c.executionCtx.waitUntil(autoMatchBonds(db, c.env, userId, patch.phoneHash as string))
    }

    const updated = await db.select().from(users).where(eq(users.id, userId)).get()

    // Inject derived proxy URL
    // Removed dynamic avatarUrl fallback

    return c.json({ data: updated })
  })

  /**
   * DELETE /api/user/:userId — in-app account deletion (Apple 5.1.1(v)).
   *
   * `users` is the shared cross-app identity and 23 of its child tables do NOT
   * cascade, so a hard row-delete would fail FK. Instead we make the account
   * irrecoverable + erase personal data:
   *   1. delete the owned avatar from R2
   *   2. purge feng-owned content (sites / reports / jobs)
   *   3. null every PII column + unlink Apple/Google ids — a subsequent login
   *      creates a fresh user, so the old account can never be reached again.
   *
   * NOTE (follow-up before kindred/auspice/fate ship): extend the content purge
   * to each of those apps' user-owned tables. The PII on the user row is fully
   * erased here, which is the core compliance requirement; the residual de-
   * identified rows in other apps' tables carry no personal data on their own.
   */
  .delete('/:userId', async (c) => {
    const userId = requireUserId(c)
    if (userId !== c.req.param('userId')) throw new HTTPException(403, { message: 'Forbidden' })
    const db = c.get('db')

    const user = await db.select().from(users).where(eq(users.id, userId)).get()
    if (!user) throw new HTTPException(404, { message: 'User not found' })

    // 1. Best-effort delete of the owned avatar object.
    if (user.avatarKey?.startsWith(`avatars/${userId}/`)) {
      c.executionCtx.waitUntil(c.env.MEDIA_BUCKET.delete(user.avatarKey))
    }

    // 2. Purge feng-owned content (children first to respect FK).
    await db.delete(fengJobs).where(eq(fengJobs.userId, userId))
    await db.delete(fengReports).where(eq(fengReports.userId, userId))
    await db.delete(fengSites).where(eq(fengSites.userId, userId))

    // 2b. Purge chat history (universal user content; conversationMessages
    // auto-cascade via FK on conversations.id). singlePurchases are retained
    // (financial audit) but de-identified once the user row is anonymized.
    await db.delete(conversations).where(eq(conversations.userId, userId))

    // 3. Anonymize + unlink the identity (only nullable PII columns).
    await db
      .update(users)
      .set({
        email: null,
        name: null,
        displayName: null,
        username: null,
        phone: null,
        phoneHash: null,
        appleUserId: null,
        googleUserId: null,
        avatarKey: null,
        chartPublic: false,
        publicVisibilityJson: null,
        birthSolarDate: null,
        birthTimeIndex: null,
        birthGender: null,
        birthCity: null,
        birthLongitude: null,
        birthLatitude: null,
        birthTimezoneId: null,
        birthClockMinutes: null,
        birthSolarCalibrate: null,
        birthCalendarType: null,
        birthLunarDate: null,
        fateSignature: null,
        fateSignatureExplanation: null,
        fateSignatureCustomPrompt: null,
        fateSignatureGeneratedAt: null,
        activePhysiognomyId: null,
        activePalmFeatureId: null,
        revenueCatUserId: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId))

    return c.json({ data: { deleted: true } })
  })

  /**
   * 邮箱验证 Step 1 — 发送 OTP
   * POST /api/user/:userId/email/request
   *
   * 生成 6 位数字验证码，存入 GUARD_KV（10 分钟有效），通过 SVC_MAILER 发送邮件。
   * 同一用户 60 秒内重复请求会被拒绝（防刷）。
   */
  .post('/:userId/email/request', async (c) => {
    const userId = requireUserId(c)
    if (userId !== c.req.param('userId')) throw new HTTPException(403, { message: 'Forbidden' })
    const body = (await c.req.json()) as { email?: unknown }

    const emailParse = z.email().max(254).safeParse(body.email)
    if (!emailParse.success) {
      throw new HTTPException(400, { message: 'Invalid email address' })
    }
    const email = emailParse.data

    const db = c.get('db')
    const user = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).get()
    if (!user) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    // Check if email is already used by a different account
    const taken = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).get()
    if (taken && taken.id !== userId) {
      throw new HTTPException(409, { message: 'Email already associated with another account' })
    }

    const otpKey = `otp:${userId}`

    // Rate-limit: reject if OTP was sent in the last 60 seconds
    const existing = await c.env.GUARD_KV.get(otpKey)
    if (existing) {
      const prev = JSON.parse(existing) as { createdAt: number }
      if (Date.now() - prev.createdAt < 60_000) {
        throw new HTTPException(429, { message: 'Please wait before requesting another code' })
      }
    }

    // Cryptographically secure 6-digit OTP
    const array = new Uint32Array(1)
    crypto.getRandomValues(array)
    const otp = ((array[0]! % 900000) + 100000).toString()

    await c.env.GUARD_KV.put(
      otpKey,
      JSON.stringify({ code: otp, email, createdAt: Date.now(), attempts: 0 }),
      { expirationTtl: 600 } // 10 minutes
    )

    // Send email via SVC_MAILER
    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>HexAstral Verification</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#111;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:28px 32px 20px;text-align:center;border-bottom:1px solid #1e1e1e;">
          <p style="margin:0;font-size:11px;letter-spacing:5px;color:#c4a862;text-transform:uppercase;">HexAstral</p>
        </td></tr>
        <tr><td style="padding:32px;text-align:center;">
          <h1 style="margin:0 0 10px;font-size:20px;font-weight:300;color:#e8e0d0;line-height:1.4;">
            Verify your email<br><span style="font-size:15px;color:#888;">验证你的邮箱</span>
          </h1>
          <p style="margin:0 0 24px;font-size:13px;color:#888;line-height:1.6;">
            Your verification code (valid for 10 minutes)<br>你的验证码（10 分钟内有效）
          </p>
          <div style="display:inline-block;padding:18px 44px;background:#0a0a0a;border:1px solid #3a3a3a;border-radius:8px;">
            <span style="font-size:34px;font-weight:300;letter-spacing:10px;color:#c4a862;">${otp}</span>
          </div>
          <p style="margin:24px 0 0;font-size:11px;color:#555;line-height:1.6;">
            If you didn't request this, ignore this email.<br>如果这不是你的操作，请忽略此邮件。
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

    // Defensive: in some deploys SVC_MAILER may be undefined even though the
    // wrangler.jsonc binding is declared (e.g. local `wrangler dev` without the
    // svc-mailer worker running, or a build where the bind was skipped). Surface
    // that as a 502 with a precise reason instead of throwing TypeError from
    // mailerClient.post — that was the dead-silent "send failure" users hit.
    if (!c.env.SVC_MAILER) {
      c.executionCtx.waitUntil(c.env.GUARD_KV.delete(otpKey))
      console.error('[email/request] SVC_MAILER binding missing — is svc-mailer deployed?')
      throw new HTTPException(502, {
        message: 'Email service is not configured on the server',
      })
    }

    try {
      await mailerClient.post(c.env.SVC_MAILER, '/send', {
        to: email,
        subject: 'HexAstral verification code',
        html,
      })
    } catch (err) {
      // Clean up KV on send failure so user can retry immediately
      c.executionCtx.waitUntil(c.env.GUARD_KV.delete(otpKey))
      const reason = err instanceof Error ? err.message : 'mailer unavailable'
      console.error('[email/request] mailer failed:', reason, {
        userId,
        emailDomain: email.split('@')[1],
      })
      throw new HTTPException(502, { message: `Failed to send verification email: ${reason}` })
    }

    return c.json({ ok: true })
  })

  /**
   * 邮箱验证 Step 2 — 核验 OTP
   * POST /api/user/:userId/email/confirm
   *
   * 校验验证码，成功后写入 users.email 并清除 KV。
   * 连续 5 次错误后验证码作废（防穷举）。
   */
  .post('/:userId/email/confirm', async (c) => {
    const userId = requireUserId(c)
    if (userId !== c.req.param('userId')) throw new HTTPException(403, { message: 'Forbidden' })
    const body = (await c.req.json()) as { code?: unknown }

    const codeParse = z
      .string()
      .length(6)
      .regex(/^\d{6}$/)
      .safeParse(body.code)
    if (!codeParse.success) {
      throw new HTTPException(400, { message: 'Code must be a 6-digit number' })
    }

    const otpKey = `otp:${userId}`
    const raw = await c.env.GUARD_KV.get(otpKey)
    if (!raw) {
      throw new HTTPException(400, {
        message: 'Verification code expired or not found — please request a new one',
      })
    }

    const stored = JSON.parse(raw) as {
      code: string
      email: string
      createdAt: number
      attempts: number
    }

    // Brute-force guard: invalidate after 5 wrong attempts
    if (stored.attempts >= 5) {
      c.executionCtx.waitUntil(c.env.GUARD_KV.delete(otpKey))
      throw new HTTPException(400, {
        message: 'Too many incorrect attempts — please request a new code',
      })
    }

    if (stored.code !== codeParse.data) {
      // Increment attempt counter
      c.executionCtx.waitUntil(
        c.env.GUARD_KV.put(otpKey, JSON.stringify({ ...stored, attempts: stored.attempts + 1 }), {
          expirationTtl: 600,
        })
      )
      throw new HTTPException(400, { message: 'Invalid verification code' })
    }

    // OTP verified — delete and update email
    c.executionCtx.waitUntil(c.env.GUARD_KV.delete(otpKey))

    const db = c.get('db')
    await db
      .update(users)
      .set({ email: stored.email, updatedAt: new Date().toISOString() })
      .where(eq(users.id, userId))

    // Claim any pending reading gifts sent to this email
    const now = new Date().toISOString()
    const pendingGifts = await db
      .select({ id: readingGifts.id })
      .from(readingGifts)
      .where(
        and(
          eq(readingGifts.recipientEmail, stored.email.toLowerCase().trim()),
          eq(readingGifts.status, 'pending'),
          isNull(readingGifts.recipientUserId)
        )
      )
      .all()

    if (pendingGifts.length > 0) {
      const giftIds = pendingGifts.map((g) => g.id)
      await Promise.all(
        giftIds.map((giftId) =>
          db
            .update(readingGifts)
            .set({ recipientUserId: userId, status: 'claimed', claimedAt: now })
            .where(eq(readingGifts.id, giftId))
        )
      )
    }

    // Credit chapter-unlock invitations targeting this email. Each pending
    // invite increments the inviter's `unlockedChapterCount` (clamped to cap)
    // and marks the row redeemed. Failure is logged but doesn't block the
    // email-confirm response — invites can be reclaimed manually if needed.
    let claimedChapterInvites = 0
    try {
      claimedChapterInvites = await claimChapterUnlocksForEmail(db, userId, stored.email)
    } catch (err) {
      console.error('[user.email/confirm] chapter-unlock claim failed', userId, err)
    }

    return c.json({
      ok: true,
      email: stored.email,
      claimedGifts: pendingGifts.length,
      claimedChapterInvites,
    })
  })

  /**
   * DELETE /api/user/:userId/email
   *
   * Unbinds the email without deleting the account — sets `users.email = NULL`
   * (GDPR Art. 7 right to withdraw consent for email processing). The user
   * can re-bind a different email later via the OTP flow. Pending invites
   * keyed off the old email remain claimable until the user binds a new one
   * (or until they expire).
   */
  .delete('/:userId/email', async (c) => {
    const userId = requireUserId(c)
    if (userId !== c.req.param('userId')) throw new HTTPException(403, { message: 'Forbidden' })
    const db = c.get('db')
    await db
      .update(users)
      .set({ email: null, updatedAt: new Date().toISOString() })
      .where(eq(users.id, userId))
    return c.json({ ok: true })
  })

  /**
   * 公开用户资料 — 用于 hexastral-web /@username 页面
   * 只返回公开安全字段，绝不暴露 email / phone / appleUserId
   *
   * `visibility` mirrors iOS `public_visibility_json`（与 `PublicVisibilityPanel` 一致）。
   * Web 应对 readings / chart 与各 flag 对齐；`chartPublic === false` → 403。
   *
   * 矩阵：`basic`→头像/昵称/@/since/解读次数；`bazi`→`/chart` 含 natal（公开 Web 展示四柱结构，不返回公历生日/城市）；`ziwei`→`/chart` 含 stellar；
   * `signature`→公开 Web 与 OG 可展示 `fateSignature`（及白话注解）；`plainIntro`→HexAstral解读节选（ch1 摘要）；
   * 大运等不在公开 visibility 内。
   */
  .get('/by-username/:username', async (c) => {
    const username = c.req.param('username').toLowerCase()
    const db = c.get('db')

    const user = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarKey: users.avatarKey,
        chartPublic: users.chartPublic,
        totalReadings: users.totalReadings,
        createdAt: users.createdAt,
        publicVisibilityJson: users.publicVisibilityJson,
        fateSignature: users.fateSignature,
        fateSignatureExplanation: users.fateSignatureExplanation,
        /** Public deterministic signature fallback (same inputs as iOS `useFateSignature`). */
        dayMasterStem: users.dayMasterStem,
        dayMasterStrength: users.dayMasterStrength,
        ziweiMingPalaceStar: users.ziweiMingPalaceStar,
        locale: users.locale,
      })
      .from(users)
      .where(eq(users.username, username))
      .get()

    if (!user) {
      c.header('Cache-Control', 'no-store')
      return c.json({ error: 'User not found' }, 404)
    }

    if (!user.chartPublic) {
      c.header('Cache-Control', 'no-store, private')
      return c.json({ error: 'This chart is private' }, 403)
    }

    const visibility = parseVisibility(user.publicVisibilityJson)

    c.header('Cache-Control', 'no-store, private')
    const signaturePayload = visibility.signature
      ? {
          fateSignature: user.fateSignature ?? null,
          fateSignatureExplanation: user.fateSignatureExplanation ?? null,
          dayMasterStem: user.dayMasterStem ?? null,
          dayMasterStrength: user.dayMasterStrength ?? null,
          ziweiMingPalaceStar: user.ziweiMingPalaceStar ?? null,
          locale: user.locale ?? null,
        }
      : {}

    let plainIntroExcerpt: string | null = null
    if (visibility.plainIntro) {
      plainIntroExcerpt = await fetchPlainIntroExcerptForPublic(db, user.id)
    }

    /** Strip fields not allowed by `visibility` — do not leak birth PII or basic via JSON when flags off. */
    return c.json({
      data: {
        id: user.id,
        username: user.username,
        chartPublic: user.chartPublic,
        visibility,
        ...(visibility.basic
          ? {
              displayName: user.displayName,
              avatarKey: user.avatarKey,
              totalReadings: user.totalReadings,
              createdAt: user.createdAt,
            }
          : {}),
        ...signaturePayload,
        ...(visibility.plainIntro ? { plainIntroExcerpt } : {}),
      },
    })
  })

  /**
   * 公开命盘数据 — 用于 hexastral-web 12宫格渲染
   * 返回星宫 palaces + meta，命格四柱概要。不含 AI 解读文字。
   * Respects `public_visibility_json`: ziwei → stellar grid; bazi → natal payload.
   */
  .get('/by-username/:username/chart', async (c) => {
    const username = c.req.param('username').toLowerCase()
    const db = c.get('db')

    const user = await db
      .select({
        id: users.id,
        chartPublic: users.chartPublic,
        publicVisibilityJson: users.publicVisibilityJson,
        birthSolarDate: users.birthSolarDate,
        birthTimeIndex: users.birthTimeIndex,
        birthGender: users.birthGender,
        birthLongitude: users.birthLongitude,
        birthLatitude: users.birthLatitude,
        birthTimezoneId: users.birthTimezoneId,
        birthCity: users.birthCity,
        hemisphereReversalEnabled: users.hemisphereReversalEnabled,
        locale: users.locale,
      })
      .from(users)
      .where(eq(users.username, username))
      .get()

    if (!user) {
      c.header('Cache-Control', 'no-store')
      return c.json({ error: 'User not found' }, 404)
    }
    if (!user.chartPublic) {
      c.header('Cache-Control', 'no-store, private')
      return c.json({ error: 'This chart is private' }, 403)
    }

    const visibility = parseVisibility(user.publicVisibilityJson)

    const charts = await db
      .select({
        chartType: userCharts.chartType,
        chartData: userCharts.chartData,
      })
      .from(userCharts)
      .where(eq(userCharts.userId, user.id))

    const stellar = charts.find((row) => row.chartType === 'stellar')
    const natal = charts.find((row) => row.chartType === 'natal')

    let stellarPayload: { palaces: unknown[]; meta: Record<string, string> } | null = null
    if (visibility.ziwei) {
      const fromDb = stellar?.chartData != null ? parseStellarChartJson(stellar.chartData) : null
      if (fromDb) {
        stellarPayload = fromDb
      } else {
        const filled = await ensureStellarChartForPublicProfile(db, c.env.SVC_ASTRO, user.id, user)
        stellarPayload = filled
      }
    }

    c.header('Cache-Control', 'no-store, private')
    return c.json({
      data: {
        visibility,
        stellar: stellarPayload,
        natal: visibility.bazi && natal?.chartData ? JSON.parse(natal.chartData) : null,
      },
    })
  })

  /** 保存出生信息（命盘推演需要） */
  .put('/:userId/birth-info', zValidator('json', saveBirthInfoSchema), async (c) => {
    const userId = requireUserId(c)
    if (userId !== c.req.param('userId')) throw new HTTPException(403, { message: 'Forbidden' })
    const input = c.req.valid('json')
    const db = c.get('db')

    const user = await db.select().from(users).where(eq(users.id, userId)).get()
    if (!user) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    // Quota gate: classify the incoming PUT against prior state. Throws 403
    // BIRTH_EDIT_QUOTA_EXHAUSTED for a free user's 2nd chart-altering edit.
    // First-add and no-op resubmits pass through.
    const nextInput: BirthEditInput = {
      birthSolarDate: input.birthSolarDate,
      birthTimeIndex: input.birthTimeIndex,
      birthClockMinutes: input.birthClockMinutes ?? null,
      birthSolarCalibrate: input.birthSolarCalibrate ?? null,
      gender: input.birthGender,
    }
    const isPro = await userHasCapability(db, userId, 'fate')
    const disposition = assertBirthEditQuota(user, nextInput, isPro)

    await db
      .update(users)
      .set({
        birthSolarDate: input.birthSolarDate,
        birthTimeIndex: input.birthTimeIndex,
        birthClockMinutes: input.birthClockMinutes ?? null,
        birthSolarCalibrate: input.birthSolarCalibrate ?? null,
        birthGender: input.birthGender,
        birthCity: input.birthCity ?? null,
        birthLongitude: input.birthLongitude ?? null,
        birthLatitude: input.birthLatitude ?? null,
        birthTimezoneId: input.birthTimezoneId ?? null,
        // Only overwrite name when client supplies one (preserve existing Apple fullName otherwise)
        ...(input.name ? { name: input.name } : {}),
        // Consume the lifetime free correction when this is a real chart edit.
        ...(disposition === 'consume_quota' && !isPro ? { birthEditUsed: true } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId))

    // 出生信息变更 → 清除命盘缓存 + report_chapters，并在后台重建 LLM-free natal skeleton
    c.executionCtx.waitUntil(rebuildUserCharts(db, c.env, userId))

    const updated = await db.select().from(users).where(eq(users.id, userId)).get()
    return c.json({ data: updated })
  })

  /** 删除用户及全部数据 (Apple 5.1.1(v) / GDPR) */
  .delete('/:userId', async (c) => {
    const userId = requireUserId(c)
    if (userId !== c.req.param('userId')) throw new HTTPException(403, { message: 'Forbidden' })
    const db = c.get('db')

    const user = await db.select().from(users).where(eq(users.id, userId)).get()
    if (!user) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    // 级联删除：使用 db.batch() 减少 D1 round-trips
    // 子表先于父表，避免 FK 约束冲突。
    // GDPR Art. 17: a single orphan row = violation. Cross-checked against
    // schema.ts on $(audit-date) — adds since prior cascade:
    //   chapterUnlockInvitations (both inviter + redeemed-by)
    //   bondInviteCredits, readingGifts (both sender + recipient)
    //   freeMonthlyQuotas, portfolioReadings
    //   fengSites, fengReports, fengJobs
    //   userEntitlements, userCredits, notificationAttributions
    //     (technically auto-cascaded via FK; explicit here as defense-in-depth)
    //   conversationMessages (joined via conversations.id; explicit fan-out
    //     unnecessary because Drizzle FK has cascade, but we declare it).
    await db.batch([
      // Invitation / bond layer (fk references)
      db
        .delete(chapterUnlockInvitations)
        .where(
          or(
            eq(chapterUnlockInvitations.inviterUserId, userId),
            eq(chapterUnlockInvitations.redeemedByUserId, userId)
          )
        ),
      db.delete(bondInvitations).where(eq(bondInvitations.inviterUserId, userId)),
      db.delete(bondInviteCredits).where(eq(bondInviteCredits.userId, userId)),
      db
        .delete(readingGifts)
        .where(or(eq(readingGifts.senderUserId, userId), eq(readingGifts.recipientUserId, userId))),
      // Sharing / reports layer
      db.delete(sharedReports).where(eq(sharedReports.userId, userId)),
      db.delete(reportChapters).where(eq(reportChapters.userId, userId)),
      db.delete(portfolioReadings).where(eq(portfolioReadings.userId, userId)),
      // Daily / personal layer
      db.delete(dailySignals).where(eq(dailySignals.userId, userId)),
      db.delete(dailyAlmanac).where(eq(dailyAlmanac.userId, userId)),
      db.delete(dailyActivity).where(eq(dailyActivity.userId, userId)),
      db.delete(userPhysiognomyFeatures).where(eq(userPhysiognomyFeatures.userId, userId)),
      // Pair / compatibility layer
      db.delete(pairReadings).where(eq(pairReadings.userId, userId)),
      db.delete(pairAnnualForecasts).where(eq(pairAnnualForecasts.userId, userId)),
      // Notifications / contacts
      db.delete(pushTokens).where(eq(pushTokens.userId, userId)),
      db.delete(notificationAttributions).where(eq(notificationAttributions.userId, userId)),
      db.delete(contactHashes).where(eq(contactHashes.userId, userId)),
      // Reading types
      db.delete(analyses).where(eq(analyses.userId, userId)),
      db.delete(physiognomyReadings).where(eq(physiognomyReadings.userId, userId)),
      db.delete(divinations).where(eq(divinations.userId, userId)),
      // Charts + chat
      db.delete(userCharts).where(eq(userCharts.userId, userId)),
      db.delete(conversations).where(eq(conversations.userId, userId)),
      // Note: conversationMessages auto-cascade via FK on conversations.id;
      // explicit safety net not needed but verify on schema drift.
      // Purchases / quotas / credits
      db.delete(singlePurchases).where(eq(singlePurchases.userId, userId)),
      db.delete(freeMonthlyQuotas).where(eq(freeMonthlyQuotas.userId, userId)),
      db.delete(userEntitlements).where(eq(userEntitlements.userId, userId)),
      db.delete(userCredits).where(eq(userCredits.userId, userId)),
      // Life events
      db.delete(lifeEvents).where(eq(lifeEvents.userId, userId)),
      // Bonds
      db.delete(userBonds).where(eq(userBonds.ownerId, userId)),
      db.delete(userBonds).where(eq(userBonds.targetUserId, userId)),
      // Feng (site analysis)
      db.delete(fengJobs).where(eq(fengJobs.userId, userId)),
      db.delete(fengReports).where(eq(fengReports.userId, userId)),
      db.delete(fengSites).where(eq(fengSites.userId, userId)),
    ])
    await db.delete(users).where(eq(users.id, userId))

    return c.json({ data: { deleted: true } })
  })

  /**
   * GDPR Article 20 — Right to Data Portability.
   * Returns all user-keyed rows as a single JSON archive.
   * Auth: HMAC v2 + userId path match (same gate as DELETE).
   *
   * Mirror of the DELETE cascade above — any table touched by delete is
   * surfaced here. Keep these two handlers paired on every schema change.
   *
   * Out of scope: conversationMessages (joined via conversations.id —
   * follow-up work to include the inner content for full portability).
   */
  .get('/:userId/export', async (c) => {
    const userId = requireUserId(c)
    if (userId !== c.req.param('userId')) throw new HTTPException(403, { message: 'Forbidden' })
    const db = c.get('db')

    const user = await db.select().from(users).where(eq(users.id, userId)).get()
    if (!user) throw new HTTPException(404, { message: 'User not found' })

    const [
      charts,
      chapters,
      portfolio,
      signals,
      almanac,
      activity,
      physFeatures,
      pairR,
      pairAnnual,
      pushT,
      notifAttrs,
      contacts,
      anals,
      physRead,
      divs,
      bonds,
      bondInvs,
      chapInvs,
      bondCredits,
      gifts,
      shared,
      lifeEvts,
      convos,
      singlePurch,
      freeQuotas,
      entitlements,
      credits,
      sites,
      reports,
      jobs,
    ] = await Promise.all([
      db.select().from(userCharts).where(eq(userCharts.userId, userId)).all(),
      db.select().from(reportChapters).where(eq(reportChapters.userId, userId)).all(),
      db.select().from(portfolioReadings).where(eq(portfolioReadings.userId, userId)).all(),
      db.select().from(dailySignals).where(eq(dailySignals.userId, userId)).all(),
      db.select().from(dailyAlmanac).where(eq(dailyAlmanac.userId, userId)).all(),
      db.select().from(dailyActivity).where(eq(dailyActivity.userId, userId)).all(),
      db
        .select()
        .from(userPhysiognomyFeatures)
        .where(eq(userPhysiognomyFeatures.userId, userId))
        .all(),
      db.select().from(pairReadings).where(eq(pairReadings.userId, userId)).all(),
      db.select().from(pairAnnualForecasts).where(eq(pairAnnualForecasts.userId, userId)).all(),
      db.select().from(pushTokens).where(eq(pushTokens.userId, userId)).all(),
      db
        .select()
        .from(notificationAttributions)
        .where(eq(notificationAttributions.userId, userId))
        .all(),
      db.select().from(contactHashes).where(eq(contactHashes.userId, userId)).all(),
      db.select().from(analyses).where(eq(analyses.userId, userId)).all(),
      db.select().from(physiognomyReadings).where(eq(physiognomyReadings.userId, userId)).all(),
      db.select().from(divinations).where(eq(divinations.userId, userId)).all(),
      db
        .select()
        .from(userBonds)
        .where(or(eq(userBonds.ownerId, userId), eq(userBonds.targetUserId, userId)))
        .all(),
      db.select().from(bondInvitations).where(eq(bondInvitations.inviterUserId, userId)).all(),
      db
        .select()
        .from(chapterUnlockInvitations)
        .where(
          or(
            eq(chapterUnlockInvitations.inviterUserId, userId),
            eq(chapterUnlockInvitations.redeemedByUserId, userId)
          )
        )
        .all(),
      db.select().from(bondInviteCredits).where(eq(bondInviteCredits.userId, userId)).all(),
      db
        .select()
        .from(readingGifts)
        .where(or(eq(readingGifts.senderUserId, userId), eq(readingGifts.recipientUserId, userId)))
        .all(),
      db.select().from(sharedReports).where(eq(sharedReports.userId, userId)).all(),
      db.select().from(lifeEvents).where(eq(lifeEvents.userId, userId)).all(),
      db.select().from(conversations).where(eq(conversations.userId, userId)).all(),
      db.select().from(singlePurchases).where(eq(singlePurchases.userId, userId)).all(),
      db.select().from(freeMonthlyQuotas).where(eq(freeMonthlyQuotas.userId, userId)).all(),
      db.select().from(userEntitlements).where(eq(userEntitlements.userId, userId)).all(),
      db.select().from(userCredits).where(eq(userCredits.userId, userId)).all(),
      db.select().from(fengSites).where(eq(fengSites.userId, userId)).all(),
      db.select().from(fengReports).where(eq(fengReports.userId, userId)).all(),
      db.select().from(fengJobs).where(eq(fengJobs.userId, userId)).all(),
    ])

    // conversationMessages joined via conversations.id — fetched in a second
    // round because Drizzle's clean way to do this is via inArray with the
    // already-resolved conversation ids (avoids fragile inline subquery casts).
    const convoIds = convos.map((cv) => cv.id)
    const convoMsgs =
      convoIds.length > 0
        ? await db
            .select()
            .from(conversationMessages)
            .where(inArray(conversationMessages.conversationId, convoIds))
            .all()
        : []

    const payload = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      userId,
      user,
      data: {
        userCharts: charts,
        reportChapters: chapters,
        portfolioReadings: portfolio,
        dailySignals: signals,
        dailyAlmanac: almanac,
        dailyActivity: activity,
        userPhysiognomyFeatures: physFeatures,
        pairReadings: pairR,
        pairAnnualForecasts: pairAnnual,
        pushTokens: pushT,
        notificationAttributions: notifAttrs,
        contactHashes: contacts,
        analyses: anals,
        physiognomyReadings: physRead,
        divinations: divs,
        userBonds: bonds,
        bondInvitations: bondInvs,
        chapterUnlockInvitations: chapInvs,
        bondInviteCredits: bondCredits,
        readingGifts: gifts,
        sharedReports: shared,
        lifeEvents: lifeEvts,
        conversations: convos,
        conversationMessages: convoMsgs,
        singlePurchases: singlePurch,
        freeMonthlyQuotas: freeQuotas,
        userEntitlements: entitlements,
        userCredits: credits,
        fengSites: sites,
        fengReports: reports,
        fengJobs: jobs,
      },
    }

    const date = new Date().toISOString().slice(0, 10)
    c.header(
      'Content-Disposition',
      `attachment; filename="hexastral-export-${userId}-${date}.json"`
    )
    return c.json(payload)
  })

  /** 更新用户偏好 — AI 解读音调 / 通知偏好 */
  .patch('/:userId/preferences', async (c) => {
    const userId = requireUserId(c)
    if (userId !== c.req.param('userId')) throw new HTTPException(403, { message: 'Forbidden' })

    const body = await c.req.json()
    const input = updatePreferencesSchema.parse(body)

    if (!input.tonePreference && !input.locale && !input.notifPrefs) {
      throw new HTTPException(400, { message: 'No preference fields provided' })
    }

    const db = c.get('db')
    await db
      .update(users)
      .set({
        ...(input.tonePreference !== undefined && { tonePreference: input.tonePreference }),
        ...(input.locale !== undefined && { locale: input.locale }),
        ...(input.notifPrefs !== undefined && { notifPrefsJson: JSON.stringify(input.notifPrefs) }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId))

    return c.json({ data: { updated: true } })
  })

  // ── Biometric (face/palm) processing consent — BIPA / GDPR Art.9 ───────────────

  /**
   * POST /api/user/:userId/biometric-consent
   * Records an explicit, timestamped face/palm biometric-processing opt-in. The client
   * MUST show a dedicated consent screen (disclosure: what's processed, that Gemini is
   * the sub-processor, retention = feature vectors only) before calling this. The face
   * VLM pipeline 403s `biometric_consent_required` until this is set. See
   * lib/biometric-consent.ts.
   */
  .post('/:userId/biometric-consent', async (c) => {
    const userId = requireUserId(c)
    if (userId !== c.req.param('userId')) throw new HTTPException(403, { message: 'Forbidden' })
    await recordBiometricConsent(c.get('db'), userId)
    return c.json({ data: { consented: true, version: BIOMETRIC_CONSENT_VERSION } })
  })

  /** DELETE /api/user/:userId/biometric-consent — withdraw consent (GDPR/BIPA right). */
  .delete('/:userId/biometric-consent', async (c) => {
    const userId = requireUserId(c)
    if (userId !== c.req.param('userId')) throw new HTTPException(403, { message: 'Forbidden' })
    await revokeBiometricConsent(c.get('db'), userId)
    return c.json({ data: { consented: false } })
  })

  // ── Apple Sign-In token revocation ────────────────────────────────────────────

  /**
   * POST /api/user/revoke-apple
   * Exchanges Apple authorizationCode for tokens, then revokes them.
   * Must be called BEFORE deleting the user so HMAC verificati on still passes.
   * See: https://developer.apple.com/documentation/sign_in_with_apple/revoke_tokens
   */
  .post('/revoke-apple', async (c) => {
    requireUserId(c) // HMAC-verified — user must still exist when this route is called

    const { APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY } = c.env
    if (!APPLE_TEAM_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY) {
      throw new HTTPException(503, { message: 'Apple revocation not configured' })
    }

    const body = await c.req.json()
    const { authorizationCode } = revokeAppleSchema.parse(body)

    const clientSecret = await makeAppleClientSecret(APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY)

    // 1. Exchange authorization_code for access_token
    const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: 'com.zhop.hexastral',
        client_secret: clientSecret,
        code: authorizationCode,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      // Log but don't hard-fail — revocation is best-effort; user deletion still proceeds
      console.error(
        '[user/revoke-apple] token exchange failed',
        tokenRes.status,
        await tokenRes.text()
      )
      return c.json({ revoked: false, reason: 'token_exchange_failed' })
    }

    const tokens = (await tokenRes.json()) as { access_token?: string }

    if (!tokens.access_token) {
      return c.json({ revoked: false, reason: 'no_access_token' })
    }

    // 2. Revoke the access token
    await fetch('https://appleid.apple.com/auth/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: 'com.zhop.hexastral',
        client_secret: clientSecret,
        token: tokens.access_token,
        token_type_hint: 'access_token',
      }),
    })

    return c.json({ revoked: true })
  })

// ── Auto-match: 当用户设置 phoneHash 时，匹配已有 Bonds + 创建反向邀请 + Push ─────

async function autoMatchBonds(
  db: AppDb,
  env: CloudflareBindings,
  userId: string,
  phoneHash: string
): Promise<void> {
  try {
    // Find pending bonds where someone added this phoneHash as a target
    const pending = await db
      .select({
        id: userBonds.id,
        ownerId: userBonds.ownerId,
        targetName: userBonds.targetName,
        relationshipLabel: userBonds.relationshipLabel,
      })
      .from(userBonds)
      .where(and(eq(userBonds.targetPhoneHash, phoneHash), eq(userBonds.status, 'pending_invite')))

    // Get the new user's name for push notification body
    const newUser = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .get()

    for (const bond of pending) {
      // Update A→B bond to active (matched)
      await db
        .update(userBonds)
        .set({
          targetUserId: userId,
          status: 'active',
          updatedAt: new Date().toISOString(),
        })
        .where(eq(userBonds.id, bond.id))

      // Create reverse bond B→A with status 'pending_invite' (B must accept)
      const reverseBondId = crypto.randomUUID()
      await db.insert(userBonds).values({
        id: reverseBondId,
        ownerId: userId,
        targetUserId: bond.ownerId,
        targetName: bond.targetName,
        targetPhoneHash: null,
        relationshipLabel: bond.relationshipLabel,
        hehunReadingId: null,
        status: 'pending_invite',
      })

      // Push notification to bond owner (A): "Your contact joined!"
      const displayName = newUser?.name ?? bond.targetName
      await sendPushEvent(env, bond.ownerId, 'bond_matched', { name: displayName })
    }
  } catch (err) {
    console.error('[user] autoMatchBonds failed:', err)
  }
}
