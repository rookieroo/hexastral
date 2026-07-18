import { darkTokens } from '@zhop/hexastral-tokens/palette'
import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { isOnboardingComplete } from '@/lib/onboarding'

type EntryStatus = 'pending' | 'splash' | 'returning'

export default function EntryScreen() {
  const [status, setStatus] = useState<EntryStatus>('pending')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const done = await isOnboardingComplete()
        if (cancelled) return
        setStatus(done ? 'returning' : 'splash')
      } catch {
        if (!cancelled) setStatus('splash')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (status === 'pending') {
    return <View style={{ flex: 1, backgroundColor: darkTokens.bg }} />
  }
  if (status === 'splash') return <Redirect href='/(onboarding)/intro' />
  return <Redirect href='/(app)' />
}
