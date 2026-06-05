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

import AsyncStorage from '@react-native-async-storage/async-storage'
import { resolvePortfolioApiUrl } from '@zhop/satellite-runtime'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { saveBirthdayReminder } from './api'
import { getAuspiceBirthInfo } from './birth'
import { getAuspiceDeviceId } from './device'
import type { AuspicePerson } from './people'
import { getAuspiceProActive } from './pro'
import { isServerPushActive, setServerPushActive } from './serverPushFlag'

const BDAY_MIGRATED_KEY = 'auspice.bday.serverMigrated.v1'

export interface ServerPushPrefs {
  dailyMorning: boolean
  dailyEvening: boolean
  birthdayOn: boolean
  holidayOn: boolean
}

export interface ServerPushProfile extends Partial<ServerPushPrefs> {
  locale: string
  birthDate?: string
  /** 0-23, -1 = 时辰 unknown. Omit when no birth set. */
  birthHour?: number
  gender?: 'M' | 'F'
  isPro: boolean
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
        birthdayOn: p.birthdayOn ?? true,
        holidayOn: p.holidayOn ?? true,
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
 * Gather the current birth profile + Pro state and (re)register with the given
 * slot prefs. The one call the app-open effect and Settings toggles use, so
 * server push always reflects the latest birth / Pro / locale / prefs. Prefs are
 * passed in (read from the local enable flags by the caller in lib/push) so this
 * module doesn't import lib/push — keeps the dependency one-way.
 */
export async function syncAuspiceServerPush(
  locale: string,
  prefs: ServerPushPrefs
): Promise<boolean> {
  const info = await getAuspiceBirthInfo().catch(() => null)
  const isPro = await getAuspiceProActive().catch(() => false)
  return registerAuspiceServerPush({
    locale,
    birthDate: info?.solarDate,
    birthHour: info ? (info.timeIndex === null ? -1 : info.timeIndex * 2) : undefined,
    gender: info?.gender ? (info.gender === '男' ? 'M' : 'F') : undefined,
    isPro,
    ...prefs,
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

/**
 * One-time: push the device's existing 亲友 birthdays into the server table so
 * server birthday push covers 亲友 saved BEFORE this feature shipped (without it,
 * deferring local birthday would silently drop their reminders). people.tsx keeps
 * the table current after. No-op unless server push is active + not yet migrated.
 */
export async function migrateBirthdaysToServerOnce(
  people: ReadonlyArray<AuspicePerson>,
  isPro: boolean
): Promise<void> {
  if (!(await isServerPushActive())) return
  try {
    if ((await AsyncStorage.getItem(BDAY_MIGRATED_KEY)) === '1') return
  } catch {
    return
  }
  try {
    const deviceId = await getAuspiceDeviceId()
    for (const p of people) {
      await saveBirthdayReminder({
        deviceId,
        id: p.id,
        name: p.name,
        solarDate: p.solarDate,
        calendar: p.calendar ?? 'solar',
        relation: p.relation,
        advanceDays: p.advanceDays,
        remindOnDay: p.remindOnDay,
        isPro,
      }).catch(() => {})
    }
    await AsyncStorage.setItem(BDAY_MIGRATED_KEY, '1')
  } catch {
    // best-effort; people.tsx will sync each 亲友 on its next edit anyway
  }
}

export { isServerPushActive }
