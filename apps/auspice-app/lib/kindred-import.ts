/**
 * Kindred → Auspice import — receive a person handed off from Kindred.
 *
 * The reverse of lib/kindred-handoff.ts. Kindred opens `yuun://compose?...`
 * to push a bond's person into the 亲友 list (for birthday reminders + the 关系
 * read). Same universe identity, opposite direction; the contract mirrors
 * Kindred's own composeLink receiver (other_* fields + rel).
 *
 *   yuun://compose?v=1&from=kindred
 *     &other_name=<enc>&other_date=YYYY-MM-DD&other_time=N
 *     &other_gender=男|女&other_city=<enc>&rel=<enc>
 *
 * Lunar dates are not shipped across the hand-off (Kindred's draft is solar);
 * a missing/invalid date returns null so nothing is added.
 */

import * as Linking from 'expo-linking'
import type { AddPersonInput, PersonGender } from './people'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function str(raw: unknown): string | undefined {
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined
}

function gender(raw: unknown): PersonGender | undefined {
  return raw === '男' || raw === '女' ? raw : undefined
}

function timeIndex(raw: unknown): number | null {
  if (typeof raw !== 'string') return null
  const n = Number.parseInt(raw, 10)
  return Number.isInteger(n) && n >= 0 && n <= 11 ? n : null
}

/** Parse an `yuun://compose?...` hand-off into an AddPersonInput, or null. */
export function parseKindredComposeUrl(url: string): AddPersonInput | null {
  let parsed: Linking.ParsedURL
  try {
    parsed = Linking.parse(url)
  } catch {
    return null
  }
  // expo-linking lands the path/host inconsistently across platforms.
  const isCompose = parsed.hostname === 'compose' || parsed.path === 'compose'
  if (!isCompose) return null

  const q = parsed.queryParams ?? {}
  const date = str(q.other_date)
  if (!date || !DATE_RE.test(date)) return null

  return {
    name: str(q.other_name) ?? '亲友',
    solarDate: date,
    calendar: 'solar',
    timeIndex: timeIndex(q.other_time),
    gender: gender(q.other_gender),
    city: str(q.other_city),
    relation: str(q.rel),
  }
}
