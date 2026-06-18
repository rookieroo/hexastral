/**
 * Kindred entry — decides where the user lands on app open.
 *
 * - Onboarding NOT done (first launch OR a half-finished flow) → /(onboarding)/intro,
 *   a calm Logo first-screen that taps into the onboarding form. (The elaborate
 *   two-stars intro was retired 2026-06 — see git history / IntroLogo.)
 * - Onboarding done — or a saved self-birth (notably an invited B who accepted via
 *   /accept, which persists their birth) → /(reading), the home. The solo reading IS
 *   the home; Threads hang off it.
 *
 * No more "intro seen" flag: the Logo splash is cheap (a moon + a tap), so it just
 * shows on every not-done launch. Use `resetOnboarding()` (DEV, in Settings) to drop
 * back to it.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { kindredDark } from '@zhop/hexastral-tokens/kindred'
import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { loadSelfBirth } from '@/lib/selfBirth'

const ONBOARDING_DONE_KEY = 'yuan_onboarding_complete_v1'

type EntryStatus = 'pending' | 'splash' | 'returning'

export default function EntryScreen() {
  const [status, setStatus] = useState<EntryStatus>('pending')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [done, selfBirth] = await Promise.all([
          AsyncStorage.getItem(ONBOARDING_DONE_KEY),
          loadSelfBirth(),
        ])
        if (cancelled) return
        // A saved self-birth means the user already has a chart — treat as returning
        // so they land on the home and are never bounced back to the splash. Backfill
        // the flag so reality + flag agree.
        if (done || selfBirth) {
          if (!done) void markOnboardingComplete()
          setStatus('returning')
        } else {
          setStatus('splash')
        }
      } catch {
        if (!cancelled) setStatus('splash')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // While the AsyncStorage probes resolve, paint the kindred bg only — the check
  // completes in a frame or two, and the splash / home own their own entrances.
  if (status === 'pending') {
    return <View style={{ flex: 1, backgroundColor: kindredDark.bg }} />
  }
  if (status === 'splash') return <Redirect href='/(onboarding)/intro' />
  return <Redirect href='/(reading)' />
}

export async function markOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_DONE_KEY, '1')
}

/** Whether first-run onboarding has finished (self.tsx forks its submit on this). */
export async function isOnboardingComplete(): Promise<boolean> {
  return (await AsyncStorage.getItem(ONBOARDING_DONE_KEY)) != null
}

/** DEV-only: wipe the done flag so the Logo splash + onboarding replay. */
export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_DONE_KEY)
}
