/**
 * Soft sign-in nudge after the first successful invite (anonymous → recoverable).
 * One-shot per install; Settings remains the always-on entry.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const INVITE_NUDGE_KEY = 'kindred_signin_nudge_invite_v1'

export async function shouldNudgeSignInAfterInvite(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(INVITE_NUDGE_KEY)
    return v !== '1'
  } catch {
    return true
  }
}

export async function markInviteSignInNudgeShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(INVITE_NUDGE_KEY, '1')
  } catch {
    // Best-effort — worst case the nudge may show once more.
  }
}
