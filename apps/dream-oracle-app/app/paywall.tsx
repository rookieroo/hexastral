import { getTokens } from '@zhop/hexastral-tokens/palette'
import { SatellitePaywall } from '@zhop/satellite-ui'
import { Stack } from 'expo-router'
import { StyleSheet, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { REVENUECAT_PRODUCT_IDS } from '@/lib/growth-config'

export default function DreamPaywallScreen() {
  const isDark = useColorScheme() === 'dark'
  const c = getTokens(isDark)
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.bg }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <Stack.Screen options={{ title: 'DreamOracle Pro' }} />
      <SatellitePaywall productIds={REVENUECAT_PRODUCT_IDS} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
})
