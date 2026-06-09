/**
 * Reading primer — "seen once" flag.
 *
 * The first time a user opens a synastry report, a one-shot ReadingPrimer
 * overlay teaches the report's vocabulary (甲/乙 roles, the ink 意象, the 划词
 * long-press). After they dismiss it we never auto-show it again — the full
 * legend stays reachable from the list footer + Settings → Symbol Glossary.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'kindred_reading_primer_v1'

export async function hasSeenReadingPrimer(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1'
  } catch {
    // On a storage read failure, treat as seen — better to skip the primer than
    // to nag on every open.
    return true
  }
}

export async function markReadingPrimerSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1')
  } catch {
    // Best-effort; worst case the primer shows once more next launch.
  }
}
