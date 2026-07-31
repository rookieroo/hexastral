/**
 * Push preference (Yuel / Kindred) — one boolean for all Yuel notifications.
 *
 * Opt-in registers the Expo push token via lib/serverPush.ts. What / when to
 * send is decided server-side: harvest → `kindred_push_queue` (D1) → cron.
 * Default send slot is daytime local (~10:00); timeline node teasers use ~09:00.
 * This is NOT Yuun's personal 命书 almanac push.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'kindred_daily_push_v1'

export async function getDailyPushEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY)
    return v === '1'
  } catch {
    return false
  }
}

export async function setDailyPushEnabled(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, on ? '1' : '0')
  } catch {
    // Preference is best-effort; cron still requires a registered token.
  }
}
