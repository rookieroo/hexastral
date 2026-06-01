import { darkTokens } from '@zhop/hexastral-tokens/palette'
import { hasCompletedSatelliteOnboarding } from '@zhop/satellite-ui'
import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'

export default function EntryScreen() {
  const [checked, setChecked] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      const value = await hasCompletedSatelliteOnboarding('face_oracle_onboarded')
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
          backgroundColor: darkTokens.bg,
        }}
      >
        <ActivityIndicator color={darkTokens.secondary} />
      </View>
    )
  }

  return done ? <Redirect href='/(tabs)' /> : <Redirect href='/(auth)/onboarding' />
}
