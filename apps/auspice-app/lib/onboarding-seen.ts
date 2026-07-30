/**
 * First-launch onboarding flag.
 *
 * Yuun is anonymous-first: the almanac works with no sign-in. Onboarding is a
 * single light welcome that orients the user toward optional birth entry, then
 * gets out of the way.
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
