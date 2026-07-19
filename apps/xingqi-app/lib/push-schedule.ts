/**
 * Local notifications for Xingqi Pro (ADR-0028):
 * - monthly re-capture reminder
 * - event-window notes from the active event table
 *
 * Server cron (svc-notify) is primary; local is fallback when register fails.
 * Respects lib/push-preference.ts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

import { getXingqiPushPrefs } from './push-preference'
import { isCjkZh, pickZh } from './locale-zh'

const SCHEDULED_KEY = 'xingqi_push_scheduled_v1'
const SERVER_ACTIVE_KEY = 'xingqi_server_push_active_v1'

interface ExpoNotificationsLike {
  requestPermissionsAsync: () => Promise<{ status: string }>
  getPermissionsAsync: () => Promise<{ status: string }>
  cancelAllScheduledNotificationsAsync: () => Promise<void>
  scheduleNotificationAsync: (req: {
    content: { title: string; body: string; data?: Record<string, string> }
    trigger: unknown
  }) => Promise<string>
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

export interface ScheduleFacePushInput {
  locale: string
  isPro: boolean
  events: Array<{
    startMonth?: string
    theme?: string
    note?: string
  }>
  /** When true, skip local schedule (server owns delivery). */
  preferServer?: boolean
}

function copy(locale: string) {
  const s = (hans: string, hant: string, en: string) =>
    isCjkZh(locale) ? pickZh(locale, hans, hant) : en
  return {
    recaptureTitle: s('可以更新本期形气了', '可以更新本期形氣了', 'Time to refresh your reading'),
    recaptureBody: s(
      '新的一个月窗口已打开。可整组复拍，或只更新面部/左掌/右掌。',
      '新的一個月視窗已開啟。可整組複拍，或只更新面部／左掌／右掌。',
      'A new monthly window is open. Refresh all three photos, or update one part.'
    ),
    eventTitle: s('宜留意的时间窗', '宜留意的時間窗', 'A window worth noting'),
  }
}

export async function isXingqiPushEnabled(): Promise<boolean> {
  const prefs = await getXingqiPushPrefs()
  return prefs.remindersOn
}

export async function setXingqiServerPushActive(active: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SERVER_ACTIVE_KEY, active ? '1' : '0')
  } catch {
    // best-effort
  }
}

export async function isXingqiServerPushActive(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SERVER_ACTIVE_KEY)) === '1'
  } catch {
    return false
  }
}

/** Cancel all local scheduled notifications. */
export async function cancelXingqiPush(): Promise<void> {
  const Notifications = loadNotifications()
  if (!Notifications) return
  try {
    await Notifications.cancelAllScheduledNotificationsAsync()
    await AsyncStorage.removeItem(SCHEDULED_KEY)
  } catch {
    // best-effort
  }
}

/** Schedule local reminders after a successful Pro reading (or Settings sync). */
export async function scheduleXingqiPush(input: ScheduleFacePushInput): Promise<void> {
  if (!input.isPro) return
  const prefs = await getXingqiPushPrefs()
  if (!prefs.remindersOn) {
    await cancelXingqiPush()
    return
  }
  if (input.preferServer || (await isXingqiServerPushActive())) {
    // Server primary — keep local empty so we don't double-fire.
    await cancelXingqiPush()
    return
  }

  const Notifications = loadNotifications()
  if (!Notifications) return

  const perm = await Notifications.getPermissionsAsync()
  if (perm.status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync()
    if (req.status !== 'granted') return
  }

  await Notifications.cancelAllScheduledNotificationsAsync()
  const c = copy(input.locale)

  if (prefs.recaptureOn) {
    const recaptureAt = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: c.recaptureTitle,
        body: c.recaptureBody,
        data: { kind: 'recapture' },
      },
      trigger: { type: 'date', date: recaptureAt },
    })
  }

  if (prefs.eventsOn) {
    for (const ev of input.events.slice(0, 8)) {
      if (!ev.startMonth || !/^\d{4}-\d{2}$/.test(ev.startMonth)) continue
      const [y, m] = ev.startMonth.split('-').map((n) => Number(n))
      if (!y || !m) continue
      const when = new Date(y, m - 1, 1, 10, 0, 0)
      if (when.getTime() <= Date.now()) continue
      await Notifications.scheduleNotificationAsync({
        content: {
          title: c.eventTitle,
          body: `${ev.theme ?? ''}${ev.note ? ` — ${ev.note}` : ''}`.trim(),
          data: { kind: 'event', startMonth: ev.startMonth },
        },
        trigger: { type: 'date', date: when },
      })
    }
  }

  await AsyncStorage.setItem(SCHEDULED_KEY, new Date().toISOString())
}
