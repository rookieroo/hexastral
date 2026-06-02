/**
 * Compose deep-link handler — receives a pre-filled person hand-off from
 * sibling apps (cycle today; others later) and hydrates the onboarding
 * draft so the user doesn't re-type. Contract defined in
 * `apps/auspice-app/lib/kindred-handoff.ts` v1.
 *
 *   yuan://compose?v=1&from=cycle&mode=pair|fill
 *     &self_date=...&self_time=...&self_gender=...&self_city=...
 *     &self_lat=...&self_lng=...&self_tz=...
 *     &other_name=...&other_date=...&other_time=...&other_gender=...
 *     &rel=...
 *
 * Unknown query params are ignored (forward-compat). Missing fields fall
 * back to the draft's existing values (which is `EMPTY` on first launch).
 */

import * as Linking from 'expo-linking'
import { type OnboardingDraft, updateDraft } from './onboardingDraft'

type Gender = '男' | '女'

function parseGender(raw: unknown): Gender | null {
  return raw === '男' || raw === '女' ? raw : null
}

/** Parses an integer in [0, 11]; returns null otherwise. Time index domain. */
function parseTimeIndex(raw: unknown): number | null {
  if (typeof raw !== 'string') return null
  const n = Number.parseInt(raw, 10)
  return Number.isInteger(n) && n >= 0 && n <= 11 ? n : null
}

function parseFloatLike(raw: unknown): number | null {
  if (typeof raw !== 'string') return null
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : null
}

/** YYYY-MM-DD shape check — same gate as cycle's `isValidBirthDate`. */
function parseDate(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null
}

function parseStr(raw: unknown): string | null {
  return typeof raw === 'string' && raw.length > 0 ? raw : null
}

/**
 * Parses a `yuan://compose?...` URL into a partial draft. Returns null if
 * the URL isn't a compose link or carries no usable fields.
 */
export function parseComposeUrl(url: string): Partial<OnboardingDraft> | null {
  let parsed: Linking.ParsedURL
  try {
    parsed = Linking.parse(url)
  } catch {
    return null
  }
  // expo-linking lands the path/host inconsistently across iOS/Android — accept either.
  const isCompose = parsed.hostname === 'compose' || parsed.path === 'compose'
  if (!isCompose) return null

  const q = parsed.queryParams ?? {}
  const patch: Partial<OnboardingDraft> = {}

  // Self block
  const selfDate = parseDate(q.self_date)
  if (selfDate) {
    patch.selfSolarDate = selfDate
    const t = parseTimeIndex(q.self_time)
    if (t !== null) patch.selfTimeIndex = t
    const g = parseGender(q.self_gender)
    if (g) patch.selfGender = g
    const city = parseStr(q.self_city)
    if (city) patch.selfBirthCity = city
    const lat = parseFloatLike(q.self_lat)
    if (lat !== null) patch.selfBirthLat = lat
    const lng = parseFloatLike(q.self_lng)
    if (lng !== null) patch.selfBirthLng = lng
    const tz = parseStr(q.self_tz)
    if (tz) patch.selfBirthTimezone = tz
  }

  // Other block — assume 'fill' mode (A fills B's info) since sibling apps
  // own the data; the 'invite' mode is reserved for the in-yuán invite-email flow.
  const otherDate = parseDate(q.other_date)
  if (otherDate) {
    patch.otherMode = 'fill'
    patch.otherSolarDate = otherDate
    const name = parseStr(q.other_name)
    if (name) patch.otherName = name
    const t = parseTimeIndex(q.other_time)
    if (t !== null) patch.otherTimeIndex = t
    const g = parseGender(q.other_gender)
    if (g) patch.otherGender = g
  }

  const rel = parseStr(q.rel)
  if (rel) patch.relationshipLabel = rel

  return Object.keys(patch).length ? patch : null
}

/** Apply a parsed compose payload to the draft store. */
export function applyComposeToDraft(patch: Partial<OnboardingDraft>): void {
  updateDraft(patch)
}

/** Convenience: parse + apply in one call. Returns true if anything applied. */
export function captureCompose(url: string | null): boolean {
  if (!url) return false
  const patch = parseComposeUrl(url)
  if (!patch) return false
  applyComposeToDraft(patch)
  return true
}
