/**
 * Kindred → Auspice hand-off.
 *
 * The reverse of apps/auspice-app/lib/kindred-handoff.ts: where Auspice opens
 * Kindred pre-filled to deepen a 亲友 into a 合盘, Kindred can push a bond's
 * person BACK into Auspice's 亲友 list (for the 黄历 birthday reminder + light
 * 关系 read). Same universe identity, opposite direction.
 *
 * Privacy: the server never returns a bond partner's raw birth to the client
 * (bonds.ts D2). So the only data we can hand off is what THIS device entered
 * itself — held in lib/bondBirthCache for bonds created in 'fill' mode. Invite
 * bonds (where the other person filled their own birth on their device) carry
 * no local birth and simply don't offer this port.
 *
 * URL contract (mirrors composeLink.ts on the receiving side):
 *   auspice://compose?v=1&from=kindred
 *     &other_name=<enc>&other_date=YYYY-MM-DD&other_time=N
 *     &other_gender=男|女&other_city=<enc>&rel=<enc>
 */

import { Linking } from 'react-native'

const AUSPICE_SCHEME = 'auspice://'
// App-Store fallback when Auspice isn't installed. Placeholder id until the
// listing is live (same REPLACE_* convention as auspice/lib/config.ts).
const AUSPICE_APP_STORE = 'https://apps.apple.com/app/idREPLACE_AUSPICE'

export interface AuspicePersonHandoff {
  name: string
  /** Solar YYYY-MM-DD — Auspice's 亲友 store requires a real date. */
  solarDate: string
  timeIndex?: number | null
  gender?: '男' | '女' | null
  city?: string | null
  relationshipLabel?: string | null
}

function append(p: URLSearchParams, key: string, value: string | number | null | undefined) {
  if (value === null || value === undefined) return
  const str = String(value)
  if (str.length) p.set(key, str)
}

/** Build the `auspice://compose?...` deep link for a kindred → auspice hand-off. */
export function buildAuspiceComposeUrl(person: AuspicePersonHandoff): string {
  const p = new URLSearchParams()
  p.set('v', '1')
  p.set('from', 'kindred')
  append(p, 'other_name', person.name)
  append(p, 'other_date', person.solarDate)
  append(p, 'other_time', person.timeIndex)
  append(p, 'other_gender', person.gender)
  append(p, 'other_city', person.city)
  append(p, 'rel', person.relationshipLabel)
  return `${AUSPICE_SCHEME}compose?${p.toString()}`
}

/**
 * Open Auspice with the person pre-filled, App-Store fallback on missing
 * scheme. Resolves true if a target was opened.
 */
export async function openAuspiceCompose(person: AuspicePersonHandoff): Promise<boolean> {
  const url = buildAuspiceComposeUrl(person)
  try {
    await Linking.openURL(url)
    return true
  } catch {
    try {
      await Linking.openURL(AUSPICE_APP_STORE)
      return true
    } catch {
      return false
    }
  }
}

/* ── Personal reading hand-off (Yuel/Yuun split, Phase 3) ─────────────────────
 * Yuun owns the personal 命书 now. Yuel opens it via `auspice://reading`, carrying
 * the user's OWN birth so Yuun renders the same chart without re-entry (it seeds
 * its 亲友-less personal store only when empty — Yuun stays authoritative once set).
 * Unlike compose, this DOESN'T fall back to the App Store: the caller (home) falls
 * back to Yuel's own in-app reading overlay when Yuun isn't installed, so a solo
 * user never hits an install wall on their own reading.
 *
 *   auspice://reading?v=1&from=kindred
 *     &date=YYYY-MM-DD&time=N&gender=男|女&city=<enc>
 *     &lng=<num>&tz=<iana>&clock=<min>&calibrate=0|1
 */
export interface AuspiceReadingHandoff {
  solarDate: string
  timeIndex?: number | null
  gender?: '男' | '女' | null
  city?: string | null
  lng?: number | null
  timezone?: string | null
  clockMinutes?: number | null
  calibrate?: boolean | null
}

/** Build the `auspice://reading?...` deep link, carrying the self birth (if known). */
export function buildAuspiceReadingUrl(self?: AuspiceReadingHandoff | null): string {
  const p = new URLSearchParams()
  p.set('v', '1')
  p.set('from', 'kindred')
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
  return `${AUSPICE_SCHEME}reading?${p.toString()}`
}

/**
 * Open Yuun's personal reading. Yuel now shows only a concise local 概要; the FULL
 * 命书 lives in Yuun, so when Yuun isn't installed we send the user to the App
 * Store to get it (NOT an in-app full report — that would hollow out Yuun). The
 * 概要 already delivered standalone value, so the store hop is an upsell, not a
 * wall. Resolves true once a target (Yuun or the Store) was opened.
 */
export async function openAuspiceReading(self?: AuspiceReadingHandoff | null): Promise<boolean> {
  try {
    await Linking.openURL(buildAuspiceReadingUrl(self))
    return true
  } catch {
    try {
      await Linking.openURL(AUSPICE_APP_STORE)
      return true
    } catch {
      return false
    }
  }
}
