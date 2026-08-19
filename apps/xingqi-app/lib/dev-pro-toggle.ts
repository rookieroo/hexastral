/**
 * DEV-only: cycle client entitlement override + optional server grant.
 */

import {
  type DevEntitlementOverride,
  getDevEntitlementOverride,
  setDevEntitlementOverride,
} from '@zhop/satellite-runtime'
import { Alert } from 'react-native'

import { devSetServerPro } from '@/lib/dev-tools'

export function devEntitlementLabel(override: DevEntitlementOverride): string {
  if (override === 'pro') return 'PRO'
  if (override === 'free') return 'FREE'
  return 'Off'
}

export async function cycleDevEntitlementOverride(): Promise<DevEntitlementOverride> {
  const current = getDevEntitlementOverride()
  const next: DevEntitlementOverride = current === null ? 'pro' : current === 'pro' ? 'free' : null
  setDevEntitlementOverride(next)
  if (next === 'pro') {
    const ok = await devSetServerPro(true)
    if (!ok) {
      Alert.alert('DEV Pro', 'Server grant failed — sign in first.')
    }
  } else if (next === 'free') {
    void devSetServerPro(false)
  }
  return next
}
