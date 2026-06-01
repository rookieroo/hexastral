/**
 * SatelliteSessionGate — session-count-based engagement gating.
 *
 * Tracks how many times the user has opened the app and only renders
 * children after N sessions. Useful for delaying engagement prompts
 * (upsells, surveys, question pickers) until the user has developed
 * stickiness, avoiding the "just downloaded and already getting pushed"
 * anti-pattern.
 *
 * Session counting:
 *   - Increments on first mount per JS session (app open / cold start).
 *   - Persisted to AsyncStorage under a per-app key.
 *   - Does NOT count foreground resumes (only cold starts via mount).
 *
 * Usage:
 *   <SatelliteSessionGate storageKey="fate_sessions" threshold={3}>
 *     <FlagshipUpsell />
 *   </SatelliteSessionGate>
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'

export interface SatelliteSessionGateProps {
  /** AsyncStorage key for this app's session counter. */
  storageKey: string
  /** Minimum number of sessions before children render. Default 3. */
  threshold?: number
  /** Children to render once threshold is met. */
  children: React.ReactNode
  /** Optional fallback to render while loading or before threshold. */
  fallback?: React.ReactNode
}

// Module-level flag ensures we only increment once per JS session,
// even if the component remounts (e.g. tab switching).
const incrementedThisSession = new Set<string>()

export function SatelliteSessionGate({
  storageKey,
  threshold = 3,
  children,
  fallback = null,
}: SatelliteSessionGateProps) {
  const [sessionCount, setSessionCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        const raw = await AsyncStorage.getItem(storageKey)
        let count = raw ? Number.parseInt(raw, 10) : 0
        if (Number.isNaN(count)) count = 0

        // Increment once per cold start
        if (!incrementedThisSession.has(storageKey)) {
          count += 1
          incrementedThisSession.add(storageKey)
          await AsyncStorage.setItem(storageKey, String(count))
        }

        if (!cancelled) setSessionCount(count)
      } catch {
        // AsyncStorage unavailable — fail open (don't show gated content)
        if (!cancelled) setSessionCount(0)
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [storageKey])

  // Still loading
  if (sessionCount === null) return fallback

  // Below threshold — don't show
  if (sessionCount < threshold) return fallback

  return <>{children}</>
}

/**
 * Hook variant — for cases where you need the session count
 * in logic rather than conditional rendering.
 *
 * Returns { count, ready, meetsThreshold }.
 */
export function useSessionCount(storageKey: string, threshold = 3) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        const raw = await AsyncStorage.getItem(storageKey)
        let c = raw ? Number.parseInt(raw, 10) : 0
        if (Number.isNaN(c)) c = 0

        if (!incrementedThisSession.has(storageKey)) {
          c += 1
          incrementedThisSession.add(storageKey)
          await AsyncStorage.setItem(storageKey, String(c))
        }

        if (!cancelled) setCount(c)
      } catch {
        if (!cancelled) setCount(0)
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [storageKey])

  return {
    count,
    ready: count !== null,
    meetsThreshold: count !== null && count >= threshold,
  }
}
