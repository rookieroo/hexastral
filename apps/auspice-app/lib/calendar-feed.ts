/**
 * Apple Calendar / iCal subscription feed — open in system Calendar.app
 * via webcal:// so the OS handles the "subscribe" flow without us building
 * a subscription manager.
 *
 * The feed at `/api/cycle/calendar.ics` is anonymous + generic for v1
 * (no 对你而言, matches the free-tier push contract). Per-user opaque tokens
 * + Pro paywall integration are a follow-up — when ready, swap this URL
 * shape to include `?token=<opaque>`.
 */

import { resolvePortfolioApiUrl } from '@zhop/satellite-runtime'
import { Linking } from 'react-native'
import Purchases from 'react-native-purchases'

const FEED_PATH = '/api/cycle/calendar.ics'

/** Plain HTTPS URL — for showing the user or copying to clipboard. */
export function getCalendarFeedUrl(): string {
  return `${resolvePortfolioApiUrl()}${FEED_PATH}`
}

/**
 * `webcal://` URL — Apple Calendar (iOS / macOS) and most desktop calendar
 * clients claim this scheme and prompt the user to subscribe. Android
 * varies by installed calendar; we still try webcal first.
 */
export function getCalendarSubscribeUrl(): string {
  return getCalendarFeedUrl().replace(/^https?:\/\//, 'webcal://')
}

/**
 * Open the subscribe flow. On iOS this hands off to the system Calendar
 * app which shows "Add Subscription" with the feed URL pre-filled. On
 * Android the OS prompts to pick a handler (typically the user's installed
 * calendar app); if none claims webcal://, the openURL promise rejects and
 * the caller can fall back to copying the HTTPS URL.
 */
export async function openCalendarSubscribe(): Promise<boolean> {
  const url = getCalendarSubscribeUrl()
  try {
    await Linking.openURL(url)
    return true
  } catch {
    return false
  }
}

const SIGN_PATH = '/api/cycle/calendar/sign'

/**
 * Pro 对你而言 feed. Asks the server to mint a signed webcal URL — the server
 * verifies cycle_pro via RevenueCat (using the RC app-user-id) before issuing an
 * HMAC-signed, opaque token URL — then opens the system Calendar subscribe. The
 * caller also gates on Pro + birth set for snappy UX; the server is the real gate.
 */
export async function openPersonalCalendarSubscribe(birthDate: string): Promise<boolean> {
  try {
    const appUserId = await Purchases.getAppUserID()
    const signUrl = `${resolvePortfolioApiUrl()}${SIGN_PATH}?birthDate=${encodeURIComponent(
      birthDate
    )}&u=${encodeURIComponent(appUserId)}`
    const res = await fetch(signUrl, { headers: { accept: 'application/json' } })
    if (!res.ok) return false
    const data = (await res.json()) as { url?: string }
    if (!data.url) return false
    await Linking.openURL(data.url)
    return true
  } catch {
    return false
  }
}
