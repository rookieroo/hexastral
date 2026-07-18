/**
 * Local notifications for Xingqi Pro (ADR-0028):
 * - monthly re-capture reminder
 * - event-window notes from the active event table
 *
 * Uses expo-notifications when installed; no-ops otherwise.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const SCHEDULED_KEY = 'xingqi_push_scheduled_v1'

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
}

function copy(locale: string) {
  const zh = locale.startsWith('zh')
  return {
    recaptureTitle: zh ? '可以更新本期形气了' : 'Time to refresh your reading',
    recaptureBody: zh
      ? '新的一个月窗口已打开。可整组复拍，或只更新面部/左掌/右掌。'
      : 'A new monthly window is open. Refresh all three photos, or update one part.',
    eventTitle: zh ? '宜留意的时间窗' : 'A window worth noting',
  }
}

/** Schedule local reminders after a successful Pro reading. */
export async function scheduleXingqiPush(input: ScheduleFacePushInput): Promise<void> {
  if (!input.isPro) return
  const Notifications = loadNotifications()
  if (!Notifications) return

  const perm = await Notifications.getPermissionsAsync()
  if (perm.status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync()
    if (req.status !== 'granted') return
  }

  await Notifications.cancelAllScheduledNotificationsAsync()
  const c = copy(input.locale)

  // ~25 days from now — monthly re-capture nudge
  const recaptureAt = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000)
  await Notifications.scheduleNotificationAsync({
    content: { title: c.recaptureTitle, body: c.recaptureBody, data: { kind: 'recapture' } },
    trigger: { type: 'date', date: recaptureAt },
  })

  for (const ev of input.events.slice(0, 8)) {
    if (!ev.startMonth || !/^\d{4}-\d{2}$/.test(ev.startMonth)) continue
    const [y, m] = ev.startMonth.split('-').map((n) => Number(n))
    if (!y || !m) continue
    const when = new Date(Date.UTC(y, m - 1, 1, 10, 0, 0))
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

  await AsyncStorage.setItem(SCHEDULED_KEY, new Date().toISOString())
}
