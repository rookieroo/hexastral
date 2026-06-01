/**
 * Memory-preference API — HMAC-signed GET/PUT over /api/portfolio/memory-preference.
 *
 * `crossAppEnabled` is the cross-app recall opt-in (Chat plan CC.4): when on, Pro
 * chat may reference the user's readings across all HexAstral apps. Separate from
 * the same-app `enabled` flag, so cross-app is never silently broadened.
 */

import { config } from './config'
import { signRequest } from './hmac'

const PATH = '/api/portfolio/memory-preference'

export interface MemoryPreference {
  enabled: boolean
  crossAppEnabled: boolean
}

async function authedHeaders(
  userId: string,
  method: string,
  body: string
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${userId}`,
  }
  const sig = await signRequest({ body, userId, method, path: PATH })
  if (sig) Object.assign(headers, sig)
  return headers
}

export async function fetchMemoryPreference(userId: string): Promise<MemoryPreference> {
  const res = await fetch(`${config.apiUrl}${PATH}`, {
    headers: await authedHeaders(userId, 'GET', ''),
  })
  if (!res.ok) throw new Error(`memory_pref_failed:${res.status}`)
  const json = (await res.json()) as { enabled?: boolean; crossAppEnabled?: boolean }
  return { enabled: Boolean(json.enabled), crossAppEnabled: Boolean(json.crossAppEnabled) }
}

export async function setCrossAppMemory(userId: string, crossAppEnabled: boolean): Promise<void> {
  const body = JSON.stringify({ crossAppEnabled })
  const res = await fetch(`${config.apiUrl}${PATH}`, {
    method: 'PUT',
    headers: await authedHeaders(userId, 'PUT', body),
    body,
  })
  if (!res.ok) throw new Error(`memory_pref_set_failed:${res.status}`)
}
