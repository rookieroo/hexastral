/**
 * RevenueCat Webhook — IAP processing for HexAstral universe.
 *
 * Product ↔ entitlement mapping lives in src/config/products.ts (single source
 * of truth; mirror in App Store Connect + RevenueCat dashboard per
 * docs/setup/revenuecat-entitlements.md).
 *
 *   subscription : activate/renewal → grant entitlements; cancel → update expiry;
 *                  expiration → set expiry = now
 *   consumable   : face/dream/numerology → user_credits ledger (ADR-0013);
 *                  chat/divination/coincast_cast → legacy users.*_credits_remaining
 *   single_purchase: row insert in single_purchases
 *   universe_pro : also grants (activate/renewal) / clears (expiration) the
 *                  monthly consumable allowance in user_credits
 *
 * Legacy CoinCast Pro (coincast_pro_*) keeps writing coincast_pro_expires_at
 * — those products grant no new entitlement until CoinCast migrates to
 * useEntitlements().
 */

import { eq, sql } from 'drizzle-orm'
import type { Context } from 'hono'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { nanoid } from 'nanoid'
import {
  COINCAST_PRO_PRODUCT_IDS,
  type CreditType,
  ENTITLEMENT_MONTHLY_ALLOWANCE,
  getProduct,
  isConsumableProduct,
  isSinglePurchaseProduct,
  isSubscriptionProduct,
  ledgerCreditTypeForConsumable,
  type SubscriptionProduct,
} from '../config/products'
import { singlePurchases, users } from '../db/schema'
import type { AppDb, AppEnv } from '../infra-types'
import { alertAdmin } from '../lib/admin-alert'
import { emitGrowthEventServer } from '../lib/growth-emit'
import { clearAllowance, grantPurchasedCredits, setMonthlyAllowance } from '../services/credits'
import {
  expireEntitlementNow,
  grantEntitlement,
  setEntitlementExpiry,
} from '../services/entitlements'
import { currentMonth } from '../services/quota'

export const webhookRoutes = new Hono<AppEnv>()

const CONSUMABLE_EVENTS = new Set(['INITIAL_PURCHASE', 'NON_RENEWING_PURCHASE'])
// RevenueCat emits INITIAL_PURCHASE for the FIRST subscription purchase (there is no
// 'INITIAL_SUBSCRIPTION' event); RENEWAL on each renewal; PRODUCT_CHANGE on an in-group
// crossgrade (e.g. auspice_pro → universe_pro) which must grant the new product's bundle;
// UNCANCELLATION when a user un-cancels before expiry. The product kind (subscription vs
// consumable) disambiguates INITIAL_PURCHASE between this set and CONSUMABLE_EVENTS.
const SUBSCRIPTION_ACTIVATE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
])
const SUBSCRIPTION_CANCEL_EVENTS = new Set(['CANCELLATION'])
const SUBSCRIPTION_EXPIRE_EVENTS = new Set(['EXPIRATION'])

export type SubscriptionEventAction = 'activate' | 'cancel' | 'expire' | 'skip'

/**
 * Classify a RevenueCat subscription event into the webhook's action. Exported + pure so
 * the event→action mapping is unit-tested — a wrong string here silently locked every new
 * subscriber out (the `INITIAL_SUBSCRIPTION` bug). `INITIAL_PURCHASE` is the REAL first-sub
 * event; the legacy `INITIAL_SUBSCRIPTION` is not an RC event → 'skip' (regression guard).
 */
