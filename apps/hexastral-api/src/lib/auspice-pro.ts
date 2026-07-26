/**
 * Auspice (Yuun) Pro resolution — server-authoritative.
 * Portfolio `u` + D1 entitlements / RevenueCat. No client `isPro` flag.
 */

import type { AppDb } from '../infra-types'
import { hasActiveEntitlement } from '../services/entitlements'
import { parseRcActiveEntitlements } from '../services/revenuecat'

export type AuspiceProEnv = {
  REVENUECAT_API_KEY?: string
  ALLOW_DEV_PRO?: string
}

/** Live RevenueCat check — auspice_pro or universe_pro active for this RC app-user-id. */
export async function isAuspiceProViaRc(apiKey: string, appUserId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    )
    if (!res.ok) return false
    const active = parseRcActiveEntitlements(await res.json(), new Date().toISOString())
    return active.some((e) => e.key === 'auspice_pro' || e.key === 'universe_pro')
  } catch {
    return false
  }
}

/**
 * Fail-closed Pro gate for LLM / push / birthday cap.
 * Requires portfolio `appUserId` (`u`); without it always false.
 */
export async function resolveAuspiceIsPro(
  db: AppDb | undefined,
  env: AuspiceProEnv,
  appUserId?: string | null
): Promise<boolean> {
  if (!appUserId) return false
  if (db) {
    if (await hasActiveEntitlement(db, appUserId, 'auspice_pro')) return true
    if (await hasActiveEntitlement(db, appUserId, 'universe_pro')) return true
  }
  if (env.REVENUECAT_API_KEY) return isAuspiceProViaRc(env.REVENUECAT_API_KEY, appUserId)
  return false
}

/** `__DEV__` client may send `dev: true`; only honor when ALLOW_DEV_PRO=1. */
export function allowAuspiceDevGuardBypass(
  env: { ALLOW_DEV_PRO?: string },
  bodyDev: boolean
): boolean {
  return bodyDev === true && env.ALLOW_DEV_PRO === '1'
}
