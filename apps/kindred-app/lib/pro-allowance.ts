/**
 * Yuel Pro 月度额度 — client read.
 *
 * Signed GET to /api/bonds/pro/allowance (the same HMAC v2 signer the reading
 * cache uses). Returns this month's used/limit/remaining for chat · explain ·
 * reroll, plus the reset date — drives "本月还剩 N 次" in the 换视角 picker and any
 * other allowance display. Returns null when signed out or on any failure (the
 * caller degrades to hiding the count).
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { config } from './config'
import { signRequest } from './hmac'

export interface FeatureAllowance {
  used: number
  limit: number
  remaining: number
}

export interface ProAllowanceStatus {
  chat: FeatureAllowance
  explain: FeatureAllowance
  reroll: FeatureAllowance
  resetsOn: string
}

export async function fetchProAllowance(): Promise<ProAllowanceStatus | null> {
  const userId = await AsyncStorage.getItem('yuan_user_id')
  if (!userId) return null
  const path = '/api/bonds/pro/allowance'
  const signed = await signRequest({ body: '', userId, method: 'GET', path })
  if (!signed) return null
  try {
    const res = await fetch(`${config.apiUrl}${path}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${userId}`, ...signed },
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data?: ProAllowanceStatus }
    return json.data ?? null
  } catch {
    return null
  }
}
