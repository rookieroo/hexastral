/**
 * Hexastral analytics emitter — wraps `@zhop/growth-funnel`'s `createFunnelEmitter`
 * with hexastral-app's apiUrl, MMKV-backed anonymous id, current locale, and a
 * lazy hook into `useAuth` for the authenticated user id.
 *
 * Emission is fire-and-forget; callers do not await. Use `emitFunnelEvent`
 * for one-off calls (e.g. discovery card taps) and `useAttachUserToFunnel`
 * once at app root to keep `user_id` fresh on every event.
 *
 * Endpoint: anonymous `POST /api/growth/events` (IP rate-limited + Zod-validated
 * + Analytics Engine write per apps/hexastral-api/src/routes/growth-funnel-events.ts).
 */

import { createFunnelEmitter, type FunnelEmitInput } from '@zhop/growth-funnel'
import { Platform } from 'react-native'
import { config } from './config'
import { storage } from './storage'
import { randomUUID } from './uuid'

const ANON_ID_KEY = 'hexastral.anonymousId'

function getOrMintAnonymousId(): string {
  const existing = storage.getString(ANON_ID_KEY)
  if (existing) return existing
  const fresh = randomUUID()
  storage.set(ANON_ID_KEY, fresh)
  return fresh
}

let currentUserId: string | null = null

/** Wire the current authenticated user id into every subsequent emit. */
export function setFunnelUserId(userId: string | null): void {
  currentUserId = userId
}

let currentLocale: string | null = null

/** Wire the active locale tag (e.g. 'zh-Hant') into every subsequent emit. */
export function setFunnelLocale(locale: string | null): void {
  currentLocale = locale
}

const emitter = createFunnelEmitter({
  apiBaseUrl: config.apiUrl,
  source: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
  getAnonymousId: getOrMintAnonymousId,
  getUserId: () => currentUserId,
  getLocale: () => currentLocale,
  onError: (err) => {
    if (__DEV__) console.warn('[analytics] emit failed', err)
  },
})

/** Fire-and-forget funnel event emission. Returns immediately. */
export function emitFunnelEvent(input: FunnelEmitInput): void {
  emitter.emit(input)
}
