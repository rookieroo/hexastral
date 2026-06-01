import { darkTokens } from '@zhop/hexastral-tokens/palette'
import { SatellitePaywall } from '@zhop/satellite-ui'
import { Stack } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import { REVENUECAT_PRODUCT_IDS } from '@/lib/growth-config'

export default function FacePaywallScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'FaceOracle Pro' }} />
      <SatellitePaywall productIds={REVENUECAT_PRODUCT_IDS} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: darkTokens.bg, padding: 24 },
})
