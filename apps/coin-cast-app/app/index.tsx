import { hasCompletedSatelliteOnboarding } from '@zhop/satellite-ui'
import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'

import { COIN_CAST_ONBOARDING_STORAGE_KEY } from '@/lib/coincast-constants'
import { useAppTheme } from '@/lib/theme'

export default function EntryScreen() {
  const { colors } = useAppTheme()
  const [checked, setChecked] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      const value = await hasCompletedSatelliteOnboarding(COIN_CAST_ONBOARDING_STORAGE_KEY)
      if (!active) return
      setDone(value)
      setChecked(true)
    })()
    return () => {
      active = false
    }
  }, [])

  if (!checked) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator color={colors.secondary} />
      </View>
    )
  }

  return done ? <Redirect href='/(tabs)' /> : <Redirect href='/(auth)/onboarding' />
}
