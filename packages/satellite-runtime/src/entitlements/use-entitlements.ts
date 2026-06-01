/**
 * useEntitlements — read the user's active Pro entitlements across flagships.
 *
 * Source of truth: RevenueCat (`Purchases.getCustomerInfo()`). When the SDK
 * isn't initialized (Expo Go, web, configure() skipped due to missing key)
 * all entitlements default to inactive — UI should treat that as the free
 * tier. For cross-app sync after sign-in, call `Purchases.logIn(userId)`
 * before mounting the consumer screen so RC swaps the anonymous → identified
 * customer record and re-fires the listener.
 */

import { useEffect, useRef, useState } from 'react'
import Purchases, { type CustomerInfo } from 'react-native-purchases'

// Mirrors the server catalog (apps/hexastral-api/src/config/products.ts). feng/face are
// per-use only (no standalone sub — plan §8); the verticals are fate/yuan/cycle, all
// also granted by the universe_pro bundle.
export type EntitlementKey = 'yuan_pro' | 'cycle_pro' | 'fate_pro' | 'universe_pro'

export interface EntitlementSnapshot {
  active: boolean
  expiresAt: string | null
  productIdentifier: string | null
}

export type EntitlementsState = Record<EntitlementKey, EntitlementSnapshot>

const INITIAL_SNAPSHOT: EntitlementSnapshot = {
  active: false,
  expiresAt: null,
  productIdentifier: null,
}

const ENTITLEMENT_KEYS: readonly EntitlementKey[] = [
  'yuan_pro',
  'cycle_pro',
  'fate_pro',
  'universe_pro',
] as const

const INITIAL_STATE: EntitlementsState = {
  yuan_pro: INITIAL_SNAPSHOT,
  cycle_pro: INITIAL_SNAPSHOT,
  fate_pro: INITIAL_SNAPSHOT,
  universe_pro: INITIAL_SNAPSHOT,
}

function snapshotFromCustomerInfo(info: CustomerInfo): EntitlementsState {
  const next: EntitlementsState = { ...INITIAL_STATE }
  for (const key of ENTITLEMENT_KEYS) {
    const ent = info.entitlements.active[key]
    if (ent) {
      next[key] = {
        active: true,
        expiresAt: ent.expirationDate ?? null,
        productIdentifier: ent.productIdentifier ?? null,
      }
    }
  }

  // Defensive: universe_pro should already attach to all vertical entitlements
  // server-side (see docs/setup/revenuecat-entitlements.md §4.3), but mirror
  // that locally so a future RC config slip doesn't gate vertical features.
  if (next.universe_pro.active) {
    for (const key of ['yuan_pro', 'cycle_pro', 'fate_pro'] as const) {
      if (!next[key].active) {
        next[key] = {
          active: true,
          expiresAt: next.universe_pro.expiresAt,
          productIdentifier: next.universe_pro.productIdentifier,
        }
      }
    }
  }

  return next
}

export function useEntitlements(): EntitlementsState {
  const [state, setState] = useState<EntitlementsState>(INITIAL_STATE)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    let listenerRemover: (() => void) | null = null

    async function load() {
      try {
        const info = await Purchases.getCustomerInfo()
        if (mounted.current) setState(snapshotFromCustomerInfo(info))
      } catch {
        // SDK not configured (Expo Go, missing key) — leave INITIAL_STATE.
      }
    }

    void load()

    try {
      Purchases.addCustomerInfoUpdateListener((info) => {
        if (mounted.current) setState(snapshotFromCustomerInfo(info))
      })
      // react-native-purchases v8+ doesn't return a subscription handle; the
      // emitter is process-global. We snapshot a no-op remover here and rely
      // on the `mounted` ref to ignore late callbacks after unmount.
      listenerRemover = () => {
        /* no-op — see comment above */
      }
    } catch {
      // SDK not configured — no listener to register.
    }

    return () => {
      mounted.current = false
      listenerRemover?.()
    }
  }, [])

  return state
}

export function hasAnyProEntitlement(state: EntitlementsState): boolean {
  return ENTITLEMENT_KEYS.some((k) => state[k].active)
}

export function hasEntitlement(state: EntitlementsState, key: EntitlementKey): boolean {
  return state[key].active
}
