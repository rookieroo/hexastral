/**
 * Non-hook entitlement read for contexts that can't call React hooks
 * (push scheduling, headless tasks). Components should continue to use
 * `useEntitlements` from satellite-runtime — this is the escape hatch.
 *
 * Returns true when either `auspice_pro` or `universe_pro` is active on the
 * RevenueCat customer record. Returns false when the SDK isn't configured
 * (Expo Go, web preview, missing key) — UI gates default to free, which
 * is the safe behavior.
 */

import { getDevEntitlementOverride } from '@zhop/satellite-runtime'
import Purchases from 'react-native-purchases'

export async function getAuspiceProActive(): Promise<boolean> {
  // DEV override (set from the Me-tab debug toggle) wins so push/headless paths
  // match the in-app gating. No-op in production (override stays null).
  const override = getDevEntitlementOverride()
  if (override) return override === 'pro'
  try {
    const info = await Purchases.getCustomerInfo()
    const active = info.entitlements.active
    return active.auspice_pro?.isActive === true || active.universe_pro?.isActive === true
  } catch {
    return false
  }
}
