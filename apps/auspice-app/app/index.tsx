/**
 * Entry — Yuun is anonymous-first: no sign-in gate. First launch shows a light,
 * skippable welcome; returning users boot straight into Today.
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
