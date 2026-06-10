/**
 * First-launch onboarding flag.
 *
 * Auspice is anonymous-first (ADR-0010 Tier 3): the almanac works with no
 * sign-in and no birth. So onboarding is a single light WELCOME — it orients
 * the user and points at birth entry for the 对你而言 layer, then gets out of
 * the way. This flag gates that welcome to the very first launch only; the
 * almanac is never blocked behind it.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'auspice.onboarding.seen.v1'

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1'
  } catch {
    // On a storage read failure, treat as seen — never trap a returning user on
    // the welcome screen.
    return true
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1')
  } catch {
    // Best-effort; worst case the welcome shows once more next launch.
  }
}

/** Clear the flag so the welcome shows again — DEV-only affordance (Me → DEV). */
export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY)
  } catch {
    // Best-effort; DEV-only.
  }
}
