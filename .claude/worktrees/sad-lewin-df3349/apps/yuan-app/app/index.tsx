/**
 * Yuán entry — decides where the user lands on app open.
 *
 * - First-ever launch (no onboarding completed) → /(onboarding)/welcome
 * - Returning user with at least one bond → /(bonds)
 * - Returning user, no bonds yet, but onboarding done → /(bonds) (empty state)
 *
 * Decision is cheap (single AsyncStorage read); no spinner shown for ≥1 frame.
 */

import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { View } from 'react-native'
import { ricePaper } from '@zhop/hexastral-tokens'
import { YuanSeal } from '@zhop/scenario-yuan'

const ONBOARDING_DONE_KEY = 'yuan_onboarding_complete_v1'

export default function EntryScreen() {
  const [status, setStatus] = useState<'loading' | 'first' | 'returning'>('loading')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const done = await AsyncStorage.getItem(ONBOARDING_DONE_KEY)
        if (!cancelled) setStatus(done ? 'returning' : 'first')
      } catch {
        if (!cancelled) setStatus('first')
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
        <YuanSeal mode="breathing" size={72} />
      </View>
    )
  }
  if (status === 'first') return <Redirect href="/(onboarding)/welcome" />
  return <Redirect href="/(bonds)" />
}

export async function markOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_DONE_KEY, '1')
}
