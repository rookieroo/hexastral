/**
 * Entitlement service — read/write user_entitlements rows.
 *
 * Written by the RevenueCat webhook on purchase events; read by
 * `GET /api/users/me/entitlements` and any server-side feature gate.
 */

import { and, eq, gt, isNull, or } from 'drizzle-orm'
import type { EntitlementKey, SubscriptionPlan } from '../config/products'
import { userEntitlements } from '../db/schema'
import type { AppDb } from '../infra-types'

export interface ActiveEntitlement {
  key: EntitlementKey
  plan: SubscriptionPlan | null
  productId: string | null
  activatedAt: string
  expiresAt: string | null
}

export async function grantEntitlement(
  db: AppDb,
  userId: string,
  key: EntitlementKey,
  opts: { plan: SubscriptionPlan | null; productId: string; expiresAt: string | null }
): Promise<void> {
  const now = new Date().toISOString()
  await db
    .insert(userEntitlements)
    .values({
      userId,
      entitlementKey: key,
      plan: opts.plan,
      productId: opts.productId,
      activatedAt: now,
      expiresAt: opts.expiresAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [userEntitlements.userId, userEntitlements.entitlementKey],
      set: {
        plan: opts.plan,
        productId: opts.productId,
        expiresAt: opts.expiresAt,
        updatedAt: now,
      },
    })
}

export async function setEntitlementExpiry(
  db: AppDb,
  userId: string,
  key: EntitlementKey,
  expiresAt: string | null
): Promise<void> {
  await db
    .update(userEntitlements)
    .set({ expiresAt, updatedAt: new Date().toISOString() })
    .where(and(eq(userEntitlements.userId, userId), eq(userEntitlements.entitlementKey, key)))
}

export async function expireEntitlementNow(
  db: AppDb,
  userId: string,
  key: EntitlementKey
): Promise<void> {
  return setEntitlementExpiry(db, userId, key, new Date().toISOString())
}

export async function getActiveEntitlements(
  db: AppDb,
  userId: string
): Promise<ActiveEntitlement[]> {
  const now = new Date().toISOString()
  const rows = await db
    .select()
    .from(userEntitlements)
    .where(
      and(
        eq(userEntitlements.userId, userId),
        or(isNull(userEntitlements.expiresAt), gt(userEntitlements.expiresAt, now))
      )
    )
    .all()
  return rows.map((r) => ({
    key: r.entitlementKey as EntitlementKey,
    plan: (r.plan as SubscriptionPlan | null) ?? null,
    productId: r.productId,
    activatedAt: r.activatedAt,
    expiresAt: r.expiresAt,
  }))
}

/** Returns true iff `key` is currently active for `userId`. */
export async function hasActiveEntitlement(
  db: AppDb,
  userId: string,
  key: EntitlementKey
): Promise<boolean> {
  const active = await getActiveEntitlements(db, userId)
  return active.some((e) => e.key === key)
}
