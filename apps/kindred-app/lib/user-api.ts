/**
 * Signed GET /api/user/:userId — profile fields for Settings (email, name).
 */

import { config } from './config'
import { signRequest } from './hmac'

export interface KindredUserProfile {
  email: string | null
  name: string | null
  /** Apple / Google / email linked — anonymous device-only sessions are false. */
  hasLinkedSignIn: boolean
}

export async function fetchUserProfile(userId: string): Promise<KindredUserProfile> {
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
  const json = (await res.json()) as {
    data: {
      email?: string | null
      name?: string | null
      appleUserId?: string | null
      googleUserId?: string | null
    }
  }
  const email = typeof json.data.email === 'string' ? json.data.email : null
  const apple = typeof json.data.appleUserId === 'string' && json.data.appleUserId.length > 0
  const google = typeof json.data.googleUserId === 'string' && json.data.googleUserId.length > 0
  return {
    email,
    name: typeof json.data.name === 'string' ? json.data.name : null,
    hasLinkedSignIn: Boolean(email || apple || google),
  }
}
