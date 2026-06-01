/**
 * Episodic reading access resolver (ADR-0013 P2.3) — the consumption counterpart
 * to the credit ledger. Episodic apps (face/dream/numerology/coincast, and feng's
 * universe allowance) spend one per-use credit per reading; `consumeCredit` draws
 * the universe monthly allowance first, then purchased packs.
 *
 * Consumes up front (matching the Pro-quota gate pattern in `access-check.ts`).
 * Refund-on-pipeline-failure is deferred to P3 verification hardening.
 */

import type { CreditType } from '../../config/products'
import type { AppDb } from '../../infra-types'
import { type CreditSource, consumeCredit } from '../../services/credits'
import { upsellProductFor } from './capabilities'

export type EpisodicAccess =
  | { granted: true; via: CreditSource }
  | { granted: false; reason: 'purchase_required'; upsellProductId: string }

/**
 * Spend one `creditType` credit for a reading. Granted (allowance or purchased)
 * or denied with the product to offer at the paywall.
 */
export async function resolveEpisodicAccess(
  db: AppDb,
  userId: string,
  creditType: CreditType
): Promise<EpisodicAccess> {
  const consumed = await consumeCredit(db, userId, creditType)
  if (consumed.success && consumed.source) {
    return { granted: true, via: consumed.source }
  }
  return {
    granted: false,
    reason: 'purchase_required',
    upsellProductId: upsellProductFor(creditType),
  }
}

/** Free readings per month for low-band episodic apps before a pack credit is required (ADR-0012). */
export const EPISODIC_FREE_READINGS_PER_MONTH = 3

/** `free` within the monthly allowance · `credit` (spend a pack credit) · `paywall` (no free, no credit). */
export type EpisodicQuotaDecision = 'free' | 'credit' | 'paywall'

/**
 * Decide how a low-band episodic reading (dream / numerology) is paid for. Pure —
 * the route supplies this month's reading count + the ledger balance, mirroring
 * the CoinCast quota shape (free N/month, then a consumable credit).
 */
export function decideEpisodicQuota(
  monthCount: number,
  freePerMonth: number,
  creditBalance: number
): EpisodicQuotaDecision {
  if (monthCount < freePerMonth) return 'free'
  if (creditBalance > 0) return 'credit'
  return 'paywall'
}
