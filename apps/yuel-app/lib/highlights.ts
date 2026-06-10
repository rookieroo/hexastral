/**
 * 划词 highlight persistence — per-bond, on-device.
 *
 * The report's cinnabar highlights (long-press a sentence → highlight) used to
 * be session-local: they vanished on navigation away. This persists them per
 * bond in AsyncStorage so a highlighted passage is still marked when the reader
 * comes back. Keyed by bond id; the value is the list of highlighted sentence
 * strings (the same strings ChapterCard matches against to paint the wash).
 *
 * Same best-effort posture as lib/primer-seen.ts — a storage failure degrades to
 * "no highlights" rather than throwing into the render path.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const PREFIX = 'kindred_highlights_v1_'

const keyFor = (bondId: string) => `${PREFIX}${bondId}`

/** Load the highlighted sentences for a bond (empty list if none / on failure). */
export async function loadHighlights(bondId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(bondId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Persist the highlighted sentences for a bond. Best-effort. */
export async function saveHighlights(bondId: string, quotes: string[]): Promise<void> {
  try {
    if (quotes.length === 0) {
      await AsyncStorage.removeItem(keyFor(bondId))
    } else {
      await AsyncStorage.setItem(keyFor(bondId), JSON.stringify(quotes))
    }
  } catch {
    // Best-effort; worst case the highlight is session-local this run.
  }
}
