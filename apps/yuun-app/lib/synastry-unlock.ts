/**
 * Per-relationship one-time unlock ledger (synastry-in-auspice S3).
 *
 * Auspice 亲友 are device-local + anonymous, so a one-time 合盘 unlock is tracked
 * on-device: the set of unlocked 亲友 ids in AsyncStorage. (A subscriber gets all
 * relationships regardless — this ledger only matters for the one-time buyout
 * path.) Notifications are NOT gated by this ledger — they stay subscription-only.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'auspice.synastry.unlocked.v1'

async function readSet(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    const arr = raw ? (JSON.parse(raw) as unknown) : []
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

export async function isRelationshipUnlocked(id: string): Promise<boolean> {
  return (await readSet()).has(id)
}

export async function markRelationshipUnlocked(id: string): Promise<void> {
  try {
    const set = await readSet()
    set.add(id)
    await AsyncStorage.setItem(KEY, JSON.stringify([...set]))
  } catch {
    // Best-effort — a failed write just means the user is re-prompted to unlock.
  }
}
