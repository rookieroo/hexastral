import AsyncStorage from '@react-native-async-storage/async-storage'

/** Minimum minutes between completed readings (cooldown). */
export const COOLDOWN_MINUTES = 5

const KEY_FIRST_ACK = 'coincast_first_ritual_ack_v1'
const KEY_LAST_DONE_AT = 'coincast_last_reading_done_at'
const KEY_LAST_Q = 'coincast_last_reading_question_norm'
const KEY_MOTION = 'coincast_motion_shake_enabled'
const KEY_RECENT_QUESTIONS = 'coincast_recent_questions_v1'

const RECENT_QUESTIONS_MAX = 5
const DUPLICATE_QUESTION_WINDOW_MS = 24 * 60 * 60 * 1000

type RecentQuestion = { q: string; at: number }

function parseRecentList(raw: string | null): RecentQuestion[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const out: RecentQuestion[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const rec = item as Record<string, unknown>
      const q = rec.q
      const at = rec.at
      if (typeof q === 'string' && typeof at === 'number' && Number.isFinite(at)) {
        out.push({ q, at })
      }
    }
    return out
  } catch (err) {
    console.warn('[coincast-ritual] parse recent questions failed', err)
    return []
  }
}

async function loadRecentQuestions(): Promise<RecentQuestion[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_RECENT_QUESTIONS)
    return parseRecentList(raw)
  } catch (err) {
    console.warn('[coincast-ritual] read recent questions failed', err)
    return []
  }
}

async function saveRecentQuestions(list: RecentQuestion[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_RECENT_QUESTIONS, JSON.stringify(list))
  } catch (err) {
    console.warn('[coincast-ritual] write recent questions failed', err)
  }
}

/** True if the same normalized question was stored within the last 24h. */
export async function checkDuplicateQuestion(normalized: string): Promise<boolean> {
  if (normalized.length < 2) return false
  const now = Date.now()
  const list = await loadRecentQuestions()
  const fresh = list.filter((x) => now - x.at < DUPLICATE_QUESTION_WINDOW_MS)
  return fresh.some((x) => x.q === normalized)
}

/** Remember a completed reading question for local duplicate detection (max 5 entries). */
export async function rememberRecentQuestion(normalized: string): Promise<void> {
  if (normalized.length < 2) return
  const now = Date.now()
  const prev = await loadRecentQuestions()
  const fresh = prev.filter((x) => now - x.at < DUPLICATE_QUESTION_WINDOW_MS)
  const next = [{ q: normalized, at: now }, ...fresh.filter((x) => x.q !== normalized)].slice(
    0,
    RECENT_QUESTIONS_MAX
  )
  await saveRecentQuestions(next)
}

export function normalizeQuestion(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function getFirstRitualAcknowledged(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY_FIRST_ACK)) === 'true'
  } catch (err) {
    console.warn('[coincast-ritual] read first ack failed', err)
    return false
  }
}

export async function setFirstRitualAcknowledged(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_FIRST_ACK, 'true')
  } catch (err) {
    console.warn('[coincast-ritual] write first ack failed', err)
  }
}

export async function getMotionShakeEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY_MOTION)
    if (v === 'false') return false
    return true
  } catch (err) {
    console.warn('[coincast-ritual] read motion failed', err)
    return true
  }
}

export async function setMotionShakeEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_MOTION, enabled ? 'true' : 'false')
  } catch (err) {
    console.warn('[coincast-ritual] write motion failed', err)
  }
}

export async function getLastReadingMeta(): Promise<{ at: number; questionNorm: string } | null> {
  try {
    const atRaw = await AsyncStorage.getItem(KEY_LAST_DONE_AT)
    const q = await AsyncStorage.getItem(KEY_LAST_Q)
    if (!atRaw || !q) return null
    const at = Number.parseInt(atRaw, 10)
    if (!Number.isFinite(at)) return null
    return { at, questionNorm: q }
  } catch (err) {
    console.warn('[coincast-ritual] read last meta failed', err)
    return null
  }
}

export async function recordReadingCompleted(questionNorm: string): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [KEY_LAST_DONE_AT, String(Date.now())],
      [KEY_LAST_Q, questionNorm],
    ])
  } catch (err) {
    console.warn('[coincast-ritual] write last meta failed', err)
  }
}

export function cooldownRemainingMs(lastDoneAt: number): number {
  const windowMs = COOLDOWN_MINUTES * 60 * 1000
  const end = lastDoneAt + windowMs
  return Math.max(0, end - Date.now())
}

/** Removes first-cast ack, cooldown meta, and motion preference (dev / QA). */
export async function wipeCoinCastRitualPrefsForDev(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      KEY_FIRST_ACK,
      KEY_LAST_DONE_AT,
      KEY_LAST_Q,
      KEY_MOTION,
      KEY_RECENT_QUESTIONS,
    ])
  } catch (err) {
    console.warn('[coincast-ritual] dev wipe failed', err)
  }
}
