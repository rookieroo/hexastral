/**
 * Scheduled RevenueCat reconciliation sweep (ADR-0013 §5b).
 *
 * The on-launch reconcile (`POST /api/user/:id/entitlements/reconcile`) self-heals
 * ACTIVE users who open the app. This sweep catches users who DON'T open the app but
 * whose subscription state drifted — specifically a MISSED RENEWAL: the local row's
 * `expiresAt` has just passed (so `getActiveEntitlements` treats them as blocked) while
 * RC actually renewed. We reconcile the recently-lapsed window so they're re-granted
 * before they notice. (Genuinely-expired users reconcile to a harmless no-op.)
 *
 * Bounded per run — RC REST is rate-limited + metered; no-ops entirely without
 * `REVENUECAT_API_KEY`. Wired into the daily 04:00 UTC scheduled handler in index.ts.
 */

import { and, gte, lte } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../db/schema'
import { userEntitlements } from '../db/schema'
import type { CloudflareBindings } from '../infra-types'
import { reconcileEntitlements } from '../services/revenuecat'

/** Reconcile entitlements that lapsed within this window — the missed-renewal catch. */
const LAPSED_WINDOW_MS = 3 * 24 * 60 * 60 * 1000
/** Cap per run — bounds the number of RC REST calls a single cron tick makes. */
const MAX_USERS_PER_RUN = 100

export interface ReconcileSweepResult {
  skipped?: 'no_api_key'
  checked: number
  granted: number
  expired: number
}

export async function runReconcileSweep(env: CloudflareBindings): Promise<ReconcileSweepResult> {
  if (!env.REVENUECAT_API_KEY) {
    return { skipped: 'no_api_key', checked: 0, granted: 0, expired: 0 }
  }

  const db = drizzle(env.DB, { schema })
  const now = Date.now()
  const windowStart = new Date(now - LAPSED_WINDOW_MS).toISOString()
  const nowIso = new Date(now).toISOString()

  // Distinct users whose entitlement lapsed in the window (uses user_entitlements_expires_idx).
  const rows = await db
    .selectDistinct({ userId: userEntitlements.userId })
    .from(userEntitlements)
    .where(
      and(gte(userEntitlements.expiresAt, windowStart), lte(userEntitlements.expiresAt, nowIso))
    )
    .limit(MAX_USERS_PER_RUN)
    .all()

  let granted = 0
  let expired = 0
  for (const { userId } of rows) {
    const r = await reconcileEntitlements(db, env, userId)
    if (r.reconciled) {
      granted += r.granted.length
      expired += r.expired.length
    }
  }
  return { checked: rows.length, granted, expired }
}
