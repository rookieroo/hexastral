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
 *   yuel://compose?v=1&from=cycle&mode=pair
 *     &self_date=YYYY-MM-DD&self_time=N&self_gender=男|女
 *     &self_city=<url-encoded>&self_lat=<f>&self_lng=<f>&self_tz=<IANA>
 *     &other_name=<url-encoded>&other_date=YYYY-MM-DD
 *     &other_time=N&other_gender=男|女
 *     &other_city=<url-encoded>&other_lat=<f>&other_lng=<f>&other_tz=<IANA>
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

import { Alert, Linking } from 'react-native'
import type { AuspiceBirthInfo } from './birth'
import { FLAGSHIP_LINKS } from './config'
import type { AuspicePerson } from './people'

/** Kindred's URL scheme — fixed once at hand-off contract v1. */
const YUEL_SCHEME = 'yuel://'

/** Kindred's repositioned consumer scheme (Yuel, 缘) + bundle. */
const KINDRED_SCHEME = 'yuel://'
// App-Store fallback when Yuel (Kindred, bundle com.hexastral.yuel) isn't
// installed. Placeholder id until the listing is live — same REPLACE_*
// convention as config.ts; fill once App Store Connect issues the app id.
const KINDRED_APP_STORE = 'https://apps.apple.com/app/idREPLACE_KINDRED'

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

/** Build the `yuel://compose?...` deep link for a cycle → yuán hand-off. */
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
    append(p, 'other_city', person.city)
    append(p, 'other_lat', person.lat)
    append(p, 'other_lng', person.lng)
    append(p, 'other_tz', person.timezone)
  }
  append(p, 'rel', relationshipLabel)

  p.set('mode', hasSelf ? 'pair' : 'fill')
  return `${YUEL_SCHEME}compose?${p.toString()}`
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

export interface KindredShareConsent {
  title: string
  body: string
  confirm: string
  cancel: string
}

/**
 * Gate the hand-off behind explicit cross-app data-sharing consent. The 亲友's
 * (and the user's own) birth details ride in the deep-link URL the device opens —
 * device-carried, never a silent server share — but it's still PII leaving for
 * another app, so confirm first.
 */
export function confirmAndOpenKindred(args: BuildArgs, consent: KindredShareConsent): void {
  Alert.alert(consent.title, consent.body, [
    { text: consent.cancel, style: 'cancel' },
    {
      text: consent.confirm,
      onPress: () => {
        void openKindredCompose(args)
      },
    },
  ])
}

/* ── Personal reading hand-off (Yuel/Yuun split, Phase 2) ─────────────────────
 * Yuel owns the FULL personal 命书 now. Yuun shows only a concise local 概要 and
 * opens the full read via `yuel://reading`, carrying the user's OWN birth so
 * Yuel renders the same chart without re-entry. The exact mirror of Yuel's
 * apps/kindred-app/lib/auspice-handoff.ts `openAuspiceReading` (opposite direction).
 *
 * When Yuel isn't installed we send the user to the App Store to get it (the 概要
 * already delivered standalone value, so the store hop is an upsell, not a wall).
 *
 *   yuel://reading?v=1&from=auspice
 *     &date=YYYY-MM-DD&time=N&gender=男|女&city=<enc>
 *     &lng=<num>&tz=<iana>&clock=<min>&calibrate=0|1
 */

/** Build the `yuel://reading?...` deep link, carrying the self birth (if known). */
export function buildKindredReadingUrl(self?: AuspiceBirthInfo | null): string {
  const p = new URLSearchParams()
  p.set('v', '1')
  p.set('from', 'auspice')
  if (self) {
    append(p, 'date', self.solarDate)
    append(p, 'time', self.timeIndex)
    append(p, 'gender', self.gender)
    append(p, 'city', self.city)
    append(p, 'lng', self.lng)
    append(p, 'tz', self.timezone)
    append(p, 'clock', self.clockMinutes)
    if (self.calibrate != null) p.set('calibrate', self.calibrate ? '1' : '0')
  }
  return `${KINDRED_SCHEME}reading?${p.toString()}`
}

/**
 * Open Yuel's full personal 命书, carrying the self birth to skip re-entry. Falls
 * back to the App Store when Yuel isn't installed (degrades gracefully — a missing
 * scheme throws and we hop to the store; if even that fails we resolve false).
 * Resolves true once a target (Yuel or the Store) was opened.
 */
export async function openKindredReading(self?: AuspiceBirthInfo | null): Promise<void> {
  try {
    await Linking.openURL(buildKindredReadingUrl(self))
  } catch {
    try {
      await Linking.openURL(KINDRED_APP_STORE)
    } catch {
      // Neither Yuel nor the Store could be opened — nothing more we can do.
    }
  }
}
