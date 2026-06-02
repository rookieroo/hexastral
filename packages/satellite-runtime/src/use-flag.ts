/**
 * useFlag — read a server-controlled feature flag from any satellite app.
 *
 * Why this exists (P0-9): the matrix of 8 apps needs a kill-switch primitive
 * that doesn't require an App Store build to disable a broken feature.
 * Flags live in `GUARD_KV` on hexastral-api; this hook caches them locally
 * and returns synchronously with the user's `defaultValue` while the first
 * fetch is in flight.
 *
 * Usage:
 *   ```tsx
 *   const kill = useFlag('feng_llm_kill', false)
 *   if (kill) return <ServiceDownNotice />
 *   ```
 *
 * Behavior:
 *   - First call ever (cold): returns `defaultValue` immediately, kicks off
 *     fetch. When fetch completes, the hook re-renders with the real value.
 *   - Returning user (warm AsyncStorage): returns cached value immediately,
 *     refreshes in background.
 *   - App foreground after >5min stale: refreshes (covers "we flipped a
 *     kill-switch while user had app backgrounded").
 *   - Network failure: keeps using cached value (or default if no cache).
 *     Never blocks UI on a flag read.
 *
 * Storage: AsyncStorage key `@hexastral/flags` — a single JSON blob with all
 * flags. Refresh fetches the full set; per-flag granularity not worth the
 * complexity.
 *
 * Type safety: caller declares the value type via the generic. The hook
 * does not introspect — your default value's shape is the contract.
 *
 * Singleton fetcher: multiple `useFlag` calls in the same render tree share
 * one in-flight fetch via the module-level `flagPromise` cache.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'
import { AppState } from 'react-native'

import { resolvePortfolioApiUrl } from './api-url'

const STORAGE_KEY = '@hexastral/flags'
/** Force refresh if cached snapshot is older than this on app foreground. */
const STALE_AFTER_MS = 5 * 60 * 1000

interface CachedSnapshot {
  flags: Record<string, unknown>
  fetchedAt: string
}

// Module-level cache so all `useFlag` consumers share one fetch + one snapshot.
let memoryCache: CachedSnapshot | null = null
let inflight: Promise<CachedSnapshot> | null = null
const subscribers = new Set<() => void>()

async function loadFromStorage(): Promise<CachedSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CachedSnapshot) : null
  } catch {
    return null
  }
}

async function persistToStorage(snapshot: CachedSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // Ignore storage errors — memory cache still works for this session.
  }
}

async function fetchFlags(): Promise<CachedSnapshot> {
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const res = await fetch(`${resolvePortfolioApiUrl()}/api/flags`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`flags fetch ${res.status}`)
      const json = (await res.json()) as { flags: Record<string, unknown>; fetchedAt: string }
      const snapshot: CachedSnapshot = {
        flags: json.flags,
        fetchedAt: json.fetchedAt,
      }
      memoryCache = snapshot
      // Persist + notify in parallel — don't make subscribers wait on disk.
      void persistToStorage(snapshot)
      subscribers.forEach((cb) => cb())
      return snapshot
    } finally {
      inflight = null
    }
  })()
  return inflight
}

/**
 * Read a flag value. Returns `defaultValue` immediately while warming;
 * re-renders when the server value arrives.
 */
export function useFlag<T>(key: string, defaultValue: T): T {
  const [value, setValue] = useState<T>(() => {
    // Synchronous read from memory cache — covers warm starts within the
    // same JS context. AsyncStorage hydration happens in the effect below.
    const cached = memoryCache?.flags[key]
    return (cached as T) ?? defaultValue
  })

  useEffect(() => {
    let cancelled = false

    function syncFromCache(): void {
      const v = memoryCache?.flags[key]
      if (cancelled) return
      setValue((v as T) ?? defaultValue)
    }

    // Subscribe to flag-snapshot updates so all consumers re-render together.
    subscribers.add(syncFromCache)

    // Cold start: hydrate from AsyncStorage first (sync-ish), then trigger fetch.
    void (async () => {
      if (!memoryCache) {
        const stored = await loadFromStorage()
        if (stored && !cancelled) {
          memoryCache = stored
          syncFromCache()
        }
      }
      // Always kick off a fetch — but don't block UI on it.
      void fetchFlags().catch(() => {
        // Silent: keep using cached value. Server unreachable is a known case.
      })
    })()

    // Re-fetch on app foreground if cache is stale.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return
      const age = memoryCache
        ? Date.now() - new Date(memoryCache.fetchedAt).getTime()
        : Number.POSITIVE_INFINITY
      if (age > STALE_AFTER_MS) void fetchFlags().catch(() => {})
    })

    return () => {
      cancelled = true
      subscribers.delete(syncFromCache)
      appStateSub.remove()
    }
  }, [key, defaultValue])

  return value
}

/**
 * Imperatively force a refresh (e.g. after a known config change).
 * Most callers should just rely on the auto-refresh on foreground.
 */
export async function refreshFlags(): Promise<void> {
  await fetchFlags().catch(() => {})
}

/**
 * Test helper: clear the in-memory snapshot. Used in jest tests to isolate.
 * Not exported from the package index — only via direct module import.
 */
export function __resetFlagsForTest(): void {
  memoryCache = null
  inflight = null
}
