/**
 * Xingqi server push registration (Yuun-shaped).
 * Primary: svc-notify cron → /api/physiognomy/push/targets
 * Fallback: local expo-notifications when register fails.
 */

import { getPortfolioUserId, resolvePortfolioApiUrl, signRequest } from '@zhop/satellite-runtime'
import { Platform } from 'react-native'

import { config } from './config'
import type { XingqiPushPrefs } from './push-preference'
import { getXingqiPushPrefs } from './push-preference'
import { cancelXingqiPush, setXingqiServerPushActive } from './push-schedule'

interface ExpoNotificationsLike {
  getPermissionsAsync: () => Promise<{ status: string }>
  requestPermissionsAsync: () => Promise<{ status: string }>
  getExpoPushTokenAsync: (opts?: { projectId?: string }) => Promise<{ data: string }>
}

function loadNotifications(): ExpoNotificationsLike | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod: unknown = require('expo-notifications')
    if (!mod || typeof mod !== 'object') return null
    return mod as ExpoNotificationsLike
  } catch {
    return null
  }
}

export async function registerXingqiServerPush(opts: {
  locale: string
  isPro: boolean
  prefs?: XingqiPushPrefs
  /** ISO timestamp of last successful reading; used for recapture due. */
  lastReadingAt?: string | null
  /**
   * Allow storing a token when not Pro (oneshot completion push).
   * Cron targets still filter `isPro: true` for recapture/events.
   */
  allowWithoutPro?: boolean
}): Promise<boolean> {
  if (Platform.OS === 'web') return false
  const Notifications = loadNotifications()
  if (!Notifications) {
    await setXingqiServerPushActive(false)
    return false
  }

  const userId = await getPortfolioUserId()
  if (!userId) {
    await setXingqiServerPushActive(false)
    return false
  }

  const prefs = opts.prefs ?? (await getXingqiPushPrefs())
  if (!prefs.remindersOn) {
    await unregisterXingqiServerPush()
    return false
  }
  if (!opts.isPro && !opts.allowWithoutPro) {
    await unregisterXingqiServerPush()
    return false
  }

  try {
    let perm = await Notifications.getPermissionsAsync()
    if (perm.status !== 'granted') {
      perm = await Notifications.requestPermissionsAsync()
    }
    if (perm.status !== 'granted') {
      await setXingqiServerPushActive(false)
      return false
    }

    const projectId = config.easProjectId || undefined
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    )
    const token = tokenResp.data
    if (!token) {
      await setXingqiServerPushActive(false)
      return false
    }

    const timezoneId = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    const path = '/api/physiognomy/push/register'
    const body = JSON.stringify({
      token,
      platform: Platform.OS === 'android' ? 'android' : 'ios',
      timezoneId,
      locale: opts.locale,
      recaptureOn: prefs.recaptureOn,
      eventsOn: prefs.eventsOn,
      isPro: opts.isPro,
      lastReadingAt: opts.lastReadingAt ?? undefined,
    })
    const signed = await signRequest({ body, userId, method: 'POST', path })
    if (!signed) {
      await setXingqiServerPushActive(false)
      return false
    }
    const res = await fetch(`${resolvePortfolioApiUrl()}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userId}`,
        ...signed,
      },
      body,
    })
    await setXingqiServerPushActive(res.ok)
    if (res.ok) {
      // Server owns delivery — clear local to avoid doubles.
      await cancelXingqiPush()
    }
    return res.ok
  } catch {
    await setXingqiServerPushActive(false)
    return false
  }
}

export async function unregisterXingqiServerPush(): Promise<void> {
  try {
    const userId = await getPortfolioUserId()
    if (!userId) {
      await setXingqiServerPushActive(false)
      return
    }
    const path = '/api/physiognomy/push/register'
    const signed = await signRequest({ body: '', userId, method: 'DELETE', path })
    if (!signed) {
      await setXingqiServerPushActive(false)
      return
    }
    await fetch(`${resolvePortfolioApiUrl()}${path}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${userId}`,
        ...signed,
      },
    })
  } catch {
    // best-effort
  }
  await setXingqiServerPushActive(false)
}
