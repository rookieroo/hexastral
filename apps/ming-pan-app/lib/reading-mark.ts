/**
 * Tracks whether the user has viewed the /reading screen at least once.
 *
 * Used by the Me-tab birth-edit guard: editing birth invalidates any
 * generated reading, so free users with a viewed reading are locked out
 * (paid users get a warning + override).
 *
 * Mark set on /reading mount (per user direction). Cleared by dev panel.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'

import { PORTFOLIO_STORAGE_PREFIX } from './growth-config'

function key(): string {
  return `${PORTFOLIO_STORAGE_PREFIX}:reading_viewed_at_v1`
}

/** Returns ISO timestamp string (when first viewed) or null. */
export async function getReadingMark(): Promise<string | null> {
  try {
    return (await AsyncStorage.getItem(key())) || null
  } catch {
    return null
  }
}

export async function markReadingViewed(): Promise<void> {
  // Idempotent — only set if not already present (keep first-view timestamp)
  const existing = await getReadingMark()
  if (existing) return
  await AsyncStorage.setItem(key(), new Date().toISOString())
}

export async function clearReadingMark(): Promise<void> {
  await AsyncStorage.removeItem(key())
}

/** Refreshes on focus so dev-tool clears reflect immediately. */
export function useReadingMark(): {
  viewedAt: string | null
  loading: boolean
  refresh: () => Promise<void>
} {
  const [viewedAt, setState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setState(await getReadingMark())
    setLoading(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      void refresh()
    }, [refresh])
  )

  return { viewedAt, loading, refresh }
}
