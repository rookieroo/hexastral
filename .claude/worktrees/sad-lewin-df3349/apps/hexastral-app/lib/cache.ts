/**
 * 离线缓存工具
 *
 * 基于 MMKV 的同步 API 响应缓存，
 * 支持 TTL 过期和容量限制。
 * 用于历史记录和详情页的离线访问。
 */

import { storage } from './storage'

const CACHE_PREFIX = 'hexastral_cache:'
const MAX_ENTRIES = 50

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

/**
 * 读取缓存，未命中或过期返回 null
 */
export function getCached<T>(key: string): T | null {
  try {
    const raw = storage.getString(CACHE_PREFIX + key)
    if (!raw) return null

    const entry = JSON.parse(raw) as CacheEntry<T>
    if (Date.now() - entry.timestamp > entry.ttl) {
      storage.remove(CACHE_PREFIX + key)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

/**
 * 写入缓存
 * @param ttl 过期时间（毫秒），默认 24 小时
 */
export function setCache<T>(key: string, data: T, ttl = 24 * 60 * 60 * 1000): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl }
    storage.set(CACHE_PREFIX + key, JSON.stringify(entry))
    pruneCache()
  } catch {
    // 缓存写入失败不影响主流程
  }
}

/**
 * 清空所有缓存
 */
export function clearCache(): void {
  try {
    const keys = storage.getAllKeys()
    for (const key of keys) {
      if (key.startsWith(CACHE_PREFIX)) storage.remove(key)
    }
  } catch {
    // ignore
  }
}

/**
 * 删除过期条目，并在超过 MAX_ENTRIES 时移除最旧的
 */
function pruneCache(): void {
  try {
    const keys = storage.getAllKeys().filter((k: string) => k.startsWith(CACHE_PREFIX))
    if (keys.length <= MAX_ENTRIES) return

    const entries: { key: string; timestamp: number; expired: boolean }[] = []
    for (const key of keys) {
      const raw = storage.getString(key)
      if (!raw) continue
      try {
        const parsed = JSON.parse(raw) as CacheEntry<unknown>
        entries.push({
          key,
          timestamp: parsed.timestamp,
          expired: Date.now() - parsed.timestamp > parsed.ttl,
        })
      } catch {
        entries.push({ key, timestamp: 0, expired: true })
      }
    }

    for (const e of entries.filter((e) => e.expired)) storage.remove(e.key)

    const remaining = entries.filter((e) => !e.expired).sort((a, b) => a.timestamp - b.timestamp)
    if (remaining.length > MAX_ENTRIES) {
      for (const e of remaining.slice(0, remaining.length - MAX_ENTRIES)) storage.remove(e.key)
    }
  } catch {
    // ignore
  }
}

/**
 * 缓存优先请求 — 先返回缓存，再异步刷新
 * @param key 缓存键
 * @param fetcher 实际请求函数
 * @param ttl 过期时间
 */
export async function cacheFirst<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 24 * 60 * 60 * 1000
): Promise<T> {
  const cached = getCached<T>(key)
  if (cached !== null) {
    fetcher()
      .then((data) => setCache(key, data, ttl))
      .catch((err) => {
        if (__DEV__) console.warn('[Cache] Background refresh failed:', err)
      })
    return cached
  }

  const data = await fetcher()
  setCache(key, data, ttl)
  return data
}
