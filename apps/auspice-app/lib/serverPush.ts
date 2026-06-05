/**
 * Auspice REAL server push (registration side).
 *
 * Auspice was local-only (expo-notifications), which is unreliable: the rolling
 * window dries up if the app isn't opened. This registers the device for server
 * push — svc-notify's cron sends an Expo push (body rendered server-side from the
 * deterministic almanac) regardless of whether the app is open. A device runs
 * EITHER server push (when registered) OR local — never both: once registered,
 * the local DAILY scheduler defers (see lib/push.ts `isServerPushActive`).
 *
 * Anonymous + device-scoped (Auspice has no account): the deviceId is the
 * identity. We send the birth profile so the server can personalize the
 * deterministic 吉平凶 verdict; the LLM 对你而言 reading stays in-app.
 *
 * Requires an Expo project id (EXPO_PUBLIC_EAS_PROJECT_ID) for the push token —
 * mirrors apps/hexastral-app/lib/ux/pushNotifications.ts. If the token can't be
 * obtained (Expo Go, missing config, permission denied), registration fails and
 * the caller keeps the local fallback.
 */

import { resolvePortfolioApiUrl } from '@zhop/satellite-runtime'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { getAuspiceBirthInfo } from './birth'
import { getAuspiceDeviceId } from './device'
import { getAuspiceProActive } from './pro'
import { isServerPushActive, setServerPushActive } from './serverPushFlag'

export interface ServerPushProfile {
  locale: string
  birthDate?: string
  /** 0-23, -1 = 时辰 unknown. Omit when no birth set. */
  birthHour?: number
  gender?: 'M' | 'F'
  isPro: boolean
  /** Slot opt-outs (default on). */
  dailyMorning?: boolean
  dailyEvening?: boolean
}

/**
 * Register (or refresh) this device for server push. Returns true when the server
 * accepted the registration — the caller then skips local DAILY scheduling. Safe
 * to call on every app open: it upserts (refreshes token / tz / profile / Pro).
 */
export async function registerAuspiceServerPush(p: ServerPushProfile): Promise<boolean> {
  if (Platform.OS === 'web') return false
  try {
    const perm = await Notifications.getPermissionsAsync()
    if (perm.status !== 'granted') {
      await setServerPushActive(false)
      return false
    }
    const tokenResp = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    })
    const token = tokenResp.data
    if (!token) {
      await setServerPushActive(false)
      return false
    }
    const deviceId = await getAuspiceDeviceId()
    const timezoneId = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    const res = await fetch(`${resolvePortfolioApiUrl()}/api/auspice/push/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        deviceId,
        token,
        platform: Platform.OS === 'android' ? 'android' : 'ios',
        timezoneId,
        locale: p.locale,
        birthDate: p.birthDate,
        birthHour: p.birthHour,
        gender: p.gender,
        dailyMorning: p.dailyMorning ?? true,
        dailyEvening: p.dailyEvening ?? true,
        isPro: p.isPro,
      }),
    })
    await setServerPushActive(res.ok)
    return res.ok
  } catch {
    await setServerPushActive(false)
    return false
  }
}

/**
 * Gather the current birth profile + Pro state and (re)register. The one call
 * both the app-open effect and the Settings enable-toggle use, so server push
 * always reflects the latest birth / Pro / locale without duplicating the
 * profile-gathering logic.
 */
export async function syncAuspiceServerPush(locale: string): Promise<boolean> {
  const info = await getAuspiceBirthInfo().catch(() => null)
  const isPro = await getAuspiceProActive().catch(() => false)
  return registerAuspiceServerPush({
    locale,
    birthDate: info?.solarDate,
    birthHour: info ? (info.timeIndex === null ? -1 : info.timeIndex * 2) : undefined,
    gender: info?.gender ? (info.gender === '男' ? 'M' : 'F') : undefined,
    isPro,
  })
}

/** Unregister (e.g. user turned daily push off). Falls back to local on next open. */
export async function unregisterAuspiceServerPush(): Promise<void> {
  try {
    const deviceId = await getAuspiceDeviceId()
    await fetch(
      `${resolvePortfolioApiUrl()}/api/auspice/push/register?deviceId=${encodeURIComponent(deviceId)}`,
      { method: 'DELETE', headers: { accept: 'application/json' } }
    )
  } catch {
    // best-effort — the server drops stale tokens on DeviceNotRegistered anyway
  }
  await setServerPushActive(false)
}

export { isServerPushActive }
