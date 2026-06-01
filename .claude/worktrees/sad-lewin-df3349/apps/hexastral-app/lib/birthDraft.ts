/**
 * Birth-info onboarding draft (Phase C.1).
 *
 * The 5-step "form-as-conversation" flow (intro → date → time → gender → place
 * → review) accumulates inputs across screens before the single PUT to
 * `/api/user/:userId/birth-info` happens on the review screen. Holding the
 * inputs in a tiny in-memory + AsyncStorage store avoids prop-drilling through
 * expo-router params and survives a backgrounded app.
 *
 * Cleared after a successful submit. Intentionally kept independent of
 * `lib/domain/birthInfo` (which is the persisted, authoritative cached copy)
 * because draft state is only meaningful while the user is mid-flow.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'

const DRAFT_KEY = 'hexastral_birth_draft_v1'

export interface BirthDraft {
  /** YYYY-M-D — matches existing birthInfo.solarDate shape. */
  solarDate: string
  /** 0..11 shichen index, null = unknown. */
  timeIndex: number | null
  /** Required by hexastral-api `/api/onboarding/bootstrap` validation. */
  gender: '男' | '女' | null
  /** Free-text city as displayed; coordinates resolved on selection. */
  birthCity: string
  latitude: number | null
  longitude: number | null
  timezoneId: string | null
}

const EMPTY: BirthDraft = {
  solarDate: '',
  timeIndex: null,
  gender: null,
  birthCity: '',
  latitude: null,
  longitude: null,
  timezoneId: null,
}

const subscribers = new Set<(d: BirthDraft) => void>()
let current: BirthDraft = EMPTY
let hydrated = false

async function hydrate(): Promise<void> {
  if (hydrated) return
  hydrated = true
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    if (raw) {
      current = { ...EMPTY, ...(JSON.parse(raw) as Partial<BirthDraft>) }
      for (const sub of subscribers) sub(current)
    }
  } catch (err) {
    if (__DEV__) console.error('[hexastral-app birthDraft hydrate]', err)
  }
}

export function updateBirthDraft(patch: Partial<BirthDraft>): void {
  current = { ...current, ...patch }
  for (const sub of subscribers) sub(current)
  void AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(current))
}

export function getBirthDraft(): BirthDraft {
  return current
}

export async function clearBirthDraft(): Promise<void> {
  current = EMPTY
  for (const sub of subscribers) sub(current)
  await AsyncStorage.removeItem(DRAFT_KEY)
}

export function useBirthDraft(): BirthDraft {
  const [draft, setDraft] = useState<BirthDraft>(current)
  useEffect(() => {
    void hydrate()
    subscribers.add(setDraft)
    return () => {
      subscribers.delete(setDraft)
    }
  }, [])
  return draft
}

/**
 * Seed the draft from the user's already-saved birth-info (if any) so they
 * see their current values when re-entering the flow to edit.
 */
export function seedBirthDraftFrom(info: {
  solarDate?: string
  timeIndex?: number | null
  gender?: '男' | '女' | null
  birthCity?: string
  latitude?: number | null
  longitude?: number | null
  timezoneId?: string | null
}): void {
  updateBirthDraft({
    solarDate: info.solarDate ?? current.solarDate,
    timeIndex: info.timeIndex ?? current.timeIndex,
    gender: info.gender ?? current.gender,
    birthCity: info.birthCity ?? current.birthCity,
    latitude: info.latitude ?? current.latitude,
    longitude: info.longitude ?? current.longitude,
    timezoneId: info.timezoneId ?? current.timezoneId,
  })
}