export function classifySubscriptionEvent(eventType: string): SubscriptionEventAction {
  if (SUBSCRIPTION_ACTIVATE_EVENTS.has(eventType)) return 'activate'
  if (SUBSCRIPTION_CANCEL_EVENTS.has(eventType)) return 'cancel'
  if (SUBSCRIPTION_EXPIRE_EVENTS.has(eventType)) return 'expire'
  return 'skip'
}

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
  if (!event) return c.json({ received: true, action: 'no_event' })

  const eventType: string = event.type ?? ''
  const productId: string = event.product_id ?? ''
  const appUserId: string = event.app_user_id ?? ''
  const eventId: string = event.id ?? `${eventType}_${productId}_${Date.now()}`
  const expirationAtMs: number | null = event.expiration_at_ms ?? null
  const expiresAt = expirationAtMs ? new Date(expirationAtMs).toISOString() : null

  const product = getProduct(productId)
  if (!product) {
    alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
      title: 'IAP: unknown product',
      message: `RevenueCat sent an unrecognized productId: ${productId}`,
      level: 'warning',
      context: { productId, eventType, appUserId },
    }).catch(() => {})
    return c.json({ received: true, action: 'unknown_product', productId })
  }

  if (!appUserId) return c.json({ received: true, action: 'no_user_id' }, 400)
  const db = c.get('db')

  // ── Subscriptions ──────────────────────────────────────────────────────
  if (isSubscriptionProduct(product)) {
    return handleSubscriptionEvent(c, {
      db,
      product,
      eventType,
      appUserId,
      productId,
      expiresAt,
    })
  }

  // ── Consumables and single purchases ──────────────────────────────────
  if (!CONSUMABLE_EVENTS.has(eventType)) {
    return c.json({ received: true, action: 'skipped', eventType })
  }

  // KV idempotency: same eventId only processes once (TTL 30 days)
  const dedupKey = `rc_evt:${eventId}`
  const existing = await c.env.GUARD_KV.get(dedupKey)
  if (existing) return c.json({ received: true, action: 'duplicate_event', eventId })

  const user = await db.select({ id: users.id }).from(users).where(eq(users.id, appUserId)).get()
  if (!user) {
    alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
      title: 'IAP: user not found on consumable / single purchase',
      message: `User ${appUserId} not found during ${eventType} for ${productId}`,
      level: 'error',
      context: { appUserId, eventType, productId },
    }).catch(() => {})
    return c.json({ received: true, action: 'user_not_found', userId: appUserId }, 404)
  }

  if (isSinglePurchaseProduct(product)) {
    await db.insert(singlePurchases).values({
      id: nanoid(),
      userId: appUserId,
      skuId: product.singleSku,
      rcEventId: eventId,
      productId,
      status: 'purchased',
    })
    await c.env.GUARD_KV.put(dedupKey, '1', { expirationTtl: 2592000 })
    alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
      title: 'IAP: single reading purchased',
      message: `${productId} (${product.singleSku}) purchased`,
      level: 'info',
      context: { appUserId, productId, skuId: product.singleSku },
    }).catch(() => {})
    return c.json({
      received: true,
      action: 'single_purchase_recorded',
      userId: appUserId,
      productId,
      skuId: product.singleSku,
    })
  }

  if (isConsumableProduct(product)) {
    const { kind, credits } = product.consumable
    const updatedAt = new Date().toISOString()
    const ledgerType = ledgerCreditTypeForConsumable(kind)

    if (ledgerType) {
      // Ledger-backed episodic pack (face/dream/numerology) → user_credits (ADR-0013).
      await grantPurchasedCredits(db, appUserId, ledgerType, credits)
    } else if (kind === 'chat') {
      await db
        .update(users)
        .set({ chatCreditsRemaining: sql`chat_credits_remaining + ${credits}`, updatedAt })
        .where(eq(users.id, appUserId))
    } else if (kind === 'cast') {
      await db
        .update(users)
        .set({
          divinationCreditsRemaining: sql`divination_credits_remaining + ${credits}`,
          updatedAt,
        })
        .where(eq(users.id, appUserId))
    } else {
      await db
        .update(users)
        .set({
          coincastCreditsRemaining: sql`coincast_credits_remaining + ${credits}`,
          updatedAt,
        })
        .where(eq(users.id, appUserId))
    }

    await c.env.GUARD_KV.put(dedupKey, '1', { expirationTtl: 2592000 })

    alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
      title: `IAP: ${kind} credits added`,
      message: `${credits} ${kind} credits added for ${productId}`,
      level: 'info',
      context: { appUserId, productId, kind, creditsAdded: String(credits) },
    }).catch(() => {})

    return c.json({
      received: true,
      action: 'credits_added',
      userId: appUserId,
      productId,
      kind,
      creditsAdded: credits,
    })
  }

  return c.json({ received: true, action: 'unhandled_product_kind', productId })
})

// ── Subscription handler ──────────────────────────────────────────────────

interface SubscriptionEventArgs {
  db: AppDb
  product: SubscriptionProduct
  eventType: string
  appUserId: string
  productId: string
  expiresAt: string | null
}

