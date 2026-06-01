import { darkTokens } from '@zhop/hexastral-tokens/palette'
import { usePortfolioSatelliteBootstrap, usePurchases } from '@zhop/satellite-runtime'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { StyleSheet } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from '@/lib/growth-config'

function SatelliteGrowthMount() {
  usePortfolioSatelliteBootstrap({
    storagePrefix: PORTFOLIO_STORAGE_PREFIX,
    targetApp: PORTFOLIO_TARGET_APP,
  })
  usePurchases()
  return null
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SatelliteGrowthMount />
      <StatusBar style='light' />
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: darkTokens.bg },
          headerTintColor: darkTokens.text,
          headerTitleStyle: { fontWeight: '500' },
        }}
      >
        <Stack.Screen name='capture' options={{ presentation: 'modal' }} />
        <Stack.Screen name='detail' options={{ presentation: 'modal' }} />
        <Stack.Screen name='history' options={{ presentation: 'modal' }} />
        <Stack.Screen name='paywall' options={{ presentation: 'modal' }} />
        <Stack.Screen name='result' options={{ presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: darkTokens.bg },
})
