/**
 * Kindred analytics — fire-and-forget funnel emission to the shared growth
 * endpoint (`POST /api/growth/events`, Zod-validated + Analytics Engine write
 * per apps/hexastral-api/src/routes/growth-funnel-events.ts).
 *
 * Inlined (rather than importing `@zhop/growth-funnel`'s emitter) to avoid
 * adding a workspace dependency edge to kindred-app — the client only needs to
 * POST a correctly-shaped event; the server owns validation. The event shape
 * mirrors `KindredUnlockFunnelEvent` in @zhop/growth-funnel; keep in sync.
 *
 * Emission never awaits and never throws — telemetry must not affect UX.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { randomUUID } from 'expo-crypto'
import { Platform } from 'react-native'
import { config } from './config'
import { resolveLocale } from './i18n'

/** Steps of the synastry unlock-wall funnel. */
export type UnlockFunnelStep =
  | 'wall_view'
  | 'invite_tap'
  | 'buy_tap'
  | 'subscribe_tap'
  | 'unlock_success'

export interface UnlockFunnelPayload {
  step: UnlockFunnelStep
  bond_id?: string
  /** How an unlock_success resolved: single_purchase | pro_quota | already. */
  via?: string
  /** Locked chapter count at wall view. */
  locked?: number
}

const ANON_ID_KEY = 'kindred.anonymousId'

// Load (or mint) the install-stable anonymous id once. AsyncStorage is async, so
// the first few emits before this resolves carry no anonymous_id (it's optional).
let anonId: string | null = null
void AsyncStorage.getItem(ANON_ID_KEY).then((existing) => {
  if (existing) {
    anonId = existing
    return
  }
  anonId = randomUUID()
  void AsyncStorage.setItem(ANON_ID_KEY, anonId)
})

const SOURCE = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web'
const ENDPOINT = `${config.apiUrl.replace(/\/+$/, '')}/api/growth/events`

/** Fire-and-forget Kindred unlock-funnel event. Returns immediately. */
export function emitUnlockFunnel(payload: UnlockFunnelPayload): void {
  const event = {
    event_id: randomUUID(),
    occurred_at_ms: Date.now(),
    source: SOURCE,
    target_app: 'kindred',
    anonymous_id: anonId ?? undefined,
    locale: resolveLocale(),
    event_name: 'kindred_unlock_funnel',
    payload,
  }
  void fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
    keepalive: true,
  }).catch((err: unknown) => {
    if (__DEV__) console.warn('[analytics] emit failed', err)
  })
}
