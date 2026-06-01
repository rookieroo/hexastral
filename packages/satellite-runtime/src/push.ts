/**
 * Push notifications · matrix-wide infra.
 *
 * Why this exists (P1-12): each of the 8 satellite apps needs the same
 * permission-prime + register-token + reconcile-orphan-tokens dance. Doing
 * it 8 times is silly. This module is the shared implementation.
 *
 * Three primitives:
 *   - `configurePushHandler()` — call at app boot to set foreground display
 *     behavior. Must run before the first notification arrives.
 *   - `requestPushPermission()` — async, returns boolean. Use in your
 *     `usePushPrime` consumer to gate the actual prompt.
 *   - `registerPushTokenWithServer({app, userId})` — gets the Expo token,
 *     POSTs it to /api/notify/register-device (HMAC-signed via signedFetch
 *     from P1-17). Idempotent (server upserts on token PK).
 *   - `unregisterPushTokenFromServer()` — DELETE /api/notify/register-device.
 *     Call when user revokes permission OR on sign-out.
 *   - `useTokenPermissionReconcile()` — hook that on every foreground checks
 *     the OS permission state vs. server registration. If permission is no
 *     longer granted but server has a token → fire-and-forget DELETE. This
 *     prevents the silent-push problem (server keeps sending to a token
 *     that iOS dropped) without waiting for the 90-day stale-sweep cron.
 *   - `usePushPrime()` — call post-first-reading; checks if we've already
 *     primed (AsyncStorage flag), prompts permission, registers token.
 *
 * Graceful no-op: if `expo-notifications` isn't installed (per-app opt-in),
 * EVERY export becomes a no-op. Apps that don't need push aren't forced
 * to add the dependency.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect } from 'react'
import { AppState, Platform } from 'react-native'

import { signedFetch } from './signed-fetch'

// ── Lazy load expo-notifications ─────────────────────────────────────────

interface ExpoNotificationsLike {
  setNotificationHandler: (config: {
    handleNotification: () => Promise<{
      shouldShowAlert?: boolean
      shouldPlaySound?: boolean
      shouldSetBadge?: boolean
      shouldShowBanner?: boolean
      shouldShowList?: boolean
    }>
  }) => void
  getPermissionsAsync: () => Promise<{ status: string }>
  requestPermissionsAsync: (opts?: {
    ios?: { allowAlert?: boolean; allowBadge?: boolean; allowSound?: boolean }
  }) => Promise<{ status: string }>
  getExpoPushTokenAsync: (opts?: { projectId?: string }) => Promise<{ data: string }>
}

function loadNotifications(): ExpoNotificationsLike | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod: unknown = require('expo-notifications')
    if (!mod || typeof mod !== 'object') return null
    const c = mod as Partial<ExpoNotificationsLike>
    if (
      typeof c.setNotificationHandler === 'function' &&
      typeof c.getPermissionsAsync === 'function' &&
      typeof c.requestPermissionsAsync === 'function' &&
      typeof c.getExpoPushTokenAsync === 'function'
    ) {
      return c as ExpoNotificationsLike
    }
    return null
  } catch {
    return null
  }
}

const notifications = loadNotifications()

// ── Foreground display handler ───────────────────────────────────────────

let handlerConfigured = false

/**
 * Set the foreground display behavior. Must be called at app boot before any
 * notification is received. Idempotent.
 */
export function configurePushHandler(): void {
  if (handlerConfigured || !notifications) return
  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  })
  handlerConfigured = true
}

// ── Permission ───────────────────────────────────────────────────────────

export async function getPushPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (!notifications || Platform.OS === 'web') return 'denied'
  try {
    const res = await notifications.getPermissionsAsync()
    if (res.status === 'granted') return 'granted'
    if (res.status === 'denied') return 'denied'
    return 'undetermined'
  } catch {
    return 'denied'
  }
}

export async function requestPushPermission(): Promise<boolean> {
  if (!notifications || Platform.OS === 'web') return false
  try {
    const existing = await notifications.getPermissionsAsync()
    if (existing.status === 'granted') return true
    const req = await notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    })
    return req.status === 'granted'
  } catch {
    return false
  }
}

// ── Token register / unregister ──────────────────────────────────────────

interface RegisterTokenInput {
  /** Expo project id from Constants.expoConfig.extra.eas.projectId. */
  projectId?: string
  /** Device timezone — defaults to runtime resolved tz. */
  timezoneId?: string
  /** Platform override; defaults to runtime Platform.OS. */
  platform?: 'ios' | 'android'
}

const TOKEN_REGISTERED_KEY = '@hexastral/push/token_registered'

