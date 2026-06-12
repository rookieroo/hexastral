/**
 * Async entitlement-access helpers — the DB-backed bridge between the pure capability
 * resolver (`capabilities.ts`) and route gates. Uses PER-CAPABILITY entitlement checks so a
 * `fate_pro` subscriber unlocks the 命 surface but NOT Kindred's pair, etc. (ADR-0013).
 *
 * `capabilities.ts` stays pure (no DB) for unit-testing; this is the thin async layer.
 */

import type { Context } from 'hono'
import type { AppDb, AppEnv } from '../../infra-types'
import { getActiveEntitlements } from '../../services/entitlements'
import { type Capability, hasCapability } from './capabilities'
import { isDevForcedPro } from './dev-pro'

/**
 * Does the user's active entitlement set unlock `capability`? (universe_pro
 * unlocks all.)
 *
 * Pass the request `Context` to opt a gate into the DEV userId-allowlist preview
 * (`DEV_PRO_USER_IDS`) — handy for previewing server-gated Pro surfaces in dev
 * without a real entitlement. Omit `c` and the gate behaves exactly as before
 * (no dev bypass). Prod leaves the allowlist empty, so passing `c` is a no-op
 * there. See ./dev-pro.ts.
 */
export async function userHasCapability(
  db: AppDb,
  userId: string,
  capability: Capability,
  c?: Context<AppEnv>
): Promise<boolean> {
  if (c && isDevForcedPro(c)) return true
  const ents = (await getActiveEntitlements(db, userId)).map((e) => e.key)
  return hasCapability(ents, capability)
}

/**
 * True iff the user holds ANY active subscription — for cross-cutting "paid user" perks
 * (e.g. relaxed rate limits) that aren't tied to a single flagship. All current
 * entitlement keys are subscriptions (episodic apps are credit-ledger-based, no entitlement).
 */
export async function userHasAnySubscription(db: AppDb, userId: string): Promise<boolean> {
  const ents = await getActiveEntitlements(db, userId)
  return ents.length > 0
}
