/**
 * 划词 highlight persistence — per reading, on-device.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const PREFIX = 'xingqi_highlights_v1_'

const keyFor = (readingId: string) => `${PREFIX}${readingId}`

export async function loadHighlights(readingId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(readingId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export async function saveHighlights(readingId: string, quotes: string[]): Promise<void> {
  try {
    if (quotes.length === 0) {
      await AsyncStorage.removeItem(keyFor(readingId))
    } else {
      await AsyncStorage.setItem(keyFor(readingId), JSON.stringify(quotes))
    }
  } catch {
    // Best-effort
  }
}