/** Try to grab the Expo push token. Returns null when permission denied OR notifications unavailable. */
async function getExpoToken(projectId?: string): Promise<string | null> {
  if (!notifications) return null
  if ((await getPushPermissionStatus()) !== 'granted') return null
  try {
    const res = await notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
    return res.data ?? null
  } catch {
    return null
  }
}

/**
 * Register the device's Expo token with the server. Idempotent — server
 * upserts on token PK. Stores a local flag so subsequent calls short-circuit
 * (we don't need to register on every app open).
 */
export async function registerPushTokenWithServer(input: RegisterTokenInput = {}): Promise<boolean> {
  const token = await getExpoToken(input.projectId)
  if (!token) return false

  const platform: 'ios' | 'android' =
    input.platform ?? (Platform.OS === 'android' ? 'android' : 'ios')
  const timezoneId =
    input.timezoneId ?? (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone
      } catch {
        return 'UTC'
      }
    })()

  const res = await signedFetch({
    method: 'POST',
    path: '/api/notify/register-device',
    body: { token, platform, timezoneId },
  })
  if (!res?.ok) return false

  try {
    await AsyncStorage.setItem(TOKEN_REGISTERED_KEY, '1')
  } catch {}
  return true
}

/**
 * Tell the server to drop this user's push tokens. Call on permission
 * revoke or sign-out. Idempotent — silently OK if there was nothing to
 * drop.
 */
export async function unregisterPushTokenFromServer(): Promise<void> {
  await signedFetch({ method: 'DELETE', path: '/api/notify/register-device' })
  try {
    await AsyncStorage.removeItem(TOKEN_REGISTERED_KEY)
  } catch {}
}

// ── Reconcile ────────────────────────────────────────────────────────────

/**
 * Hook: on every app foreground, check if the local "we registered a token"
 * flag is set but the OS permission is no longer granted. If so, fire-and-
 * forget DELETE so server stops sending. Prevents the silent-push problem
 * (push keeps firing but never reaches the user because iOS dropped it).
 *
 * Safe to mount anywhere; common is the satellite RootLayout.
 */
export function useTokenPermissionReconcile(): void {
  useEffect(() => {
    if (!notifications) return

    async function reconcile(): Promise<void> {
      let wasRegistered: string | null = null
      try {
        wasRegistered = await AsyncStorage.getItem(TOKEN_REGISTERED_KEY)
      } catch {
        return
      }
      if (wasRegistered !== '1') return

      const status = await getPushPermissionStatus()
      if (status === 'granted') return

      // Permission revoked since last register — drop server-side token.
      await unregisterPushTokenFromServer().catch(() => {})
    }

    // Cold start
    void reconcile()

    // Every foreground
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void reconcile()
    })

    return () => {
      sub.remove()
    }
  }, [])
}

// ── usePushPrime ─────────────────────────────────────────────────────────

const PRIMED_KEY = '@hexastral/push/primed'

interface PushPrimeInput {
  /** App namespace. Reserved for future per-app primed tracking; currently global. */
  app: string
  /** Trigger condition. When this flips true, the prime runs (once). */
  shouldPrime: boolean
  /** Expo project id from Constants.expoConfig.extra.eas.projectId (optional). */
  projectId?: string
  /** Optional callback after permission decision. */
  onPermissionResolved?: (granted: boolean) => void
}

/**
 * Hook: once `shouldPrime` flips true, request push permission (if not
 * already granted) and register the token with the server. Stores a flag
 * so re-mounts don't re-prompt.
 *
 * Apple's guidance: ask AFTER value is delivered, not on launch. So a
 * satellite should set `shouldPrime` to true post-first-reading, not at
 * RootLayout mount. The hook itself is safe to mount early (it gates on
 * `shouldPrime`).
 */
export function usePushPrime(input: PushPrimeInput): void {
  useEffect(() => {
    if (!input.shouldPrime || !notifications) return
    let cancelled = false

    void (async () => {
      let primed: string | null = null
      try {
        primed = await AsyncStorage.getItem(PRIMED_KEY)
      } catch {}
      if (primed === '1') {
        // Already prompted once. If permission is currently granted but
        // we never registered the token (e.g. user upgraded mid-flight),
        // catch up now.
        const status = await getPushPermissionStatus()
        if (status === 'granted') {
          await registerPushTokenWithServer({ projectId: input.projectId }).catch(() => {})
        }
        return
      }

      const granted = await requestPushPermission()
      if (cancelled) return

      try {
        await AsyncStorage.setItem(PRIMED_KEY, '1')
      } catch {}

      if (granted) {
        await registerPushTokenWithServer({ projectId: input.projectId }).catch(() => {})
      }

      input.onPermissionResolved?.(granted)
    })()

    return () => {
      cancelled = true
    }
  }, [input.shouldPrime, input.projectId, input.app, input.onPermissionResolved])
}
