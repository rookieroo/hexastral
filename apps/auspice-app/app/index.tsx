/**
 * Entry — Auspice is anonymous-first (ADR-0010 Tier 3): no sign-in gate, no
 * onboarding WALL. The only first-launch step is a light, skippable welcome
 * (app/welcome.tsx) that orients a first-time user; returning users boot
 * straight into Today. The almanac is never blocked behind it.
 */

import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { hasSeenOnboarding } from '@/lib/onboarding-seen'

export default function EntryScreen() {
  // null = still reading the flag (render nothing — a frame or two, the native
  // splash still covers it); true/false = decided.
  const [seen, setSeen] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    void hasSeenOnboarding().then((v) => {
      if (!cancelled) setSeen(v)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (seen === null) return null
  return <Redirect href={seen ? '/(tabs)' : '/welcome'} />
}
