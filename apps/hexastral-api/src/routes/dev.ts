/**
 * Dev helper routes — for internal testing and debugging
 *
 * Mounted at /api/dev/* and protected by hmacVerify middleware (applied in index.ts).
 * Each handler further scopes operations to the authenticated user via requireUserId.
 *
 * Available actions:
 *   POST   /api/dev/set-subscription  — grant/expire the universe_pro entitlement for the authed user
 *   DELETE /api/dev/fate              — wipe fate readings + chart cache for the authed user
 *   POST   /api/dev/full-reset        — wipe fate + charts + birth fields → restart onboarding
 */

import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { dailyAlmanac, dailySignals, reportChapters, userCharts, users } from '../db/schema'
import type { AppEnv } from '../infra-types'
import { requireUserId } from '../lib/auth'
import { expireEntitlementNow, grantEntitlement } from '../services/entitlements'

const devRoutes = new Hono<AppEnv>()

/**
 * POST /api/dev/set-subscription
 * Body: { status: 'free' | 'premium' | 'pro' }
 *
 * Grants ('pro'/'premium') or expires ('free') the universe_pro entitlement so the
 * app reflects Pro/Free without a real RevenueCat sandbox purchase. universe_pro
 * unlocks every capability — the dev stand-in for the retired subscription_status.
 */
devRoutes.post(
  '/set-subscription',
  zValidator('json', z.object({ status: z.enum(['free', 'premium', 'pro']) })),
  async (c) => {
    const userId = requireUserId(c)
    const { status } = c.req.valid('json')
    const db = c.get('db')
    if (status === 'free') {
      await expireEntitlementNow(db, userId, 'universe_pro')
    } else {
      await grantEntitlement(db, userId, 'universe_pro', {
        plan: 'monthly',
        productId: 'dev_set_subscription',
        expiresAt: null,
      })
    }
    return c.json({ ok: true, status })
  }
)

/**
 * DELETE /api/dev/fate
 *
 * Wipes report chapters, daily signals, daily almanac and chart caches
 * for the authed user. Birth profile fields on `users` are preserved.
 * Next visit triggers fresh chart computation + signal/report generation
 * using the same birth info.
 */
devRoutes.delete('/fate', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')
  await db.batch([
    db.delete(reportChapters).where(eq(reportChapters.userId, userId)),
    db.delete(dailySignals).where(eq(dailySignals.userId, userId)),
    db.delete(dailyAlmanac).where(eq(dailyAlmanac.userId, userId)),
    db.delete(userCharts).where(eq(userCharts.userId, userId)),
  ])
  return c.json({ ok: true })
})

/**
 * POST /api/dev/full-reset
 *
 * Wipes server-side state so the user can replay onboarding end-to-end:
 *   - report_chapters + daily_signals + daily_almanac (all LLM-output history)
 *   - user_charts (bazi / ziwei cache)
 *   - users.birth_* fields (date / time / gender / city / lng / lat / tz / calendar)
 *   - users.name / username / avatar_key (and the R2 object) / phone / phone_hash
 *   - users.fate_signature + fate_signature_generated_at (legacy column, kept for backwards-compat)
 *   - users.chart_public + public_visibility_json
 *   - users.dayMasterStem/dayMasterStrength/favorableElement/unfavorableElement/ziweiMingPalaceStar/birthBranch
 *     (static-trait cache, recomputed at next onboarding)
 *
 * Account identity (id, email, apple/google sub) is preserved
 * so the same Apple Sign-In session continues into a fresh onboarding flow.
 */
devRoutes.post('/full-reset', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')

  // Capture the current avatar key so we can delete the R2 object after the
  // DB write succeeds. Avoids dangling objects when the user resets.
  const existing = await db
    .select({ avatarKey: users.avatarKey })
    .from(users)
    .where(eq(users.id, userId))
    .get()

  await db.batch([
    db.delete(reportChapters).where(eq(reportChapters.userId, userId)),
    db.delete(dailySignals).where(eq(dailySignals.userId, userId)),
    db.delete(dailyAlmanac).where(eq(dailyAlmanac.userId, userId)),
    db.delete(userCharts).where(eq(userCharts.userId, userId)),
    db
      .update(users)
      .set({
        // birth profile
        birthSolarDate: null,
        birthTimeIndex: null,
        birthGender: null,
        birthCity: null,
        birthLongitude: null,
        birthLatitude: null,
        birthTimezoneId: null,
        birthCalendarType: null,
        birthLunarDate: null,
        birthIsLeapMonth: false,
        // identity / public profile
        name: null,
        displayName: null,
        username: null,
        avatarKey: null,
        phone: null,
        phoneHash: null,
        chartPublic: false,
        publicVisibilityJson: null,
        // fate identity (legacy column, retained for backwards-compat reads)
        fateSignature: null,
        fateSignatureGeneratedAt: null,
        // static-trait cache (Phase 1 deep refactor)
        dayMasterStem: null,
        dayMasterStrength: null,
        favorableElement: null,
        unfavorableElement: null,
        ziweiMingPalaceStar: null,
        birthBranch: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId)),
  ])

  // Best-effort R2 cleanup of the prior avatar object
  if (existing?.avatarKey && existing.avatarKey.startsWith(`avatars/${userId}/`)) {
    c.executionCtx.waitUntil(c.env.MEDIA_BUCKET.delete(existing.avatarKey))
  }

  return c.json({ ok: true })
})

/**
 * POST /api/dev/repair-user
 *
 * Run the chart-skeleton bootstrap pipeline for the authed user. Idempotent —
 * use to backfill a user whose static traits / ziwei main star / chart cache
 * went missing (e.g. interrupted onboarding before the bootstrap route existed).
 */
devRoutes.post('/repair-user', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) return c.json({ ok: false, code: 'USER_NOT_FOUND' }, 404)
  if (!user.birthSolarDate || user.birthTimeIndex == null || !user.birthGender) {
    return c.json({ ok: false, code: 'MISSING_BIRTH_INFO' }, 400)
  }
  const { buildChartSkeleton } = await import('../lib/chart-skeleton')
  try {
    const skeleton = await buildChartSkeleton(db, c.env, {
      userId,
      birthSolarDate: user.birthSolarDate,
      birthTimeIndex: user.birthTimeIndex,
      birthGender: user.birthGender as '男' | '女',
      birthCity: user.birthCity,
      birthLongitude: user.birthLongitude,
      birthLatitude: user.birthLatitude,
      birthTimezoneId: user.birthTimezoneId,
      hemisphereReversalEnabled: user.hemisphereReversalEnabled === true,
      language: user.locale ?? 'zh-CN',
    })
    return c.json({ ok: true, skeleton })
  } catch (err) {
    console.error('[dev.repair-user] failed', userId, err)
    return c.json({ ok: false, code: 'BUILD_FAILED', message: String(err) }, 502)
  }
})

export { devRoutes }
