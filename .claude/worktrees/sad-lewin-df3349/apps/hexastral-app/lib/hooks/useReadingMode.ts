/**
 * useReadingMode — 阅读模式持久化 hook
 *
 * 'beginner' (default): 展示术语一句话解释 + 词库展开卡片
 * 'expert':             仅展示原文标签，不添加额外解释
 *
 * 存储于 MMKV，同步读取，无 useEffect 异步抖动。
 */

import { useCallback, useSyncExternalStore } from 'react'
import { storage } from '../storage'

const KEY = 'hexastral_reading_mode'
type ReadingMode = 'beginner' | 'expert'

// ─── Minimal pub/sub for sync MMKV + React 18 useSyncExternalStore ──────────

const listeners = new Set<() => void>()
function notify() {
  for (const l of listeners) l()
}

function getRaw(): ReadingMode {
  const v = storage.getString(KEY)
  return v === 'expert' ? 'expert' : 'beginner'
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useReadingMode(): [ReadingMode, (mode: ReadingMode) => void] {
  const mode = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    getRaw,
    getRaw // server snapshot (SSR-safe)
  )

  const setMode = useCallback((next: ReadingMode) => {
    storage.set(KEY, next)
    notify()
  }, [])

  return [mode, setMode]
}
