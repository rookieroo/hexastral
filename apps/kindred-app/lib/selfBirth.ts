/**
 * Persistent self birth info — the seed for the solo reading (ADR-0021 K1).
 *
 * The onboarding draft (onboardingDraft.ts) is cleared once onboarding
 * completes, but the solo 八字/紫微 reading needs the user's own birth data
 * for as long as the app is installed: charts compute client-side from it
 * (ming-pan pattern) and its hash keys the LLM chapter cache.
 *
 * Saved exactly once at onboarding completion (self.tsx) and refreshed if the
 * user re-runs the self form later; read by the (reading) home.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'

const SELF_BIRTH_KEY = 'kindred_self_birth_v1'

export interface SelfBirth {
  solarDate: string // YYYY-MM-DD
  /** 时辰 index 0..12; null = unknown (charts fall back to 午时). */
  timeIndex: number | null
  gender: '男' | '女'
  city?: string
  lat?: number
  lng?: number
  timezone?: string
}

let cached: SelfBirth | null | undefined

export async function saveSelfBirth(birth: SelfBirth): Promise<void> {
  cached = birth
  await AsyncStorage.setItem(SELF_BIRTH_KEY, JSON.stringify(birth))
}

export async function loadSelfBirth(): Promise<SelfBirth | null> {
  if (cached !== undefined) return cached
  try {
    const raw = await AsyncStorage.getItem(SELF_BIRTH_KEY)
    cached = raw ? (JSON.parse(raw) as SelfBirth) : null
  } catch {
    cached = null
  }
  return cached
}

export async function clearSelfBirth(): Promise<void> {
  cached = null
  await AsyncStorage.removeItem(SELF_BIRTH_KEY)
}

/**
 * useSelfBirth — undefined while loading, null when never saved, else the
 * stored birth info.
 */
export function useSelfBirth(): SelfBirth | null | undefined {
  const [birth, setBirth] = useState<SelfBirth | null | undefined>(cached)
  useEffect(() => {
    let cancelled = false
    void loadSelfBirth().then((b) => {
      if (!cancelled) setBirth(b)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return birth
}
