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
