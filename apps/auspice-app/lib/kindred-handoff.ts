/**
 * Auspice → Kindred person hand-off.
 *
 * Auspice owns the lightweight 亲友 contact (name + birthday for push). When
 * the user wants a *deep* 合盘 reading on a 亲友, we open Kindred with both
 * birth blocks pre-filled so they don't re-type. App-Store fallback on
 * unverified installs.
 *
 * URL contract (v1) — Kindred must parse the same shape on the receiving end:
 *
 *   yuan://compose?v=1&from=cycle&mode=pair
 *     &self_date=YYYY-MM-DD&self_time=N&self_gender=男|女
 *     &self_city=<url-encoded>&self_lat=<f>&self_lng=<f>&self_tz=<IANA>
 *     &other_name=<url-encoded>&other_date=YYYY-MM-DD
 *     &other_time=N&other_gender=男|女
 *     &rel=<url-encoded>
 *
 *   - `mode=pair` ships both blocks; `mode=fill` ships only `other_*` (self
 *     block omitted when the cycle user has no birth on record).
 *   - All `other_*`/`self_*` fields are independently optional except the
 *     date — Kindred's draft already accepts missing time/gender/city.
 *   - 农历 calendars are NOT shipped: Kindred's draft is solar-only. Lunar
 *     entries on the cycle side are dropped from the hand-off (we expose a
 *     small UI affordance for that case in the caller).
 */

import { Linking } from 'react-native'
import type { AuspiceBirthInfo } from './birth'
import { FLAGSHIP_LINKS } from './config'
import type { AuspicePerson } from './people'

/** Kindred's URL scheme — fixed once at hand-off contract v1. */
const YUAN_SCHEME = 'yuan://'

interface BuildArgs {
  person: AuspicePerson
  self: AuspiceBirthInfo | null
  relationshipLabel?: string
}

function append(params: URLSearchParams, key: string, value: string | number | null | undefined) {
  if (value === null || value === undefined) return
  const str = String(value)
  if (!str.length) return
  params.set(key, str)
}

/** Build the `yuan://compose?...` deep link for a cycle → yuán hand-off. */
export function buildKindredComposeUrl({ person, self, relationshipLabel }: BuildArgs): string {
  const p = new URLSearchParams()
  p.set('v', '1')
  p.set('from', 'cycle')

  // Self block (cycle user's own birth) — omitted entirely when not on file.
  const hasSelf = self?.solarDate && self.solarDate.length === 10
  if (hasSelf) {
    append(p, 'self_date', self.solarDate)
    if (self?.timeIndex !== null && self?.timeIndex !== undefined) {
      append(p, 'self_time', self.timeIndex)
    }
    append(p, 'self_gender', self?.gender)
    append(p, 'self_city', self?.city)
    append(p, 'self_lat', self?.lat)
    append(p, 'self_lng', self?.lng)
    append(p, 'self_tz', self?.timezone)
  }

  // Other block (the cycle 亲友). Lunar dates are dropped — yuán's draft is
  // solar-only; callers should warn the user before opening when calendar = 'lunar'.
  const otherIsSolar = !person.calendar || person.calendar === 'solar'
  if (otherIsSolar) {
    append(p, 'other_name', person.name)
    append(p, 'other_date', person.solarDate)
    if (person.timeIndex !== null && person.timeIndex !== undefined) {
      append(p, 'other_time', person.timeIndex)
    }
    append(p, 'other_gender', person.gender)
  }
  append(p, 'rel', relationshipLabel)

  p.set('mode', hasSelf ? 'pair' : 'fill')
  return `${YUAN_SCHEME}compose?${p.toString()}`
}

/**
 * Open the hand-off URL with App-Store fallback on missing scheme. Async so
 * the caller can `await` for telemetry; resolves true if a target was opened.
 */
export async function openKindredCompose(args: BuildArgs): Promise<boolean> {
  const url = buildKindredComposeUrl(args)
  try {
    await Linking.openURL(url)
    return true
  } catch {
    try {
      await Linking.openURL(FLAGSHIP_LINKS.yuan.appStoreUrl)
      return true
    } catch {
      return false
    }
  }
}
