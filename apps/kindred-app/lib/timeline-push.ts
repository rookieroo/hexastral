/**
 * Timeline push — the device wrapper that lays the (pure, unit-tested)
 * `buildTimelineNotificationPlan` onto expo-notifications.
 *
 * LOCAL scheduling: no push token, no cron — the rolling future window is
 * (re)scheduled whenever the relationship timeline is viewed. Mirrors
 * apps/auspice-app/lib/push.ts. The Pro gate lives server-side (the timetable is
 * only returned for Pro), so a free user yields an empty plan → nothing scheduled.
 *
 * DEFENSIVE LOADING: `expo-notifications` ships a NATIVE module that only exists
 * after a prebuild / native rebuild. In a JS-only reload (or before the native
 * dep is compiled in) touching it eagerly throws "Cannot find native module
 * ExpoPushTokenManager" and can destabilise boot. So we lazy-`require` it behind
 * a guard (same pattern as @zhop/satellite-runtime) and EVERY entry point no-ops
 * gracefully when it's absent. The feature simply activates once a native build
 * includes the module.
 *
 * The testable core lives in @zhop/scenario-kindred (lib/timeline-notify).
 */

import {
  type BondsTimelineNode,
  type BondsTimelineNotification,
  buildLiuyueDigestPlan,
  buildTimelineNotificationPlan,
  type KindredLocale,
  LIUYUE_DIGEST_ID_PREFIX,
  TIMELINE_NOTIFY_ID_PREFIX,
} from '@zhop/scenario-kindred'
import { Platform } from 'react-native'

type Notif = typeof import('expo-notifications')
let cached: Notif | null | undefined

/** Lazy + guarded module accessor — null when the native module isn't present. */
function notif(): Notif | null {
  if (cached !== undefined) return cached
  try {
    cached = require('expo-notifications') as Notif
  } catch {
    cached = null
  }
  return cached
}

let handlerConfigured = false

/** Foreground display behaviour — call once at the app root. No-op if unavailable. */
export function configureTimelineNotifications(): void {
  const N = notif()
  if (!N || handlerConfigured) return
  handlerConfigured = true
  try {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    })
  } catch {}
}

/**
 * Ask for notification permission, but only when it's still undetermined — never
 * re-prompts after grant/deny. Call at a deliberate moment (opening the timeline).
 */
export async function ensureTimelinePushPermission(): Promise<boolean> {
  const N = notif()
  if (!N || Platform.OS === 'web') return false
  try {
    const existing = await N.getPermissionsAsync()
    if (existing.status === 'granted') return true
    if (!existing.canAskAgain) return false
    const req = await N.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: false },
    })
    return req.status === 'granted'
  } catch {
    return false
  }
}

/** Cancel every kindred-timeline notification by id prefix (idempotent). */
async function cancelTimelineNotifications(N: Notif): Promise<void> {
  try {
    const scheduled = await N.getAllScheduledNotificationsAsync()
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(TIMELINE_NOTIFY_ID_PREFIX))
        .map((n) => N.cancelScheduledNotificationAsync(n.identifier).catch(() => {}))
    )
  } catch {}
}

/**
 * (Re)schedule the timeline reminders from the server timetable. Always cancels
 * the prior set first (Pro→free downgrade, fewer nodes, locale switch). Schedules
 * ONLY when permission is already granted — prompt via `ensureTimelinePushPermission`.
 * Stable per-node ids make this idempotent. Returns the number scheduled (0 if the
 * native module is absent).
 */
export async function syncTimelinePush(
  notifications: readonly BondsTimelineNotification[],
  locale: KindredLocale
): Promise<number> {
  const N = notif()
  if (!N || Platform.OS === 'web') return 0
  await cancelTimelineNotifications(N)
  const plan = buildTimelineNotificationPlan(notifications, { locale })
  if (plan.length === 0) return 0
  try {
    const perm = await N.getPermissionsAsync()
    if (perm.status !== 'granted') return 0
  } catch {
    return 0
  }
  let scheduled = 0
  for (const item of plan) {
    try {
      await N.scheduleNotificationAsync({
        identifier: item.identifier,
        content: { title: item.title, body: item.body, data: item.data },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: item.fireDate },
      })
      scheduled += 1
    } catch {}
  }
  return scheduled
}

/** Cancel every 流月 digest notification by id prefix (idempotent). */
async function cancelLiuyueDigest(N: Notif): Promise<void> {
  try {
    const scheduled = (await N.getAllScheduledNotificationsAsync()) as Array<{ identifier: string }>
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(LIUYUE_DIGEST_ID_PREFIX))
        .map((n) => N.cancelScheduledNotificationAsync(n.identifier).catch(() => {}))
    )
  } catch {}
}

/**
 * (Re)schedule the MONTHLY 流月 relationship digest — one gentle push at the start
 * of each upcoming month that has an actual 冲/合 with someone. Same local-only,
 * cancel-then-reschedule, permission-gated pattern as `syncTimelinePush`; uses a
 * SEPARATE id prefix so the two sets never clobber each other. The data is already
 * Pro-gated (free = current month only → nothing future to schedule). Returns the
 * number scheduled (0 if the native module is absent / no permission).
 */
export async function syncLiuyueDigest(
  liuyue: readonly BondsTimelineNode[],
  locale: KindredLocale
): Promise<number> {
  const N = notif()
  if (!N || Platform.OS === 'web') return 0
  await cancelLiuyueDigest(N)
  const plan = buildLiuyueDigestPlan(liuyue, { locale })
  if (plan.length === 0) return 0
  try {
    const perm = await N.getPermissionsAsync()
    if (perm.status !== 'granted') return 0
  } catch {
    return 0
  }
  let scheduled = 0
  for (const item of plan) {
    try {
      await N.scheduleNotificationAsync({
        identifier: item.identifier,
        content: { title: item.title, body: item.body, data: item.data },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: item.fireDate },
      })
      scheduled += 1
    } catch {}
  }
  return scheduled
}

/**
 * Route to the notification's `data.route` when a timeline reminder is tapped.
 * Returns an unsubscribe fn (a no-op when the native module is absent).
 */
export function attachTimelineTapHandler(navigate: (route: string) => void): () => void {
  const N = notif()
  if (!N) return () => {}
  try {
    const sub = N.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { route?: string } | undefined
      if (data?.route) navigate(data.route)
    })
    return () => sub.remove()
  } catch {
    return () => {}
  }
}
