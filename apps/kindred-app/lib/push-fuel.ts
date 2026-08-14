/**
 * Yuel push fuel — remaining relationship-push windows for the home Upcoming strip.
 * HMAC GET /api/kindred/push/fuel (does not consume queue rows).
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { config } from './config'
import { signRequest } from './hmac'

const USER_ID_KEY = 'yuan_user_id'

export interface PushFuelItem {
  id: string
  bondId: string | null
  kind: 'conditional' | 'dated' | string
  triggerKind: string | null
  fireOn: string | null
  title: string
  body: string
  source: string
  createdAt: string
}

export interface PushFuelSnapshot {
  remaining: number
  next: PushFuelItem[]
  slotLocalHour: number
  pro: boolean
}

function isFuelSnapshot(v: unknown): v is PushFuelSnapshot {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return typeof o.remaining === 'number' && Array.isArray(o.next)
}

/**
 * Fetch remaining queued push windows. Returns null when signed-out / offline.
 */
export async function fetchPushFuel(): Promise<PushFuelSnapshot | null> {
  const userId = await AsyncStorage.getItem(USER_ID_KEY)
  if (!userId) return null
  const path = '/api/kindred/push/fuel'
  const signed = await signRequest({
    body: '',
    userId,
    method: 'GET',
    path,
  })
  if (!signed) return null
  try {
    const res = await fetch(`${config.apiUrl}${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${userId}`,
        accept: 'application/json',
        ...signed,
      },
    })
    if (!res.ok) return null
    const json: unknown = await res.json()
    const data =
      json && typeof json === 'object' && 'data' in json ? (json as { data: unknown }).data : json
    return isFuelSnapshot(data) ? data : null
  } catch {
    return null
  }
}
