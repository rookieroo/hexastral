/**
 * App-level widget/Watch App Group sync — route-agnostic so deep links into
 * /timeline or /me still refresh WidgetKit (HomeScreen is not required).
 */

import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus, Platform } from 'react-native'
import { fetchAuspiceDay } from '@/lib/api'
import { getAuspiceBirthDate } from '@/lib/birth'
import { getStrings, type Locale } from '@/lib/i18n'
import { provisionYuunWatch } from '@/lib/watch-provision'
import { syncTodayWidget } from '@/lib/widget-bridge'
import { resolveYijiDisplayMode } from '@/lib/yiji-display-mode'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function todayIsoString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

let lastSyncKey: string | null = null
let inFlight: Promise<void> | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Imperative sync — call after birth save/clear so Fit chrome updates without
 * waiting for the next AppState pulse.
 */
export function requestYuunWidgetSync(locale: Locale, force = false): void {
  if (Platform.OS !== 'ios') return
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void runYuunWidgetSync(locale, force)
  }, 1200)
}

async function runYuunWidgetSync(locale: Locale, force: boolean): Promise<void> {
  const today = todayIsoString()
  const yijiMode = await resolveYijiDisplayMode(locale)
  const key = `${locale}:${yijiMode}:${today}`
  if (!force && lastSyncKey === key && inFlight == null) return
  if (inFlight) {
    await inFlight
    if (!force && lastSyncKey === key) return
  }

  const work = (async () => {
    try {
      const birthDate = await getAuspiceBirthDate()
      const payload = await fetchAuspiceDay(today, birthDate ?? undefined)
      const t = getStrings(locale)
      await syncTodayWidget(
        today,
        payload.day,
        payload.personalization,
        t,
        locale,
        Boolean(payload.personalization)
      )
      lastSyncKey = key
      // Mint/push Watch bearer + prefs after App Group payload write.
      await provisionYuunWatch(locale).catch((err) => {
        console.warn('[yuun-widget-sync] watch provision failed:', err)
      })
    } catch (err) {
      console.warn('[yuun-widget-sync] failed:', err)
    }
  })()

  inFlight = work.finally(() => {
    if (inFlight === work) inFlight = null
  })
  await inFlight
}

/**
 * Mount once under RootLayoutInner. Syncs on mount, locale change, and when
 * the app returns to the foreground (midnight / multi-day background).
 */
export function useYuunWidgetSync(locale: Locale): void {
  const localeRef = useRef(locale)
  localeRef.current = locale

  useEffect(() => {
    if (Platform.OS !== 'ios') return
    requestYuunWidgetSync(locale, true)
  }, [locale])

  useEffect(() => {
    if (Platform.OS !== 'ios') return
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') requestYuunWidgetSync(localeRef.current, true)
    }
    const sub = AppState.addEventListener('change', onChange)
    return () => sub.remove()
  }, [])
}
