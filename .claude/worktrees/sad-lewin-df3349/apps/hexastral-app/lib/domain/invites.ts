/**
 * Invites — tracks which device contacts have been sent an invitation.
 *
 * This is intentionally separate from `bonds.ts`.
 * Sending an invite does NOT create a Bond. A Bond only exists once:
 *   1. The invited person installs the app
 *   2. Their phone number is matched server-side
 *   3. One party completes a dual (synastry/compatibility) analysis
 *
 * This file only handles the local INVITED → INVITE toggle in the UI.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'hexastral_invited_contact_ids'

let cached: Set<string> | null = null

export async function getInvitedContactIds(): Promise<Set<string>> {
  if (cached) return cached
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    cached = new Set(raw ? (JSON.parse(raw) as string[]) : [])
    return cached
  } catch {
    return new Set()
  }
}

export async function markContactInvited(contactId: string): Promise<void> {
  const set = await getInvitedContactIds()
  set.add(contactId)
  cached = set
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
}
