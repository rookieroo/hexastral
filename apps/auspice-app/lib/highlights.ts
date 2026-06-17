/**
 * 划词 highlight persistence — per-chart, on-device (the Yuun personal read).
 *
 * Mirrors Yuel's lib/highlights.ts, but the solo report has no bondId, so the
 * stable key is the chart hash (the report is per-chart; editing birth changes
 * the hash). The value is the list of highlighted paragraph strings the report
 * matches against to paint the cinnabar wash.
 *
 * Best-effort: a storage failure degrades to "no highlights" rather than
 * throwing into the render path.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const PREFIX = 'auspice_highlights_v1_'

const keyFor = (chartHash: string) => `${PREFIX}${chartHash}`

/** Load the highlighted paragraphs for a chart (empty list if none / on failure). */
export async function loadHighlights(chartHash: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(chartHash))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Persist the highlighted paragraphs for a chart. Best-effort. */
export async function saveHighlights(chartHash: string, quotes: string[]): Promise<void> {
  try {
    if (quotes.length === 0) {
      await AsyncStorage.removeItem(keyFor(chartHash))
    } else {
      await AsyncStorage.setItem(keyFor(chartHash), JSON.stringify(quotes))
    }
  } catch {
    // Best-effort; worst case the highlight is session-local this run.
  }
}
