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
import { setDeepNextReading } from '@/lib/reading-preference'

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
    // Deep-next is opt-in; never inherit an old ON when flipping DEV Pro.
    await setDeepNextReading(false)
    const result = await devSetServerPro(true)
    if (!result.ok) {
      if (result.reason === 'no_session' || result.reason === 'hmac') {
        Alert.alert(
          'DEV Pro',
          'HMAC session incomplete — sign in again with Apple or Google (Yuun-style). Client override is on; server still treats you as free until the session signs.'
        )
      } else if (result.reason === 'blocked') {
        Alert.alert(
          'DEV Pro',
          'Client override is on. Production API blocks /api/dev (404). Deploy API with the set-subscription exemption, or point EXPO_PUBLIC_API_URL at a non-prod worker, for the server to see Pro.'
        )
      } else {
        Alert.alert(
          'DEV Pro',
          'Server grant failed (HTTP). Client override is on; readings may still 402 until the API grants faceoracle_pro / universe_pro.'
        )
      }
    }
  } else if (next === 'free') {
    void devSetServerPro(false)
  }
  return next
}
