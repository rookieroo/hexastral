/**
 * Report highlight persistence (划重点).
 *
 * Sentence-scoped highlights saved per report id, mirroring Yuel's per-chartHash
 * model. Device-local (AsyncStorage) — highlights are a private reading aid, not
 * synced content, and the key carries no personal identifier.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY_PREFIX = 'feng_highlights_v1:'

export async function loadHighlights(reportId: string): Promise<string[]> {
  if (!reportId) return []
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + reportId)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export async function saveHighlights(reportId: string, highlights: string[]): Promise<void> {
  if (!reportId) return
  try {
    await AsyncStorage.setItem(KEY_PREFIX + reportId, JSON.stringify(highlights))
  } catch {
    // Best-effort; highlights are a non-critical reading aid.
  }
}
