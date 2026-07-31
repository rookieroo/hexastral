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
 *
 * K2: also synced to the server (PUT /api/user/:userId/birth-info) — the
 * bonds/合盘 API reads person A's birth from the users table, so Threads
 * cannot work until that sync has succeeded at least once.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'
import { config } from './config'
import { signRequest } from './hmac'

const SELF_BIRTH_KEY = 'kindred_self_birth_v1'
const SELF_BIRTH_SYNCED_KEY = 'kindred_self_birth_synced_v1'

export interface SelfBirth {
  solarDate: string // YYYY-MM-DD
  /** 时辰 index 0..12; null = unknown (charts fall back to 子时, index 0). */
  timeIndex: number | null
  /** Precise birth clock, minutes since midnight 0..1439. Present = precise mode
   *  (enables 真太阳时 calibration); absent = 时辰 mode only. */
  clockMinutes?: number
  /** 真太阳时 calibration toggle (precise mode only). undefined/true = on. */
  calibrate?: boolean
  gender: '男' | '女'
  city?: string
  lat?: number
  lng?: number
  timezone?: string
}

let cached: SelfBirth | null | undefined
const subscribers = new Set<(b: SelfBirth | null) => void>()

function notifySubscribers(birth: SelfBirth | null): void {
  for (const sub of subscribers) sub(birth)
}

export async function saveSelfBirth(birth: SelfBirth): Promise<void> {
  cached = birth
  notifySubscribers(birth)
  await AsyncStorage.setItem(SELF_BIRTH_KEY, JSON.stringify(birth))
  // Any change invalidates the server-sync marker (re-sync on next attempt).
  await AsyncStorage.removeItem(SELF_BIRTH_SYNCED_KEY)
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
  notifySubscribers(null)
  await AsyncStorage.multiRemove([SELF_BIRTH_KEY, SELF_BIRTH_SYNCED_KEY])
}

/**
 * useSelfBirth — undefined while loading, null when never saved, else the
 * stored birth info. Re-renders when save/clear runs (account delete included).
 */
export function useSelfBirth(): SelfBirth | null | undefined {
  const [birth, setBirth] = useState<SelfBirth | null | undefined>(cached)
  useEffect(() => {
    let cancelled = false
    void loadSelfBirth().then((b) => {
      if (!cancelled) setBirth(b)
    })
    const sub = (b: SelfBirth | null) => {
      if (!cancelled) setBirth(b)
    }
    subscribers.add(sub)
    return () => {
      cancelled = true
      subscribers.delete(sub)
    }
  }, [])
  return birth
}

/* ── Server sync (K2 — Threads prerequisite) ────────────────────────────── */

/**
 * Push the self birth to the server: PUT /api/user/:userId/birth-info
 * (HMAC v2 signed, same pattern as lib/user-api.ts).
 *
 * Server semantics: first-ever add is free; an unchanged resubmit is a no-op;
 * a chart-altering edit consumes the free user's single lifetime correction
 * (403 BIRTH_EDIT_QUOTA_EXHAUSTED after that). The endpoint also rebuilds the
 * server-side natal chart, which doubles as the solo report bootstrap.
 *
 * Failures are non-fatal: the solo reading works fully offline; Threads
 * re-attempts via ensureSelfBirthSynced() before bond creation.
 *
 * Returns a status so the EDIT flow can react: 'quota_exhausted' (free user's
 * 2nd chart-altering edit → server 403 BIRTH_EDIT_QUOTA_EXHAUSTED) routes the
 * caller to the paywall; first-add and unchanged resubmits always return 'ok'.
 */
export type BirthSyncResult = 'ok' | 'quota_exhausted' | 'error'

export async function syncSelfBirthToServer(
  userId: string,
  birth: SelfBirth
): Promise<BirthSyncResult> {
  const path = `/api/user/${userId}/birth-info`
  const body = JSON.stringify({
    birthSolarDate: birth.solarDate,
    birthTimeIndex: birth.timeIndex ?? 0,
    birthGender: birth.gender,
    ...(birth.city ? { birthCity: birth.city } : {}),
    ...(birth.lng != null ? { birthLongitude: String(birth.lng) } : {}),
    // birthLatitude intentionally NOT sent. Kindred launches North America +
    // Southeast Asia only and treats every birth as northern-hemisphere, so the
    // server never applies 南半球月令置换 (contested in 命理, and a design/friction
    // cost we're not taking). 真太阳时 calibration only needs longitude + timezone,
    // so omitting latitude costs the chart nothing. lat is still captured by the
    // city picker for its own round-trip display — it just isn't persisted.
    ...(birth.timezone ? { birthTimezoneId: birth.timezone } : {}),
    ...(birth.clockMinutes != null ? { birthClockMinutes: birth.clockMinutes } : {}),
    ...(birth.calibrate != null ? { birthSolarCalibrate: birth.calibrate } : {}),
  })
  try {
    const sig = await signRequest({ method: 'PUT', path, body, userId })
    if (!sig) return 'error'
    const res = await fetch(`${config.apiUrl}${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userId}`,
        ...sig,
      },
      body,
    })
    if (res.ok) {
      await AsyncStorage.setItem(SELF_BIRTH_SYNCED_KEY, '1')
      return 'ok'
    }
    if (res.status === 403) return 'quota_exhausted'
    return 'error'
  } catch {
    return 'error'
  }
}

/**
 * True when local self birth is complete enough to create bonds / invite.
 * Matches server gate: solarDate + gender + timeIndex (null unknown → synced as 0).
 */
export function isSelfBirthReady(birth: SelfBirth | null | undefined): boolean {
  if (!birth?.solarDate) return false
  if (birth.gender !== '男' && birth.gender !== '女') return false
  // Must have an explicit hour choice (0..12) or unknown (null). Missing field ≠ ready.
  if (!('timeIndex' in birth)) return false
  return true
}

/**
 * Ensure local + server birth before invite / mode. Returns false after redirecting
 * to the self form when anything is missing or sync fails.
 */
export async function ensureSelfBirthForBonds(
  userId: string | null | undefined,
  redirect: (next: 'mode' | 'invite') => void,
  next: 'mode' | 'invite'
): Promise<boolean> {
  const birth = await loadSelfBirth()
  if (!isSelfBirthReady(birth) || !birth) {
    redirect(next)
    return false
  }
  if (!userId) {
    redirect(next)
    return false
  }
  // Always push (idempotent on server) — don't trust a stale local "synced" flag
  // after account wipe / re-provision.
  const result = await syncSelfBirthToServer(userId, birth)
  if (result === 'ok') return true
  redirect(next)
  return false
}

/**
 * Ensure the server has the self birth (no-op when already synced). Called
 * before entering the Threads creation flows so bond creation never hits
 * "Complete your birth info before creating bonds".
 */
export async function ensureSelfBirthSynced(userId: string): Promise<boolean> {
  try {
    const synced = await AsyncStorage.getItem(SELF_BIRTH_SYNCED_KEY)
    if (synced) return true
  } catch {
    // fall through to re-sync
  }
  const birth = await loadSelfBirth()
  if (!birth) return false
  return (await syncSelfBirthToServer(userId, birth)) === 'ok'
}
