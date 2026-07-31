/**
 * Kindred push registration — the ADR-0025 write-path. Registers this device's
 * Expo token into the shared `pushTokens` registry so the server relationship-push
 * cron (runKindredPush) can reach it. Mirrors the per-user pattern in hexastral-app's
 * lib/ux/pushNotifications.ts, adapted to kindred's lazy-guarded `notif()` (the
 * native module is absent in JS-only reloads) + lib/hmac signing.
 *
 * "Has a token" IS the opt-in: register only when Notifications are enabled
 * (getDailyPushEnabled) AND OS permission is granted; DELETE the token when off.
 * One Settings switch covers relationship + timeline pushes; the server decides
 * what/when (queue + cron, default daytime local slot).
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

export type PushRegisterResult =
  | { ok: true }
  | { ok: false; reason: 'no_module' | 'no_user' | 'denied' | 'token' | 'network' }

/**
 * Register this device's Expo token. By default does NOT prompt — it registers
 * only when permission is already granted (safe to call on every launch). Pass
 * `{ prompt: true }` from the explicit settings toggle to request permission.
 */
export async function registerPushToken(
  userId: string | null | undefined,
  opts?: { prompt?: boolean }
): Promise<boolean> {
  const result = await registerPushTokenDetailed(userId, opts)
  return result.ok
}

/** Same as registerPushToken but surfaces why enable failed (Settings UX). */
export async function registerPushTokenDetailed(
  userId: string | null | undefined,
  opts?: { prompt?: boolean }
): Promise<PushRegisterResult> {
  const N = notif()
  if (!N) return { ok: false, reason: 'no_module' }
  if (!userId || Platform.OS === 'web') return { ok: false, reason: 'no_user' }
  let status: PushPermissionStatus
  if (opts?.prompt) {
    status = await requestPushPermission()
  } else {
    status = (await N.getPermissionsAsync()).status as PushPermissionStatus
  }
  if (status !== 'granted') return { ok: false, reason: 'denied' }
  const token = await getExpoPushToken()
  if (!token) return { ok: false, reason: 'token' }
  try {
    const body = JSON.stringify({
      userId,
      token,
      platform: Platform.OS,
      timezoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
    const headers = await signedHeaders(userId, 'POST', body)
    if (!headers) return { ok: false, reason: 'network' }
    const res = await fetch(`${config.apiUrl}/api/notify/register-device`, {
      method: 'POST',
      headers,
      body,
    })
    return res.ok ? { ok: true } : { ok: false, reason: 'network' }
  } catch {
    return { ok: false, reason: 'network' }
  }
}

/** Drop this user's push tokens (opt-out / logout). Best-effort, silent. */
export async function unregisterPushToken(userId: string | null | undefined): Promise<void> {
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
export async function syncPushRegistration(userId: string | null | undefined): Promise<void> {
  if (!userId || Platform.OS === 'web') return
  if (await getDailyPushEnabled()) {
    await registerPushToken(userId)
  } else {
    await unregisterPushToken(userId)
  }
}
