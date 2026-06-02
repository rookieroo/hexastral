/**
 * usePushAttribution — tracks push notification → IAP conversion.
 *
 * When the user opens the app from a daily_fortune push notification,
 * this hook captures the notificationId and stores it in MMKV.
 * Call `getLastNotificationId()` before an IAP purchase to read it.
 */

import * as Notifications from 'expo-notifications'
import { useEffect } from 'react'
import { storage } from '@/lib/storage'

const MMKV_KEY = 'push_attr_notification_id'
const MMKV_SAVED_AT_KEY = 'push_attr_notification_saved_at'
const ATTRIBUTION_WINDOW_MS = 48 * 60 * 60 * 1000 // 48 hours

/**
 * Returns the most recently captured push notificationId if it was
 * received within the last 48 hours, or null otherwise.
 * Clears the stored value after reading (one-shot).
 */
export function getLastNotificationId(): string | null {
  const id = storage.getString(MMKV_KEY)
  const savedAt = storage.getString(MMKV_SAVED_AT_KEY)
  if (!id || !savedAt) return null

  const age = Date.now() - Number.parseInt(savedAt, 10)
  if (Number.isNaN(age) || age > ATTRIBUTION_WINDOW_MS) {
    storage.remove(MMKV_KEY)
    storage.remove(MMKV_SAVED_AT_KEY)
    return null
  }

  return id
}

/** Clears attribution data after a successful IAP (call post-purchase) */
export function clearLastNotificationId(): void {
  storage.remove(MMKV_KEY)
  storage.remove(MMKV_SAVED_AT_KEY)
}

/**
 * Mount this hook once in the root layout to capture push taps.
 * Listens to `useLastNotificationResponse` equivalent via addNotificationResponseReceivedListener.
 */
export function usePushAttribution(): void {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>
      if (
        data?.type === 'daily_fortune' &&
        typeof data.notificationId === 'string' &&
        data.notificationId.length > 0
      ) {
        storage.set(MMKV_KEY, data.notificationId)
        storage.set(MMKV_SAVED_AT_KEY, String(Date.now()))
      }
    })

    return () => subscription.remove()
  }, [])
}
