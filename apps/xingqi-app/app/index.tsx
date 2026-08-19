import { useTheme } from '@zhop/core-ui'
import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { isOnboardingComplete } from '@/lib/onboarding'

type EntryStatus = 'pending' | 'splash' | 'returning'

export default function EntryScreen() {
  const { colors } = useTheme()
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
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />
  }
  if (status === 'splash') return <Redirect href='/(onboarding)/intro' />
  return <Redirect href='/(app)' />
}
