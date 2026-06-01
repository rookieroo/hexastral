/**
 * R2 cache primitives — content-addressed PNG storage with soft TTL.
 *
 * Extracted from `services/svc-feng/src/lib/cache.ts` so face-oracle and any
 * future vision pipeline can reuse the same caching pattern (canonical JSON
 * → SHA-1 → R2 key with `writtenAt` / `expiresAt` metadata).
 *
 * Cache strategy:
 *   - Key = SHA-1 hex of canonicalized JSON payload.
 *   - Same input always hashes to the same key (no cache stampede).
 *   - 30-day soft TTL via metadata, enforced on read; expired entries return
 *     null but are NOT auto-deleted (a separate cron sweeps them).
 *   - PNG bytes stored directly; no compression layer.
 */

const DEFAULT_TTL_SECONDS = 30 * 24 * 60 * 60 // 30 days

export interface CacheEntry {
  bytes: ArrayBuffer
  contentType: string
  writtenAt: number
  expiresAt: number
}

/**
 * Stable-stringify any payload — keys sorted recursively so logically equal
 * objects always produce identical strings (and identical SHA-1 hashes).
 */
export function canonicalize(payload: unknown): string {
  return JSON.stringify(payload, (_key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {}
      for (const k of Object.keys(value as Record<string, unknown>).sort()) {
        sorted[k] = (value as Record<string, unknown>)[k]
      }
      return sorted
    }
    return value
  })
}

export async function cacheKey(prefix: string, payload: unknown): Promise<string> {
  const data = new TextEncoder().encode(canonicalize(payload))
  const hash = await crypto.subtle.digest('SHA-1', data)
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `${prefix}/${hex}.png`
}

export async function readCache(bucket: R2Bucket, key: string): Promise<CacheEntry | null> {
  const obj = await bucket.get(key)
  if (!obj) return null

  const writtenAt = Number(obj.customMetadata?.writtenAt ?? 0)
  const expiresAt = Number(obj.customMetadata?.expiresAt ?? 0)

  if (expiresAt > 0 && expiresAt < Math.floor(Date.now() / 1000)) {
    return null
  }

  return {
    bytes: await obj.arrayBuffer(),
    contentType: obj.httpMetadata?.contentType ?? 'image/png',
    writtenAt,
    expiresAt,
  }
}

export async function writeCache(
  bucket: R2Bucket,
  key: string,
  bytes: ArrayBuffer,
  contentType = 'image/png',
  ttlSeconds = DEFAULT_TTL_SECONDS
): Promise<CacheEntry> {
  const writtenAt = Math.floor(Date.now() / 1000)
  const expiresAt = writtenAt + ttlSeconds
  await bucket.put(key, bytes, {
    httpMetadata: { contentType },
    customMetadata: {
      writtenAt: String(writtenAt),
      expiresAt: String(expiresAt),
    },
  })
  return { bytes, contentType, writtenAt, expiresAt }
}

/**
 * Fetch an R2 object as a base64 string — convenient for handing off to
 * Gemini Vision's inlineData parts.
 */
export async function fetchR2AsBase64(bucket: R2Bucket, key: string): Promise<string> {
  const obj = await bucket.get(key)
  if (!obj) throw new Error(`image not found in R2: ${key}`)
  const buf = await obj.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}
