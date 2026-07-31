/**
 * Daily relationship push preference (Yuel / Kindred).
 *
 * Stores ONE boolean: whether the user wants the **relationship / synastry**
 * evening nudge (~19:00 local) from the kindred-push cron. This is NOT a
 * personal 命书 morning almanac (that lives in Yuun). Opt-in registers the
 * Expo push token via lib/serverPush.ts; without a token the cron skips them.
 *
 * Timeline node teasers: server cron at ~09:00 (`/api/kindred/push/timeline-targets`)
 * plus on-device reschedule when the timeline screen is opened (lib/timeline-push.ts).
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
