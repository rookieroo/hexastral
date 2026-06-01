/**
 * Per-use credit ledger service (ADR-0013 §4).
 *
 * Episodic apps (feng/face/coincast/dream/numerology) spend per-use credits from
 * `user_credits`. Two sources per (user, creditType):
 *   - 'allowance'  universe_pro monthly grant — resets each period, spent FIRST
 *                  (use-it-or-lose-it).
 *   - 'purchased'  IAP pack / one-shot — non-expiring, spent after the allowance.
 *
 * Atomic conditional UPDATEs (balance > 0) guard against over-spend; `.returning()`
 * keeps the check portable across D1 and the in-memory test DB.
 */

import { and, eq, sql } from 'drizzle-orm'
import type { CreditType } from '../config/products'
import { userCredits } from '../db/schema'
import type { AppDb } from '../infra-types'

export type { CreditType }

export type CreditSource = 'purchased' | 'allowance'

/** Allowance is spent before purchased credits (use-it-or-lose-it). */
const CONSUME_ORDER: readonly CreditSource[] = ['allowance', 'purchased']

/** Total credits available for a type (allowance + purchased). */
export async function getCreditBalance(
  db: AppDb,
  userId: string,
  creditType: CreditType
): Promise<number> {
  const rows = await db
    .select({ balance: userCredits.balance })
    .from(userCredits)
    .where(and(eq(userCredits.userId, userId), eq(userCredits.creditType, creditType)))
    .all()
  return rows.reduce((sum, r) => sum + Math.max(0, r.balance), 0)
}

/**
 * Add purchased (non-expiring) credits — called by the RC webhook on a consumable
 * pack / one-shot purchase. Idempotency is the caller's responsibility (rcEventId).
 */
export async function grantPurchasedCredits(
  db: AppDb,
  userId: string,
  creditType: CreditType,
  amount: number
): Promise<void> {
  const now = new Date().toISOString()
  await db
    .insert(userCredits)
    .values({
      userId,
      creditType,
      source: 'purchased',
      balance: amount,
      periodKey: null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [userCredits.userId, userCredits.creditType, userCredits.source],
      set: { balance: sql`${userCredits.balance} + ${amount}`, updatedAt: now },
    })
}

/**
 * Set the universe monthly allowance for one credit type. Resets to `amount` on a
 * new period; a duplicate event in the same period is a no-op, so a partly-spent
 * allowance is never silently refunded.
 */
export async function setMonthlyAllowance(
  db: AppDb,
  userId: string,
  creditType: CreditType,
  amount: number,
  periodKey: string
): Promise<void> {
  const now = new Date().toISOString()
  await db
    .insert(userCredits)
    .values({ userId, creditType, source: 'allowance', balance: amount, periodKey, updatedAt: now })
    .onConflictDoUpdate({
      target: [userCredits.userId, userCredits.creditType, userCredits.source],
      set: {
        // New period → reset to the fresh allowance; same period → keep current balance.
        balance: sql`CASE WHEN ${userCredits.periodKey} = ${periodKey} THEN ${userCredits.balance} ELSE ${amount} END`,
        periodKey,
        updatedAt: now,
      },
    })
}

/**
 * Spend one credit of `creditType` — allowance first, then purchased. Each step is
 * an atomic conditional UPDATE. Returns the source spent, or `{ success: false }`
 * when no credits remain.
 */
export async function consumeCredit(
  db: AppDb,
  userId: string,
  creditType: CreditType
): Promise<{ success: boolean; source?: CreditSource }> {
  for (const source of CONSUME_ORDER) {
    const updated = await db
      .update(userCredits)
      .set({ balance: sql`${userCredits.balance} - 1`, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(userCredits.userId, userId),
          eq(userCredits.creditType, creditType),
          eq(userCredits.source, source),
          sql`${userCredits.balance} > 0`
        )
      )
      .returning({ userId: userCredits.userId })
    if (updated.length > 0) return { success: true, source }
  }
  return { success: false }
}

/**
 * Refund one credit to the source it was spent from (ADR-0013 P3 refund-on-failure).
 * Used when a paid pipeline (e.g. face VLM) consumed a credit up front but failed to
 * deliver — `+1` on the exact `(user, creditType, source)` row the consume decremented.
 * Safe by construction: at most one refund per reading, so the balance never exceeds
 * the original grant. No-op if the row is missing.
 */
export async function refundCredit(
  db: AppDb,
  userId: string,
  creditType: CreditType,
  source: CreditSource
): Promise<void> {
  await db
    .update(userCredits)
    .set({ balance: sql`${userCredits.balance} + 1`, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(userCredits.userId, userId),
        eq(userCredits.creditType, creditType),
        eq(userCredits.source, source)
      )
    )
}

/**
 * Zero the monthly allowance on subscription EXPIRATION — purchased credits survive.
 * Pass `creditType` to scope the clear to one type (e.g. faceoracle_pro lapse zeroes
 * only `face`); omit it to clear every allowance type (e.g. universe_pro lapse).
 */
export async function clearAllowance(
  db: AppDb,
  userId: string,
  creditType?: CreditType
): Promise<void> {
  const conds = [eq(userCredits.userId, userId), eq(userCredits.source, 'allowance')]
  if (creditType) conds.push(eq(userCredits.creditType, creditType))
  await db
    .update(userCredits)
    .set({ balance: 0, updatedAt: new Date().toISOString() })
    .where(and(...conds))
}
