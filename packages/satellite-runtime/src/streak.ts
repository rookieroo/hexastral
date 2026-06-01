/**
 * Streak / return-day mechanic · matrix-wide retention primitive.
 *
 * Why this exists (P1-18): "you've consulted your chart X days in a row"
 * is one of the most-proven retention patterns (Duolingo / Co-Star / iOS
 * Health rings). Implementing it once in satellite-runtime means each of
 * the 8 apps gets it with a 1-line call.
 *
 * Storage: AsyncStorage, per-app namespace. Each app's streak is
 * independent — opening fate doesn't extend cycle's streak.
 *
 * Encoding: an array of recent "open day" ISO date strings (YYYY-MM-DD).
 * We bound the array to STREAK_HISTORY_DAYS so storage stays small
 * (~3 KB max). Bitmap or compact encoding would save bytes but obscures
 * debugging; the array is plenty for a year of opens.
 *
 * API:
 *   - recordTodayOpen({ app }) — call once per app launch. Idempotent
 *     within the same calendar day (re-calling on the same day is a
 *     no-op).
 *   - getStreakState({ app }) — returns
 *     { currentStreak, longestStreak, last7Mask, lastOpenDate }.
 *
 * Day-boundary policy: uses LOCAL date (not UTC). User in JST opening at
 * 23:30 → counts that JST day. Going 25 hours without opening always
 * breaks streak; opening twice in 25 hours always preserves.
 *
 * Future: server-side streak (cross-device) would require pushing this
 * to a `user_activity` table and syncing on launch. For now device-local
 * is the right ROI.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const STREAK_HISTORY_DAYS = 365

interface StreakStateInput {
  /** App namespace ('fate' / 'cycle' / 'yuan' / 'feng'). */
  app: string
}

export interface StreakState {
  /** Consecutive calendar days including today (0 if today hasn't been recorded yet). */
  currentStreak: number
  /** All-time best streak observed on this device. */
  longestStreak: number
  /** Mask of the last 7 days (oldest first, today last) — for ring/pill UI. */
  last7Mask: readonly boolean[]
  /** ISO date YYYY-MM-DD of the most recent recorded open; null if none yet. */
  lastOpenDate: string | null
}

interface StoredShape {
  history: string[]
  longestStreak: number
}

function storageKey(app: string): string {
  return `@hexastral/${app}/streak`
}

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function daysBetween(aIso: string, bIso: string): number {
  // Both are YYYY-MM-DD — parse as midnight local. Math is timezone-stable
  // because both are local-midnight epochs.
  const a = new Date(`${aIso}T00:00:00`)
  const b = new Date(`${bIso}T00:00:00`)
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

async function load(app: string): Promise<StoredShape> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(app))
    if (!raw) return { history: [], longestStreak: 0 }
    const parsed = JSON.parse(raw) as Partial<StoredShape>
    return {
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, STREAK_HISTORY_DAYS) : [],
      longestStreak: typeof parsed.longestStreak === 'number' ? parsed.longestStreak : 0,
    }
  } catch {
    return { history: [], longestStreak: 0 }
  }
}

async function persist(app: string, data: StoredShape): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(app), JSON.stringify(data))
  } catch {
    // Swallow — memory state for this session still works.
  }
}

function computeCurrentStreak(history: readonly string[]): number {
  if (history.length === 0) return 0
  // history is stored newest-first. Walk backward day-by-day starting from
  // today; streak ends when we hit a gap.
  const today = todayISO()
  let streak = 0
  let expected = today
  for (const day of history) {
    if (day === expected) {
      streak++
      // Move expected to previous day
      const prev = new Date(`${expected}T00:00:00`)
      prev.setDate(prev.getDate() - 1)
      expected = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`
      continue
    }
    if (streak === 0 && daysBetween(day, today) === 1) {
      // No open today yet — start from yesterday.
      streak++
      const prev = new Date(`${day}T00:00:00`)
      prev.setDate(prev.getDate() - 1)
      expected = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`
      continue
    }
    break
  }
  return streak
}

function computeLast7Mask(history: readonly string[]): boolean[] {
  const today = todayISO()
  const set = new Set(history)
  const mask: boolean[] = []
  // Oldest first — 6 days ago through today.
  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(`${today}T00:00:00`)
    d.setDate(d.getDate() - offset)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    mask.push(set.has(iso))
  }
  return mask
}

/**
 * Record that the user opened this app today. Idempotent within the same
 * day. Returns the post-update streak state (callers commonly want to
 * display "X-day streak" pills immediately after).
 */
export async function recordTodayOpen(input: StreakStateInput): Promise<StreakState> {
  const today = todayISO()
  const stored = await load(input.app)
  let history = [...stored.history]

  if (history[0] !== today) {
    history = [today, ...history].slice(0, STREAK_HISTORY_DAYS)
  }

  const currentStreak = computeCurrentStreak(history)
  const longestStreak = Math.max(stored.longestStreak, currentStreak)

  await persist(input.app, { history, longestStreak })

  return {
    currentStreak,
    longestStreak,
    last7Mask: computeLast7Mask(history),
    lastOpenDate: history[0] ?? null,
  }
}

/**
 * Read the current streak state without recording an open. Useful for
 * displaying "X-day streak" on screens where you don't want to bump the
 * counter (e.g. a Me-tab stats card after the home already recorded).
 */
export async function getStreakState(input: StreakStateInput): Promise<StreakState> {
  const stored = await load(input.app)
  return {
    currentStreak: computeCurrentStreak(stored.history),
    longestStreak: stored.longestStreak,
    last7Mask: computeLast7Mask(stored.history),
    lastOpenDate: stored.history[0] ?? null,
  }
}
