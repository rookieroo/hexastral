/**
 * Kindred push registration — the ADR-0025 write-path. Registers this device's
 * Expo token into the shared `pushTokens` registry so the server relationship-push
 * cron (runKindredPush) can reach it. Mirrors the per-user pattern in hexastral-app's
 * lib/ux/pushNotifications.ts, adapted to kindred's lazy-guarded `notif()` (the
 * native module is absent in JS-only reloads) + lib/hmac signing.
 *
 * "Has a token" IS the opt-in: register only when the daily push is enabled
 * (getDailyPushEnabled) AND OS permission is granted; DELETE the token when off.
 *
 * Foreground display + tap routing are already wired globally by lib/timeline-push.ts
 * (configureTimelineNotifications + attachTimelineTapHandler, which routes ANY push
 * carrying data.route — our synastry pushes set data.route='/(bonds)/<id>'). So this
 * file is registration only.
 */
import { Platform } from 'react-native'
import { config } from './config'
import { signRequest } from './hmac'
import { getDailyPushEnabled } from './push-preference'

type Notif = typeof import('expo-notifications')
let cached: Notif | null | undefined

/** Lazy + guarded accessor — null when the native module isn't compiled in. */
function notif(): Notif | null {
  if (cached !== undefined) return cached
  try {
    cached = require('expo-notifications') as Notif
  } catch {
    cached = null
  }
  return cached
}

export type PushPermissionStatus = 'granted' | 'denied' | 'undetermined'

/** Prompt for OS notification permission (call from an explicit user action only). */
export async function requestPushPermission(): Promise<PushPermissionStatus> {
  const N = notif()
  if (!N || Platform.OS === 'web') return 'denied'
  const existing = await N.getPermissionsAsync()
  if (existing.status === 'granted') return 'granted'
  const req = await N.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  })
  return req.status as PushPermissionStatus
}

async function getExpoPushToken(): Promise<string | null> {
  const N = notif()
  if (!N) return null
  try {
    const token = await N.getExpoPushTokenAsync({ projectId: config.easProjectId || undefined })
    return token.data
  } catch {
    return null
  }
}

async function signedHeaders(
  userId: string,
  method: string,
  body: string
): Promise<Record<string, string> | null> {
  const sig = await signRequest({ method, path: '/api/notify/register-device', body, userId })
  if (!sig) return null
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${userId}`, ...sig }
}

/**
 * Register this device's Expo token. By default does NOT prompt — it registers
 * only when permission is already granted (safe to call on every launch). Pass
 * `{ prompt: true }` from the explicit settings toggle to request permission.
 */
export async function registerPushToken(
  userId: string,
  opts?: { prompt?: boolean }
): Promise<boolean> {
  const N = notif()
  if (!N || !userId || Platform.OS === 'web') return false
  let status: PushPermissionStatus
  if (opts?.prompt) {
    status = await requestPushPermission()
  } else {
    status = (await N.getPermissionsAsync()).status as PushPermissionStatus
  }
  if (status !== 'granted') return false
  const token = await getExpoPushToken()
  if (!token) return false
  try {
    const body = JSON.stringify({
      userId,
      token,
      platform: Platform.OS,
      timezoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
    const headers = await signedHeaders(userId, 'POST', body)
    if (!headers) return false
    const res = await fetch(`${config.apiUrl}/api/notify/register-device`, {
      method: 'POST',
      headers,
      body,
    })
    return res.ok
  } catch {
    return false
  }
}

/** Drop this user's push tokens (opt-out / logout). Best-effort, silent. */
export async function unregisterPushToken(userId: string): Promise<void> {
  if (!userId) return
  try {
    const headers = await signedHeaders(userId, 'DELETE', '')
    if (!headers) return
    await fetch(`${config.apiUrl}/api/notify/register-device`, { method: 'DELETE', headers })
  } catch {
    // best-effort — the server purges stale tokens on its own cadence
  }
}

/**
 * Reconcile registration with the opt-in: register when the daily push is enabled
 * (+ permission already granted — never prompts here), else unregister. Call on
 * launch once userId is available, and after the settings toggle flips.
 */
export async function syncPushRegistration(userId: string): Promise<void> {
  if (!userId || Platform.OS === 'web') return
  if (await getDailyPushEnabled()) {
    await registerPushToken(userId)
  } else {
    await unregisterPushToken(userId)
  }
}
