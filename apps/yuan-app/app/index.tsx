/**
 * Yuán entry — decides where the user lands on app open.
 *
 * - First-ever launch, intro not seen → /(onboarding)/intro (then welcome)
 * - Onboarding not yet done but intro seen → /(onboarding)/welcome
 * - Returning user with onboarding done → /(bonds) (with or without bonds)
 *
 * Intro is single-shot: we set `INTRO_SEEN_KEY` up-front so a force-quit
 * mid-animation doesn't replay it.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { ricePaper } from '@zhop/hexastral-tokens'
import { YuanSeal } from '@zhop/scenario-yuan'
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
          backgroundColor: ricePaper.ivory,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <YuanSeal mode='breathing' size={72} />
      </View>
    )
  }
  if (status === 'intro') return <Redirect href='/(onboarding)/intro' />
  if (status === 'welcome') return <Redirect href='/(onboarding)/welcome' />
  return <Redirect href='/(bonds)' />
}

export async function markOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_DONE_KEY, '1')
}
