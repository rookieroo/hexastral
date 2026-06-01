/**
 * RevenueCat Webhook — 对话消息包充值 (hexastral_chat_5) + 订阅生命周期
 *
 * RevenueCat → POST /webhooks/revenuecat
 *   consumable  : INITIAL_PURCHASE, NON_RENEWING_PURCHASE → D1 users.chat_credits_remaining += n
 *   subscription: INITIAL_SUBSCRIPTION, RENEWAL → set status=pro, plan, expiresAt, createQuota
 *                 CANCELLATION → set subscriptionExpiresAt only (access until expiry)
 *                 EXPIRATION   → set status=free, plan=null, zero quota
 *
 * 安全: 验证 RevenueCat Authorization header (constant-time HMAC comparison)
 */

import { eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { nanoid } from 'nanoid'
import { singlePurchases, users } from '../db/schema'
import type { AppEnv } from '../infra-types'
import { alertAdmin } from '../lib/admin-alert'
import { createInitialQuota, zeroCurrentQuota, type SubscriptionPlan } from '../services/quota'

export const webhookRoutes = new Hono<AppEnv>()

/** Product ID → chat credits (messages) mapping */
const CHAT_PACK_MESSAGES: Record<string, number> = {
  hexastral_chat_5: 5,
}

/** Product ID → divination credits mapping (hexastral_divination_3 pack) */
const DIVINATION_PACK_CREDITS: Record<string, number> = {
  hexastral_divination_3: 3,
}

/** Product ID → single-reading SKU mapping */
const SINGLE_READING_SKUS: Record<string, 'divination' | 'fate_reading' | 'compatibility'> = {
  hexastral_divination_single: 'divination',
  hexastral_fate_reading: 'fate_reading',
  hexastral_compatibility: 'compatibility',
}

/** Product ID → subscription plan mapping */
const SUBSCRIPTION_PLAN: Record<string, SubscriptionPlan> = {
  hexastral_pro_monthly: 'monthly',
  hexastral_pro_annual: 'annual',
}

/** CoinCast satellite — Pro subscription SKUs (separate from HexAstral Pro). */
const COINCAST_SUBSCRIPTION_PRODUCTS = new Set(['coincast_pro_monthly', 'coincast_pro_annual'])

/** CoinCast consumable cast pack → credits */
const COINCAST_PACK_CREDITS: Record<string, number> = {
  coincast_cast_pack_10: 10,
}

/** RevenueCat consumable event types */
const CONSUMABLE_EVENTS = new Set(['INITIAL_PURCHASE', 'NON_RENEWING_PURCHASE'])

/** RevenueCat subscription lifecycle event types */
const SUBSCRIPTION_ACTIVATE_EVENTS = new Set(['INITIAL_SUBSCRIPTION', 'RENEWAL'])
const SUBSCRIPTION_CANCEL_EVENTS = new Set(['CANCELLATION'])
const SUBSCRIPTION_EXPIRE_EVENTS = new Set(['EXPIRATION'])

webhookRoutes.post('/revenuecat', async (c) => {
  const expectedSecret = c.env.REVENUECAT_WEBHOOK_SECRET
  if (!expectedSecret) {
    alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
      title: 'RevenueCat webhook secret missing',
      message: 'REVENUECAT_WEBHOOK_SECRET is not configured — IAP processing is broken',
      level: 'critical',
    }).catch(() => {})
    throw new HTTPException(500, { message: 'Webhook secret not configured' })
  }

  const authHeader = c.req.header('Authorization') ?? ''
  const expectedAuth = `Bearer ${expectedSecret}`

  // Constant-time comparison via HMAC: sign both values with same key, compare digests
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode('webhook-verify'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const [expectedSig, actualSig] = await Promise.all([
    crypto.subtle.sign('HMAC', key, encoder.encode(expectedAuth)),
    crypto.subtle.sign('HMAC', key, encoder.encode(authHeader)),
  ])
  const expectedArr = new Uint8Array(expectedSig)
  const actualArr = new Uint8Array(actualSig)
  if (expectedArr.length !== actualArr.length)
    throw new HTTPException(401, { message: 'Unauthorized' })
  let diff = 0
  for (let i = 0; i < expectedArr.length; i++) diff |= (expectedArr[i] ?? 0) ^ (actualArr[i] ?? 0)
  if (diff !== 0) {
    alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
      title: 'RevenueCat webhook auth failed',
      message: 'Authorization header mismatch — possible spoofed IAP webhook',
      level: 'critical',
      context: { remoteIp: c.req.header('CF-Connecting-IP') ?? 'unknown' },
    }).catch(() => {})
    throw new HTTPException(401, { message: 'Unauthorized' })
  }

  const body = await c.req.json()
  const event = body?.event

  if (!event) {
    return c.json({ received: true, action: 'no_event' })
  }

  const eventType: string = event.type ?? ''
  const productId: string = event.product_id ?? ''
  const appUserId: string = event.app_user_id ?? ''
  const eventId: string = event.id ?? `${eventType}_${productId}_${Date.now()}`

  // ── CoinCast Pro subscription (separate from HexAstral Pro) ─────────────
  if (SUBSCRIPTION_ACTIVATE_EVENTS.has(eventType) && COINCAST_SUBSCRIPTION_PRODUCTS.has(productId)) {
    if (!appUserId) return c.json({ received: true, action: 'no_user_id' }, 400)

    const db = c.get('db')
    const user = await db.select().from(users).where(eq(users.id, appUserId)).get()
    if (!user) {
      alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
        title: 'IAP: user not found on CoinCast subscription activate',
        message: `User ${appUserId} not found during ${eventType} for ${productId}`,
        level: 'error',
        context: { appUserId, eventType, productId },
      }).catch(() => {})
      return c.json({ received: true, action: 'user_not_found', userId: appUserId }, 404)
    }

    const expirationAtMs: number | null = event.expiration_at_ms ?? null
    const expiresAt = expirationAtMs ? new Date(expirationAtMs).toISOString() : null

    await db
      .update(users)
      .set({
        coincastProExpiresAt: expiresAt,
        revenueCatUserId: appUserId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, appUserId))

    alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
      title: 'IAP: CoinCast subscription activated',
      message: `${eventType} for ${productId}`,
      level: 'info',
      context: { appUserId, eventType, productId },
    }).catch(() => {})

    return c.json({ received: true, action: 'coincast_subscription_activated', userId: appUserId, productId })
  }

  // ── 订阅类事件 ────────────────────────────────────────────────────────
  if (SUBSCRIPTION_ACTIVATE_EVENTS.has(eventType)) {
    const plan = SUBSCRIPTION_PLAN[productId]
    if (!plan) {
      alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
        title: 'Unknown subscription product',
        message: `RevenueCat sent an unrecognized subscription productId: ${productId}`,
        level: 'warning',
        context: { productId, eventType, appUserId },
      }).catch(() => {})
      return c.json({ received: true, action: 'unknown_subscription_product', productId })
    }
    if (!appUserId) return c.json({ received: true, action: 'no_user_id' }, 400)

    const db = c.get('db')
    const user = await db.select().from(users).where(eq(users.id, appUserId)).get()
    if (!user) {
      alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
        title: 'IAP: user not found on subscription activate',
        message: `User ${appUserId} not found during ${eventType} for ${productId}`,
        level: 'error',
        context: { appUserId, eventType, productId },
      }).catch(() => {})
      return c.json({ received: true, action: 'user_not_found', userId: appUserId }, 404)
    }

    // expirationAtMs from RevenueCat is the Unix ms timestamp of period end
    const expirationAtMs: number | null = event.expiration_at_ms ?? null
    const expiresAt = expirationAtMs ? new Date(expirationAtMs).toISOString() : null

    await db
      .update(users)
      .set({
        subscriptionStatus: 'pro',
        subscriptionPlan: plan,
        subscriptionExpiresAt: expiresAt,
        revenueCatUserId: appUserId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, appUserId))

    await createInitialQuota(db, appUserId, plan)

    alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
      title: 'IAP: subscription activated',
      message: `${eventType} for ${productId}`,
      level: 'info',
      context: { appUserId, eventType, productId, plan },
    }).catch(() => {})

    return c.json({ received: true, action: 'subscription_activated', userId: appUserId, plan })
  }

  if (SUBSCRIPTION_CANCEL_EVENTS.has(eventType)) {
    if (COINCAST_SUBSCRIPTION_PRODUCTS.has(productId)) {
      if (!appUserId) return c.json({ received: true, action: 'no_user_id' }, 400)

      const db = c.get('db')
      const user = await db.select().from(users).where(eq(users.id, appUserId)).get()
      if (!user) {
        return c.json({ received: true, action: 'user_not_found', userId: appUserId }, 404)
      }

      const expirationAtMs: number | null = event.expiration_at_ms ?? null
      const expiresAt = expirationAtMs ? new Date(expirationAtMs).toISOString() : null

      await db
        .update(users)
        .set({
          coincastProExpiresAt: expiresAt,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, appUserId))

      return c.json({ received: true, action: 'coincast_subscription_cancelled', userId: appUserId })
    }

    if (!appUserId) return c.json({ received: true, action: 'no_user_id' }, 400)

    const db = c.get('db')
    const user = await db.select().from(users).where(eq(users.id, appUserId)).get()
    if (!user) {
      alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
        title: 'IAP: user not found on cancellation',
        message: `User ${appUserId} not found during CANCELLATION for ${productId}`,
        level: 'error',
        context: { appUserId, eventType, productId },
      }).catch(() => {})
      return c.json({ received: true, action: 'user_not_found', userId: appUserId }, 404)
    }

    // Cancellation: access continues until expiry; only update expiresAt
    const expirationAtMs: number | null = event.expiration_at_ms ?? null
    const expiresAt = expirationAtMs ? new Date(expirationAtMs).toISOString() : null

    await db
      .update(users)
      .set({
        subscriptionExpiresAt: expiresAt,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, appUserId))

    alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
      title: 'IAP: subscription cancelled',
      message: `CANCELLATION for ${productId} — access until ${expiresAt ?? 'unknown'}`,
      level: 'info',
      context: { appUserId, productId, expiresAt: expiresAt ?? 'none' },
    }).catch(() => {})

    return c.json({ received: true, action: 'subscription_cancelled', userId: appUserId })
  }

  if (SUBSCRIPTION_EXPIRE_EVENTS.has(eventType)) {
    if (COINCAST_SUBSCRIPTION_PRODUCTS.has(productId)) {
      if (!appUserId) return c.json({ received: true, action: 'no_user_id' }, 400)

      const db = c.get('db')
      const user = await db.select().from(users).where(eq(users.id, appUserId)).get()
      if (!user) {
        return c.json({ received: true, action: 'user_not_found', userId: appUserId }, 404)
      }

      await db
        .update(users)
        .set({
          coincastProExpiresAt: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, appUserId))

      return c.json({ received: true, action: 'coincast_subscription_expired', userId: appUserId })
    }

    if (!appUserId) return c.json({ received: true, action: 'no_user_id' }, 400)

    const db = c.get('db')
    const user = await db.select().from(users).where(eq(users.id, appUserId)).get()
    if (!user) {
      alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
        title: 'IAP: user not found on expiration',
        message: `User ${appUserId} not found during EXPIRATION for ${productId}`,
        level: 'error',
        context: { appUserId, eventType, productId },
      }).catch(() => {})
      return c.json({ received: true, action: 'user_not_found', userId: appUserId }, 404)
    }

    await db
      .update(users)
      .set({
        subscriptionStatus: 'free',
        subscriptionPlan: null,
        subscriptionExpiresAt: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, appUserId))

    await zeroCurrentQuota(db, appUserId)

    alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
      title: 'IAP: subscription expired',
      message: `EXPIRATION for ${productId} — user reverted to free`,
      level: 'info',
      context: { appUserId, productId },
    }).catch(() => {})

    return c.json({ received: true, action: 'subscription_expired', userId: appUserId })
  }

  // ── 消耗品类事件 ──────────────────────────────────────────────────────
  if (!CONSUMABLE_EVENTS.has(eventType)) {
    return c.json({ received: true, action: 'skipped', eventType })
  }

  if (!appUserId) {
    return c.json({ received: true, action: 'no_user_id' }, 400)
  }

  const db = c.get('db')

  // KV 幂等去重：相同 eventId 只处理一次（TTL 30 天）
  const dedupKey = `rc_evt:${eventId}`
  const existing = await c.env.GUARD_KV.get(dedupKey)
  if (existing) {
    return c.json({ received: true, action: 'duplicate_event', eventId })
  }

  // 确认用户存在
  const user = await db.select({ id: users.id }).from(users).where(eq(users.id, appUserId)).get()
  if (!user) {
    alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
      title: 'IAP: user not found on consumable purchase',
      message: `User ${appUserId} not found during ${eventType} for ${productId}`,
      level: 'error',
      context: { appUserId, eventType, productId },
    }).catch(() => {})
    return c.json({ received: true, action: 'user_not_found', userId: appUserId }, 404)
  }

  // ── 单次阅读购买 ─────────────────────────────────────────────────────
  const singleSkuId = SINGLE_READING_SKUS[productId]
  if (singleSkuId) {
    await db.insert(singlePurchases).values({
      id: nanoid(),
      userId: appUserId,
      skuId: singleSkuId,
      rcEventId: eventId,
      productId,
      status: 'purchased',
    })
    await c.env.GUARD_KV.put(dedupKey, '1', { expirationTtl: 2592000 })
    alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
      title: 'IAP: single reading purchased',
      message: `${productId} (${singleSkuId}) purchased`,
      level: 'info',
      context: { appUserId, productId, skuId: singleSkuId },
    }).catch(() => {})
    return c.json({
      received: true,
      action: 'single_purchase_recorded',
      userId: appUserId,
      productId,
      skuId: singleSkuId,
    })
  }

  // ── CoinCast cast pack ────────────────────────────────────────────────
  const coincastCastsToAdd = COINCAST_PACK_CREDITS[productId]
  if (typeof coincastCastsToAdd === 'number') {
    await db
      .update(users)
      .set({
        coincastCreditsRemaining: sql`coincast_credits_remaining + ${coincastCastsToAdd}`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, appUserId))

    await c.env.GUARD_KV.put(dedupKey, '1', { expirationTtl: 2592000 })

    alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
      title: 'IAP: CoinCast cast credits added',
      message: `${coincastCastsToAdd} cast credits added for ${productId}`,
      level: 'info',
      context: { appUserId, productId, castsAdded: String(coincastCastsToAdd) },
    }).catch(() => {})

    return c.json({
      received: true,
      action: 'coincast_credits_added',
      userId: appUserId,
      productId,
      castsAdded: coincastCastsToAdd,
    })
  }

  // ── Divination pack (HexAstral) ───────────────────────────────────────
  const divinationToAdd = DIVINATION_PACK_CREDITS[productId]
  if (typeof divinationToAdd === 'number') {
    await db
      .update(users)
      .set({
        divinationCreditsRemaining: sql`divination_credits_remaining + ${divinationToAdd}`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, appUserId))

    await c.env.GUARD_KV.put(dedupKey, '1', { expirationTtl: 2592000 })

    alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
      title: 'IAP: divination credits added',
      message: `${divinationToAdd} divination credits added for ${productId}`,
      level: 'info',
      context: { appUserId, productId, creditsAdded: String(divinationToAdd) },
    }).catch(() => {})

    return c.json({
      received: true,
      action: 'divination_credits_added',
      userId: appUserId,
      productId,
      creditsAdded: divinationToAdd,
    })
  }

  // ── 聊天点数充值 ─────────────────────────────────────────────────────
  const messagesToAdd = CHAT_PACK_MESSAGES[productId]
  if (!messagesToAdd) {
    alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
      title: 'IAP: unknown consumable product',
      message: `Unrecognized consumable productId: ${productId}`,
      level: 'warning',
      context: { appUserId, eventType, productId },
    }).catch(() => {})
    return c.json({ received: true, action: 'not_consumable_product', productId })
  }

  // 原子充值聊天点数
  await db
    .update(users)
    .set({ chatCreditsRemaining: sql`chat_credits_remaining + ${messagesToAdd}` })
    .where(eq(users.id, appUserId))

  await c.env.GUARD_KV.put(dedupKey, '1', { expirationTtl: 2592000 })

  alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
    title: 'IAP: chat credits added',
    message: `${messagesToAdd} chat credits added for ${productId}`,
    level: 'info',
    context: { appUserId, productId, messagesAdded: String(messagesToAdd) },
  }).catch(() => {})

  return c.json({
    received: true,
    action: 'chat_credits_added',
    userId: appUserId,
    productId,
    messagesAdded: messagesToAdd,
  })
})
