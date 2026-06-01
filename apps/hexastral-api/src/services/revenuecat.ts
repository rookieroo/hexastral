/**
 * RevenueCat entitlement reconciliation (ADR-0013 §5b).
 *
 * The webhook is push-only — a dropped/late RC event leaves `user_entitlements`
 * drifted (a subscriber wrongly blocked after a missed RENEWAL, or still-active
 * after a missed CANCELLATION). This pulls the RC REST subscriber snapshot and
 * reconciles, so an active user self-heals on app launch (and a scheduled sweep
 * can reuse the same function later).
 *
 * Pure core (`parseRcActiveEntitlements` + `diffEntitlements`) is unit-tested; the
 * fetch + apply are the only I/O. Entitlement-only by design — the universe monthly
 * allowance stays webhook-driven (a missed renewal's allowance refreshes on the next
 * successful RENEWAL event); reconciliation fixes the access bug, not the credit top-up.
 */

import {
  ALL_ENTITLEMENT_KEYS,
  type EntitlementKey,
  type SubscriptionPlan,
} from '../config/products'
import type { AppDb } from '../infra-types'
import {
  type ActiveEntitlement,
  expireEntitlementNow,
  getActiveEntitlements,
  grantEntitlement,
} from './entitlements'

export interface RcEntitlement {
  key: EntitlementKey
  /** ISO expiry; null = lifetime / non-expiring. */
  expiresAt: string | null
  productId: string | null
  plan: SubscriptionPlan | null
}

const KNOWN_KEYS: ReadonlySet<string> = new Set(ALL_ENTITLEMENT_KEYS)

function planFromProductId(productId: string | null): SubscriptionPlan | null {
  if (!productId) return null
  if (productId.endsWith('_annual')) return 'annual'
  if (productId.endsWith('_monthly')) return 'monthly'
  return null
}

/**
 * Parse RC `GET /v1/subscribers/{id}` JSON into the set of ACTIVE, KNOWN entitlements.
 * Active = no expiry (lifetime) or expiry strictly after `nowIso`. Unknown keys (not in
 * our catalog) are ignored. Pure.
 */
export function parseRcActiveEntitlements(json: unknown, nowIso: string): RcEntitlement[] {
  const subscriber = (json as { subscriber?: unknown } | null)?.subscriber
  const ents = (subscriber as { entitlements?: unknown } | null)?.entitlements
  if (!ents || typeof ents !== 'object') return []

  const out: RcEntitlement[] = []
  for (const [key, raw] of Object.entries(ents as Record<string, unknown>)) {
    if (!KNOWN_KEYS.has(key)) continue
    const val = raw as { expires_date?: unknown; product_identifier?: unknown }
    const expiresAt = typeof val.expires_date === 'string' ? val.expires_date : null
    // Compare numerically — RC uses `…Z` (no millis); our nowIso has millis.
    if (expiresAt !== null && Date.parse(expiresAt) <= Date.parse(nowIso)) continue
    const productId = typeof val.product_identifier === 'string' ? val.product_identifier : null
    out.push({
      key: key as EntitlementKey,
      expiresAt,
      productId,
      plan: planFromProductId(productId),
    })
  }
  return out
}

/**
 * Compute the reconciliation delta. Pure.
 *   - toGrant:  RC-active entitlements whose local row is missing OR has a different
 *               expiry (self-heals missed renewals; grantEntitlement is an upsert).
 *   - toExpire: locally-active entitlements RC no longer reports active (missed cancel).
 */
export function diffEntitlements(input: {
  rcActive: readonly RcEntitlement[]
  ours: readonly ActiveEntitlement[]
}): { toGrant: RcEntitlement[]; toExpire: EntitlementKey[] } {
  const { rcActive, ours } = input
  const rcKeys = new Set(rcActive.map((e) => e.key))
  const ourByKey = new Map(ours.map((e) => [e.key, e]))

  const toGrant = rcActive.filter((e) => {
    const mine = ourByKey.get(e.key)
    return !mine || (mine.expiresAt ?? null) !== (e.expiresAt ?? null)
  })
  const toExpire = ours.filter((e) => !rcKeys.has(e.key)).map((e) => e.key)

  return { toGrant, toExpire }
}

export interface RcReconcileEnv {
  REVENUECAT_API_KEY?: string
}

/** Fetch the RC subscriber snapshot. Returns null on no-key / non-2xx / parse failure. */
async function fetchRcSubscriber(env: RcReconcileEnv, appUserId: string): Promise<unknown | null> {
  if (!env.REVENUECAT_API_KEY) return null
  try {
    const res = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
      { headers: { Authorization: `Bearer ${env.REVENUECAT_API_KEY}` } }
    )
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export type ReconcileResult =
  | { reconciled: true; granted: EntitlementKey[]; expired: EntitlementKey[] }
  | { reconciled: false; reason: 'no_api_key' | 'rc_unavailable' }

/**
 * Reconcile `user_entitlements` for one user against RC. The RC app-user-id equals our
 * `userId` (the client identifies to RC with it; the webhook stores it as
 * `revenueCatUserId`). Degrades to a no-op (never throws) if RC is unreachable.
 */
export async function reconcileEntitlements(
  db: AppDb,
  env: RcReconcileEnv,
  userId: string
): Promise<ReconcileResult> {
  if (!env.REVENUECAT_API_KEY) return { reconciled: false, reason: 'no_api_key' }
  const json = await fetchRcSubscriber(env, userId)
  if (json === null) return { reconciled: false, reason: 'rc_unavailable' }

  const rcActive = parseRcActiveEntitlements(json, new Date().toISOString())
  const ours = await getActiveEntitlements(db, userId)
  const { toGrant, toExpire } = diffEntitlements({ rcActive, ours })

  for (const g of toGrant) {
    await grantEntitlement(db, userId, g.key, {
      plan: g.plan,
      productId: g.productId ?? g.key,
      expiresAt: g.expiresAt,
    })
  }
  for (const key of toExpire) {
    await expireEntitlementNow(db, userId, key)
  }

  return { reconciled: true, granted: toGrant.map((g) => g.key), expired: toExpire }
}
