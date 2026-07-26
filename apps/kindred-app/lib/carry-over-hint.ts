/**
 * One-shot “we brought your 亲友 over from Yuun” home banner.
 * Shown once after the first non-empty bond list load (portfolio carry-over).
 */
import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'kindred_carryover_hint_v1'

export async function getCarryOverHintPending(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY)
    return v !== '1'
  } catch (err) {
    console.warn('[carry-over] read failed', err)
    return false
  }
}

export async function markCarryOverHintSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1')
  } catch (err) {
    console.warn('[carry-over] write failed', err)
  }
}
