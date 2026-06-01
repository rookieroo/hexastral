/**
 * In-memory onboarding draft store.
 *
 * The 8-screen onboarding (welcome → name → date → time → place → mode → invite/fill → reveal)
 * accumulates inputs that are only POSTed at the end. Holding them in a tiny
 * Zustand-less store avoids prop-drilling through expo-router params.
 *
 * Persisted to AsyncStorage on each update so a backgrounded app preserves
 * progress; cleared after successful submission.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'

const DRAFT_KEY = 'yuan_onboarding_draft_v1'

export interface OnboardingDraft {
  /** A's name */
  selfName: string
  selfSolarDate: string // YYYY-MM-DD
  selfTimeIndex: number | null // 0..12, null = unknown
  selfBirthCity: string
  selfGender: '男' | '女' | null
  /** 'invite' = email B, 'fill' = A fills in B */
  otherMode: 'invite' | 'fill' | null
  // Mode 'invite'
  otherEmail: string
  // Mode 'fill'
  otherName: string
  otherSolarDate: string
  otherTimeIndex: number | null
  otherBirthCity: string
  otherGender: '男' | '女' | null
  // Both modes
  relationshipLabel: string
  message: string
}

const EMPTY: OnboardingDraft = {
  selfName: '',
  selfSolarDate: '',
  selfTimeIndex: null,
  selfBirthCity: '',
  selfGender: null,
  otherMode: null,
  otherEmail: '',
  otherName: '',
  otherSolarDate: '',
  otherTimeIndex: null,
  otherBirthCity: '',
  otherGender: null,
  relationshipLabel: '',
  message: '',
}

const subscribers = new Set<(d: OnboardingDraft) => void>()
let current: OnboardingDraft = EMPTY
let hydrated = false

async function hydrate(): Promise<void> {
  if (hydrated) return
  hydrated = true
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    if (raw) {
      current = { ...EMPTY, ...(JSON.parse(raw) as Partial<OnboardingDraft>) }
      for (const sub of subscribers) sub(current)
    }
  } catch (err) {
    if (__DEV__) console.error('[yuan-app draft hydrate]', err)
  }
}

export function updateDraft(patch: Partial<OnboardingDraft>): void {
  current = { ...current, ...patch }
  for (const sub of subscribers) sub(current)
  void AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(current))
}

export function getDraft(): OnboardingDraft {
  return current
}

export async function clearDraft(): Promise<void> {
  current = EMPTY
  for (const sub of subscribers) sub(current)
  await AsyncStorage.removeItem(DRAFT_KEY)
}

export function useDraft(): OnboardingDraft {
  const [draft, setDraft] = useState<OnboardingDraft>(current)
  useEffect(() => {
    void hydrate()
    subscribers.add(setDraft)
    return () => {
      subscribers.delete(setDraft)
    }
  }, [])
  return draft
}
