/**
 * Signed GET /api/user/:userId — profile fields for Settings (email, name).
 */

import { config } from './config'
import { signRequest } from './hmac'

export interface YuanUserProfile {
  email: string | null
  name: string | null
}

export async function fetchUserProfile(userId: string): Promise<YuanUserProfile> {
  const path = `/api/user/${userId}`
  const sig = await signRequest({ method: 'GET', path, body: '', userId })
  if (!sig) throw new Error('Missing device secret')

  const res = await fetch(`${config.apiUrl}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${userId}`,
      ...sig,
    },
  })
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(json.message ?? `profile_fetch_failed:${res.status}`)
  }
  const json = (await res.json()) as { data: { email?: string | null; name?: string | null } }
  return {
    email: typeof json.data.email === 'string' ? json.data.email : null,
    name: typeof json.data.name === 'string' ? json.data.name : null,
  }
}
