/**
 * Daily reading reminder preference.
 *
 * Stores ONE boolean: whether the user wants a morning nudge to open their
 * Kindred reading. The actual scheduling/delivery is server-side (cron
 * batch through svc-notify); this preference is read by the API client on
 * profile sync. The toggle is debounced through AsyncStorage so a quick
 * tap-tap doesn't fight pending writes.
 *
 * NOTE: the DAILY READING reminder (this file) stays server-side. The separate
 * relationship-TIMELINE reminders ARE scheduled on-device (local notifications),
 * since their fire dates are deterministic future 命理 nodes the server returns
 * as a Pro-only timetable — see lib/timeline-push.ts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'kindred_daily_push_v1'

export async function getDailyPushEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY)
    // Default OFF — we don't push notifications at someone before they've
    // explicitly opted in (App Store guidelines + good behaviour).
    return v === '1'
  } catch {
    return false
  }
}

export async function setDailyPushEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, enabled ? '1' : '0')
  } catch {
    // Best-effort — the preference rehydrates from the server on next sync
    // if the local write fails.
  }
}
