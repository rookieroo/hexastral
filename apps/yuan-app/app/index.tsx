/**
 * Yuán entry — decides where the user lands on app open.
 *
 * - First-ever launch, intro not seen → /(onboarding)/intro (stick-figure
 *   parable, once) → self birth wizard → mode picker
 * - Onboarding not yet done but intro seen → /(onboarding)/self
 * - Returning user with onboarding done → /(bonds) (HomeSplash moon flourish)
 *
 * Intro is single-shot: we set `INTRO_SEEN_KEY` up-front so a force-quit
 * mid-animation doesn't replay it. Use `resetOnboarding()` (DEV, in Settings)
 * to replay from scratch.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { AutoMoonPhaseLoader } from '@zhop/core-ui/motion'
import { SKIN_CINNABAR } from '@zhop/hexastral-tokens/moon'
import { yuanDark } from '@zhop/hexastral-tokens/yuan'
import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

const ONBOARDING_DONE_KEY = 'yuan_onboarding_complete_v1'
const INTRO_SEEN_KEY = 'yuan_intro_seen_v1'

type EntryStatus = 'loading' | 'intro' | 'welcome' | 'returning'

export default function EntryScreen() {
  const [status, setStatus] = useState<EntryStatus>('loading')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [done, intro] = await Promise.all([
          AsyncStorage.getItem(ONBOARDING_DONE_KEY),
          AsyncStorage.getItem(INTRO_SEEN_KEY),
        ])
        if (cancelled) return
        if (done) {
          setStatus('returning')
        } else if (!intro) {
          await AsyncStorage.setItem(INTRO_SEEN_KEY, '1')
          if (!cancelled) setStatus('intro')
        } else {
          setStatus('welcome')
        }
      } catch {
        if (!cancelled) setStatus('welcome')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (status === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: yuanDark.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AutoMoonPhaseLoader size={72} skin={SKIN_CINNABAR} />
      </View>
    )
  }
  if (status === 'intro') return <Redirect href='/(onboarding)/intro' />
  if (status === 'welcome') return <Redirect href='/(onboarding)/self' />
  return <Redirect href='/(bonds)' />
}

export async function markOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_DONE_KEY, '1')
}

/** DEV-only: wipe first-launch flags so the intro + onboarding replay. */
export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.multiRemove([ONBOARDING_DONE_KEY, INTRO_SEEN_KEY])
}
