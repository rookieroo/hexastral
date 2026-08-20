/**
 * Syel reading preferences (local). One-shot flags consumed at enqueue.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const DEEP_NEXT_KEY = 'xingqi_deep_next_reading_v1'

let cachedDeepNext: boolean | undefined

/** Next period refresh uses five-chapter oneshot instead of brief (Pro, after first seal). */
export function peekDeepNextReading(): boolean {
  return cachedDeepNext ?? false
}

export async function getDeepNextReading(): Promise<boolean> {
  if (cachedDeepNext !== undefined) return cachedDeepNext
  try {
    cachedDeepNext = (await AsyncStorage.getItem(DEEP_NEXT_KEY)) === '1'
  } catch {
    cachedDeepNext = false
  }
  return cachedDeepNext
}

export async function setDeepNextReading(on: boolean): Promise<void> {
  cachedDeepNext = on
  try {
    if (on) await AsyncStorage.setItem(DEEP_NEXT_KEY, '1')
    else await AsyncStorage.removeItem(DEEP_NEXT_KEY)
  } catch {
    // ignore
  }
}

/** Read once at job enqueue; clears when true. */
export async function consumeDeepNextReading(): Promise<boolean> {
  const on = await getDeepNextReading()
  if (on) await setDeepNextReading(false)
  return on
}
