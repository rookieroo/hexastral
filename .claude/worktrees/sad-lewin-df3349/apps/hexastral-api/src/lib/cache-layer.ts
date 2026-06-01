/**
 * Edge cache layer — KV-backed read-through cache for absorbing request bursts.
 *
 * Use ONLY at the request edge to deduplicate concurrent reads of identical, deterministic
 * artifacts (e.g. today's already-generated daily signal, a chapter that was just written).
 * NEVER as a canonical store — D1 is always the source of truth; this cache is a
 * disposable, regenerable accelerator.
 *
 * Backed by `GUARD_KV` (the existing rate-limit / guard KV namespace, already provisioned
 * across all environments). Values are stored as JSON; non-string types round-trip cleanly.
 */

import type { CloudflareBindings } from '../infra-types'

interface CacheEnv {
  GUARD_KV: CloudflareBindings['GUARD_KV']
}

/**
 * Read-through edge cache. Returns the cached value if present, otherwise calls
 * `loader`, persists the result with TTL, and returns it.
 *
 * - `key` should be globally unique and include all parameters that affect output
 *   (e.g. `signal:${userId}:${date}:${locale}`).
 * - `ttlSec` must be ≥ 60 (KV minimum); pick a conservative value because writes
 *   below the minimum throw at the platform layer.
 * - On cache miss errors (KV transient failure), the loader still runs and the
 *   error is swallowed so the request succeeds. Cache write failures are similarly
 *   non-fatal.
 */
export async function withEdgeCache<T>(
  env: CacheEnv,
  key: string,
  ttlSec: number,
  loader: () => Promise<T>
): Promise<T> {
  if (ttlSec < 60) {
    throw new Error(`withEdgeCache: ttlSec must be >= 60 (KV minimum), got ${ttlSec}`)
  }

  // Read attempt — non-fatal on transient KV failure.
  try {
    const cached = await env.GUARD_KV.get(key, 'json')
    if (cached !== null) return cached as T
  } catch (err) {
    console.warn('[edge-cache] read failed', key, err)
  }

  const value = await loader()

  // Write attempt — non-fatal; the loader already produced the value the caller needs.
  try {
    await env.GUARD_KV.put(key, JSON.stringify(value), { expirationTtl: ttlSec })
  } catch (err) {
    console.warn('[edge-cache] write failed', key, err)
  }

  return value
}

/**
 * Explicit invalidation — call after writing a new versioned row so the next read
 * doesn't serve a stale cache entry.
 */
export async function invalidateEdgeCache(env: CacheEnv, key: string): Promise<void> {
  try {
    await env.GUARD_KV.delete(key)
  } catch (err) {
    console.warn('[edge-cache] delete failed', key, err)
  }
}
