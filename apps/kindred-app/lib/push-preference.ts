/**
 * Daily relationship push preference (Yuel / Kindred).
 *
 * Stores ONE boolean: whether the user wants the **relationship / synastry**
 * evening nudge (~19:00 local) from the kindred-push cron. This is NOT a
 * personal 命书 morning almanac (that lives in Yuun). Opt-in registers the
 * Expo push token via lib/serverPush.ts; without a token the cron skips them.
 *
 * Relationship-TIMELINE reminders stay on-device (lib/timeline-push.ts).
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'kindred_daily_push_v1'

export async function getDailyPushEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY)
    // Default OFF — we don't push notifications at someone before they've
    // explicitly opted in (App Store guidelines + good behaviour).
    return v === '1'
  } catch (err) {
    console.warn('[push-preference] read failed', err)
    return false
  }
}

export async function setDailyPushEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, enabled ? '1' : '0')
  } catch (err) {
    // Best-effort — the preference rehydrates from the server on next sync
    // if the local write fails.
    console.warn('[push-preference] write failed', err)
  }
}
