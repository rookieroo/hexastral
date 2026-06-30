/**
 * First-run onboarding gate.
 *
 * Fēng has a single cold-open intro (no multi-step flow — birth info is gathered
 * lazily, on demand, by the 八宅 chapter). This persists a one-shot "intro seen"
 * flag so the cold open shows exactly once. Boot (`app/index.tsx`) reads it to
 * decide whether to route to `(intro)` or straight to the home.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const INTRO_SEEN_KEY = 'feng_intro_seen_v1'

export async function hasSeenFengIntro(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(INTRO_SEEN_KEY)) === '1'
  } catch {
    // Storage unavailable — treat as seen so we never trap the user on the intro.
    return true
  }
}

export async function markFengIntroSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(INTRO_SEEN_KEY, '1')
  } catch {
    // Best-effort; a re-show next launch is acceptable degradation.
  }
}

/** DEV helper — clears the flag so the cold-open intro replays next launch. */
export async function resetFengIntro(): Promise<void> {
  try {
    await AsyncStorage.removeItem(INTRO_SEEN_KEY)
  } catch {
    // best-effort
  }
}
