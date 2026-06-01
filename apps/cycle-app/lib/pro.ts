/**
 * Non-hook entitlement read for contexts that can't call React hooks
 * (push scheduling, headless tasks). Components should continue to use
 * `useEntitlements` from satellite-runtime — this is the escape hatch.
 *
 * Returns true when either `cycle_pro` or `universe_pro` is active on the
 * RevenueCat customer record. Returns false when the SDK isn't configured
 * (Expo Go, web preview, missing key) — UI gates default to free, which
 * is the safe behavior.
 */

import Purchases from 'react-native-purchases'

export async function getCycleProActive(): Promise<boolean> {
  try {
    const info = await Purchases.getCustomerInfo()
    const active = info.entitlements.active
    return active.cycle_pro?.isActive === true || active.universe_pro?.isActive === true
  } catch {
    return false
  }
}
