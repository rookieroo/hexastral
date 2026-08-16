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
import { getPortfolioUserId, resolvePortfolioApiUrl } from '@zhop/satellite-runtime'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { saveBirthdayReminder } from './api'
import { getAuspiceBirthInfo } from './birth'
import { getAuspiceDeviceId } from './device'
import type { Locale } from './i18n'
import type { AuspicePerson } from './people'
import { getAuspiceProActive } from './pro'
import { isServerPushActive, setServerPushActive } from './serverPushFlag'
import { getVoiceMode } from './voice-mode'
import { resolveYijiDisplayMode } from './yiji-display-mode'

const BDAY_MIGRATED_KEY = 'auspice.bday.serverMigrated.v1'

export interface ServerPushPrefs {
  dailyMorning: boolean
  dailyEvening: boolean
  birthdayOn: boolean
  holidayOn: boolean
  /** 人生时间线 node push (流月/流年/大运). Pro-gated server-side; mirrors the
   *  in-app timelineRemindToggle so turning it off here stops the cron push. */
  timelineRemindOn: boolean
}

export interface ServerPushProfile extends Partial<ServerPushPrefs> {
  locale: string
  birthDate?: string
  /** 0-23, -1 = 时辰 unknown. Omit when no birth set. */
  birthHour?: number
  gender?: 'M' | 'F'
  isPro: boolean
  /** Device-scoped 宜忌 display mode; omit → server derives from locale. */
  yijiMode?: 'modern' | 'traditional'
  /** App-wide voice mode — classical (黄历原声) keeps the push pure 行话. */
  voiceMode?: 'contemporary' | 'classical'
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
    const portfolioUserId = await getPortfolioUserId().catch(() => null)
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
        timelineRemindOn: p.timelineRemindOn ?? true,
        isPro: p.isPro,
        ...(p.yijiMode ? { yijiMode: p.yijiMode } : {}),
        ...(p.voiceMode ? { voiceMode: p.voiceMode } : {}),
        ...(portfolioUserId ? { u: portfolioUserId } : {}),
      }),
    })
    if (__DEV__) {
      console.info('[auspice-push] register', {
        ok: res.ok,
        timezoneId,
        // Server canonicalizes into TIMEZONE_POOL (e.g. Asia/Hong_Kong → Asia/Shanghai).
      })
    }
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
  const yijiMode = await resolveYijiDisplayMode(locale as Locale).catch(() => undefined)
  const voiceMode = await getVoiceMode().catch(() => 'contemporary' as const)
  return registerAuspiceServerPush({
    locale,
    birthDate: info?.solarDate,
    birthHour: info ? (info.timeIndex === null ? -1 : info.timeIndex * 2) : undefined,
    gender: info?.gender ? (info.gender === '男' ? 'M' : 'F') : undefined,
    isPro,
    yijiMode,
    voiceMode,
    ...prefs,
  })
}

/**
 * DEV: 触发服务器用真实 renderAuspicePush 渲染并立即发送「今日 morning」
 * 推送到本设备（与 svc-notify 定时链路同一文案口径）。返回真实 title/body。
 */
export async function devFireDailyPush(): Promise<{
  sent: boolean
  reason?: string
  title?: string
  body?: string
}> {
  const deviceId = await getAuspiceDeviceId().catch(() => null)
  if (!deviceId) return { sent: false, reason: 'no_device_id' }
  // Present the device's LIVE Expo token so a stale server-side sub row can't
  // break the test — the server sends to this token instead of the stored one.
  let token: string | undefined
  try {
    const perm = await Notifications.getPermissionsAsync()
    if (perm.status === 'granted') {
      const tr = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
      })
      if (tr.data) token = tr.data
    }
  } catch {
    // Token optional — server falls back to the stored sub token.
  }
  const res = await fetch(`${resolvePortfolioApiUrl()}/api/auspice/push/dev-fire`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ deviceId, ...(token ? { token } : {}) }),
  }).catch(() => null)
  if (!res) return { sent: false, reason: 'network' }
  const json = await res.json().catch(() => null)
  const data = json?.data ?? json
  const fallbackReason =
    typeof data?.reason === 'string' && data.reason.length > 0
      ? data.reason
      : typeof data?.error === 'string' && data.error.length > 0
        ? data.error
        : !res.ok
          ? `http_${res.status}`
          : undefined
  return {
    sent: data?.sent === true,
    reason: fallbackReason,
    title: typeof data?.title === 'string' ? data.title : undefined,
    body: typeof data?.body === 'string' ? data.body : undefined,
  }
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
        lunarIsLeap: p.lunarIsLeap === true,
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
