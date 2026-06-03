/**
 * Auspice 亲友 → Kindred Bonds — frictionless carry-over after sign-in.
 *
 * The payoff of the login-at-subscribe identity: once the user has a portfolio
 * userId + deviceSecret, every 亲友 they recorded (lib/people.ts) can be POSTed
 * to `/api/bonds/solo` to seed the Kindred (Kindred) graph WITHOUT re-entering names /
 * birthdays / 时辰 / gender. The first time the user opens Kindred, the bonds are
 * already there.
 *
 * Idempotent — a `cycle.bonds.transferred` set tracks `AuspicePerson.id`s that
 * have already been pushed, so re-running this is safe (e.g. on each app open).
 * Skips people missing the data Kindred's `personBirthSchema` requires (time index
 * + gender). The user can edit them in /people and the next sweep picks them up.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { signedApiFetch } from '@zhop/satellite-runtime'
import type { AuspicePerson } from './people'

const TRANSFERRED_KEY = 'auspice.bonds.transferred'

async function getTransferred(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(TRANSFERRED_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

async function setTransferred(ids: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(TRANSFERRED_KEY, JSON.stringify([...ids]))
  } catch {}
}

/** True if the person has enough data for Kindred's `personBirthSchema`. */
function isYuanReady(p: AuspicePerson): boolean {
  // Year-unknown 亲友 carry a 0000 sentinel — skip; Kindred needs a real year.
  if (p.solarDate.startsWith('0000-')) return false
  if (p.timeIndex == null) return false
  if (p.gender !== '男' && p.gender !== '女') return false
  return true
}

/** Map a AuspicePerson to the `POST /api/bonds/solo` payload. */
function toSoloPayload(p: AuspicePerson, language: string): unknown {
  return {
    targetName: p.name,
    relationshipLabel: p.relation?.trim() || '亲友',
    targetBirth: {
      solarDate: p.solarDate,
      timeIndex: p.timeIndex,
      gender: p.gender,
      calendarType: p.calendar ?? 'solar',
      // Birthplace (optional) — lets the 合盘 apply 真太阳时 correction.
      ...(p.city ? { city: p.city } : {}),
      ...(typeof p.lat === 'number' ? { latitude: p.lat } : {}),
      ...(typeof p.lng === 'number' ? { longitude: p.lng } : {}),
      ...(p.timezone ? { timezoneId: p.timezone } : {}),
    },
    language,
  }
}

export interface TransferResult {
  /** How many people were eligible AND newly pushed in this run. */
  pushed: number
  /** People skipped because they're missing time/gender/year. */
  skipped: number
  /** People that previously succeeded — no-op this run. */
  alreadyTransferred: number
  /** Per-person failures (network / 4xx). */
  failed: number
}

/**
 * Push every eligible 亲友 to /api/bonds/solo, exactly once. No-op when the
 * caller hasn't yet signed in (signedApiFetch returns 401 without a session).
 * Safe to call repeatedly; on partial failure the next call retries the failed.
 */
export async function transferAuspicePeopleToBonds(
  people: ReadonlyArray<AuspicePerson>,
  language: string
): Promise<TransferResult> {
  const transferred = await getTransferred()
  let pushed = 0
  let skipped = 0
  let alreadyTransferred = 0
  let failed = 0

  for (const p of people) {
    if (transferred.has(p.id)) {
      alreadyTransferred++
      continue
    }
    if (!isYuanReady(p)) {
      skipped++
      continue
    }
    try {
      // signedFetch returns null on terminal failure (no auth, retries exhausted,
      // 4xx after retries). HMAC + Idempotency-Key handled inside the helper.
      const res = await signedApiFetch({
        method: 'POST',
        path: '/api/bonds/solo',
        body: toSoloPayload(p, language),
        idempotencyKey: `cycle-bonds-${p.id}`,
      })
      if (res && res.ok) {
        transferred.add(p.id)
        pushed++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  }

  if (pushed > 0) await setTransferred(transferred)
  return { pushed, skipped, alreadyTransferred, failed }
}