async function handleSubscriptionEvent(c: Context<AppEnv>, args: SubscriptionEventArgs) {
  const { db, product, eventType, appUserId, productId, expiresAt } = args

  const user = await db.select().from(users).where(eq(users.id, appUserId)).get()
  if (!user) {
    alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
      title: 'IAP: user not found on subscription event',
      message: `User ${appUserId} not found during ${eventType} for ${productId}`,
      level: 'error',
      context: { appUserId, eventType, productId },
    }).catch(() => {})
    return c.json({ received: true, action: 'user_not_found', userId: appUserId }, 404)
  }

  const isCoincastLegacy = COINCAST_PRO_PRODUCT_IDS.has(productId)
  const now = new Date().toISOString()
  const action = classifySubscriptionEvent(eventType)

  if (action === 'activate') {
    for (const key of product.grantsEntitlements) {
      await grantEntitlement(db, appUserId, key, {
        plan: product.plan,
        productId,
        expiresAt,
      })
    }

    // Always record the RC user id; legacy per-product side-effects below.
    await db
      .update(users)
      .set({ revenueCatUserId: appUserId, updatedAt: now })
      .where(eq(users.id, appUserId))
    if (isCoincastLegacy) {
      await db
        .update(users)
        .set({ coincastProExpiresAt: expiresAt, updatedAt: now })
        .where(eq(users.id, appUserId))
    }

    // Monthly reading allowance: merge across every entitlement this product grants
    // (max per type) so the universe bundle + a standalone faceoracle_pro never
    // double-grant. setMonthlyAllowance is idempotent within a period (RENEWAL-safe).
    const monthlyAllowance: Partial<Record<CreditType, number>> = {}
    for (const key of product.grantsEntitlements) {
      const grant = ENTITLEMENT_MONTHLY_ALLOWANCE[key]
      if (!grant) continue
      for (const [creditType, amount] of Object.entries(grant)) {
        const t = creditType as CreditType
        monthlyAllowance[t] = Math.max(monthlyAllowance[t] ?? 0, amount)
      }
    }
    if (Object.keys(monthlyAllowance).length > 0) {
      const period = currentMonth()
      for (const [creditType, amount] of Object.entries(monthlyAllowance)) {
        await setMonthlyAllowance(db, appUserId, creditType as CreditType, amount, period)
      }
    }

    alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
      title: 'IAP: subscription activated',
      message: `${eventType} for ${productId}`,
      level: 'info',
      context: {
        appUserId,
        eventType,
        productId,
        plan: product.plan,
        entitlements: product.grantsEntitlements.join(',') || '(legacy)',
      },
    }).catch(() => {})

    // P0-8: emit subscription_started to growth funnel. Fires for both first
    // activation AND renewal (each RC event has a distinct id; same-id replay
    // is blocked by the upstream KV dedup at routes/webhook.ts:166). Renewal
    // signals retention, initial signals conversion — both feed funnel math.
    emitGrowthEventServer(
      c.env,
      {
        event_id: `sub_${appUserId}_${productId}_${Date.now()}`,
        occurred_at_ms: Date.now(),
        source: 'api',
        user_id: appUserId,
        target_app: product.grantsEntitlements[0]?.replace('_pro', '') ?? 'hexastral',
        event_name: 'subscription_started',
        payload: {
          product_id: productId,
          meta: {
            plan: product.plan,
            entitlements: product.grantsEntitlements,
            event_type: eventType,
          },
        },
      },
      c.get('requestId')
    )

    return c.json({
      received: true,
      action: 'subscription_activated',
      userId: appUserId,
      productId,
      plan: product.plan,
      entitlements: product.grantsEntitlements,
    })
  }

  if (action === 'cancel') {
    for (const key of product.grantsEntitlements) {
      await setEntitlementExpiry(db, appUserId, key, expiresAt)
    }
    if (isCoincastLegacy) {
      await db
        .update(users)
        .set({ coincastProExpiresAt: expiresAt, updatedAt: now })
        .where(eq(users.id, appUserId))
    }
    alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
      title: 'IAP: subscription cancelled',
      message: `CANCELLATION for ${productId} — access until ${expiresAt ?? 'unknown'}`,
      level: 'info',
      context: { appUserId, productId, expiresAt: expiresAt ?? 'none' },
    }).catch(() => {})
    return c.json({
      received: true,
      action: 'subscription_cancelled',
      userId: appUserId,
      productId,
    })
  }

  if (action === 'expire') {
    for (const key of product.grantsEntitlements) {
      await expireEntitlementNow(db, appUserId, key)
    }
    if (isCoincastLegacy) {
      await db
        .update(users)
        .set({ coincastProExpiresAt: null, updatedAt: now })
        .where(eq(users.id, appUserId))
    }
    // Subscription lapsed → zero the monthly allowance for the types it granted
    // (purchased credits survive). universe → all types; faceoracle_pro → only face.
    const expiredAllowanceTypes = new Set<CreditType>()
    for (const key of product.grantsEntitlements) {
      const grant = ENTITLEMENT_MONTHLY_ALLOWANCE[key]
      if (grant) for (const ct of Object.keys(grant)) expiredAllowanceTypes.add(ct as CreditType)
    }
    for (const ct of expiredAllowanceTypes) {
      await clearAllowance(db, appUserId, ct)
    }
    alertAdmin(c.env.SVC_ADMIN_NOTIFY, {
      title: 'IAP: subscription expired',
      message: `EXPIRATION for ${productId}`,
      level: 'info',
      context: { appUserId, productId },
    }).catch(() => {})
    return c.json({
      received: true,
      action: 'subscription_expired',
      userId: appUserId,
      productId,
    })
  }

  return c.json({ received: true, action: 'subscription_event_skipped', eventType })
}
