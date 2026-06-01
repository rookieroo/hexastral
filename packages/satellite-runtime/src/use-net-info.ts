/**
 * NetInfo wrapper · offline awareness for retries + UI banners.
 *
 * Why this exists (P1-17): when the device is offline, hitting fetch with
 * exponential-backoff retry is just noise — we'd burn the user's battery
 * on guaranteed failures. NetInfo lets us short-circuit retries when we
 * already know we're offline.
 *
 * Two surfaces:
 *   - `useNetInfo()` — React hook returning `{ isOnline, type, isCellular }`,
 *     suitable for "Offline · tap to retry" UI banners
 *   - `getCurrentNetInfo()` — async function for use in non-React contexts
 *     (e.g. inside a fetch retry helper)
 *
 * Graceful no-op: if `@react-native-community/netinfo` is not installed,
 * both surfaces default to `isOnline: true`. This matches the conservative
 * assumption "if we can't tell, try the request" — slightly worse than
 * having NetInfo, no worse than not having this wrapper at all.
 */

import { useEffect, useState } from 'react'

interface NetInfoState {
  isOnline: boolean
  type: string
  isCellular: boolean
}

interface NetInfoLike {
  fetch: () => Promise<{
    isConnected: boolean | null
    isInternetReachable: boolean | null
    type: string
    details: { isConnectionExpensive?: boolean } | null
  }>
  addEventListener: (
    listener: (state: {
      isConnected: boolean | null
      isInternetReachable: boolean | null
      type: string
      details: { isConnectionExpensive?: boolean } | null
    }) => void
  ) => () => void
}

function loadNetInfo(): NetInfoLike | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod: unknown = require('@react-native-community/netinfo')
    if (!mod || typeof mod !== 'object') return null
    // The default export is the API. Some setups put it on `.default`.
    const m = mod as { default?: NetInfoLike } & Partial<NetInfoLike>
    const candidate = m.default ?? (m as NetInfoLike)
    if (typeof candidate.fetch !== 'function' || typeof candidate.addEventListener !== 'function') {
      return null
    }
    return candidate
  } catch {
    return null
  }
}

const netInfo = loadNetInfo()

function normalizeState(raw: {
  isConnected: boolean | null
  isInternetReachable: boolean | null
  type: string
  details: { isConnectionExpensive?: boolean } | null
}): NetInfoState {
  // Treat null as true — "unknown" means "assume online" (conservative).
  const isOnline = (raw.isConnected ?? true) && (raw.isInternetReachable ?? true)
  return {
    isOnline,
    type: raw.type,
    // Cellular detection varies by platform — fall back to type heuristic.
    isCellular: raw.type === 'cellular',
  }
}

/**
 * One-shot read — use this from non-React contexts (e.g. inside a retry
 * helper before each attempt). Returns `isOnline: true` if NetInfo isn't
 * available (conservative: try the request, let fetch be the source of truth).
 */
export async function getCurrentNetInfo(): Promise<NetInfoState> {
  if (!netInfo) return { isOnline: true, type: 'unknown', isCellular: false }
  try {
    const raw = await netInfo.fetch()
    return normalizeState(raw)
  } catch {
    return { isOnline: true, type: 'unknown', isCellular: false }
  }
}

/**
 * Subscribe to connection changes — returns the current state. Re-renders
 * on every change. Use for "Offline · tap to retry" UI affordances.
 */
export function useNetInfo(): NetInfoState {
  const [state, setState] = useState<NetInfoState>({
    isOnline: true,
    type: 'unknown',
    isCellular: false,
  })

  useEffect(() => {
    if (!netInfo) return
    let cancelled = false

    // Initial fetch — covers the case where we mount mid-session.
    void netInfo.fetch().then((raw) => {
      if (cancelled) return
      setState(normalizeState(raw))
    })

    // Live updates — NetInfo's listener fires on every change.
    const unsubscribe = netInfo.addEventListener((raw) => {
      if (cancelled) return
      setState(normalizeState(raw))
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return state
}
