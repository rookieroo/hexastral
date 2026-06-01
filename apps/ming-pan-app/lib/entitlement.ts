/**
 * Local entitlement state for fate-app.
 *
 * Pre-IAP placeholder — flips between 'free' and 'paid' via the dev panel in
 * the Me tab. When real subscription lands (RevenueCat / similar), swap this
 * reader to consult the SDK while keeping the same `useEntitlement()` shape.
 *
 *   const ent = useEntitlement()
 *   if (ent === 'paid') { ... }
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'

import { PORTFOLIO_STORAGE_PREFIX } from './growth-config'

export type Entitlement = 'free' | 'paid'

function key(): string {
  return `${PORTFOLIO_STORAGE_PREFIX}:entitlement_v1`
}

export async function getEntitlement(): Promise<Entitlement> {
  try {
    const raw = await AsyncStorage.getItem(key())
    return raw === 'paid' ? 'paid' : 'free'
  } catch {
    return 'free'
  }
}

export async function setEntitlement(value: Entitlement): Promise<void> {
  await AsyncStorage.setItem(key(), value)
}

export async function clearEntitlement(): Promise<void> {
  await AsyncStorage.removeItem(key())
}

/** Refreshes on screen focus so dev-tool toggles propagate without remount. */
export function useEntitlement(): {
  entitlement: Entitlement
  loading: boolean
  refresh: () => Promise<void>
} {
  const [entitlement, setState] = useState<Entitlement>('free')
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setState(await getEntitlement())
    setLoading(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      void refresh()
    }, [refresh])
  )

  return { entitlement, loading, refresh }
}
