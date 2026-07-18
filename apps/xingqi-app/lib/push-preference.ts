/**
 * Daily / event reminder preference (local flag).
 * Actual Pro event windows use lib/push-schedule.ts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'xingqi_daily_push_v1'

export async function getDailyPushEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY)
    return v === '1'
  } catch {
    return false
  }
}

export async function setDailyPushEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, enabled ? '1' : '0')
  } catch {
    // best-effort
  }
}
