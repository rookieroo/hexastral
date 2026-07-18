/**
 * Face Oracle root layout.
 *
 * Phase F: wrapped in <CoreUIProvider brand="faceoracle" mode="dark"> per
 * ADR-0004 §1 — jade + ink-wash palette locked into core-ui satellites.ts.
 * The satellite intentionally defaults to dark mode (camera-first, photo-
 * focused). SafeAreaProvider is intentionally NOT added at root: face-oracle's
 * camera + result screens manage their own safe areas via SafeAreaView.
 */

import { CoreUIProvider } from '@zhop/core-ui'
import { darkTokens } from '@zhop/hexastral-tokens/palette'
import { usePortfolioSatelliteBootstrap, usePurchases } from '@zhop/satellite-runtime'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { StyleSheet, useColorScheme } from 'react-native'
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
  const scheme = useColorScheme()
  // Face Oracle defaults to dark — camera viewfinder ergonomics.
  const mode: 'light' | 'dark' = scheme === 'light' ? 'light' : 'dark'

  return (
    <GestureHandlerRootView style={styles.root}>
      <CoreUIProvider brand='faceoracle' mode={mode}>
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
          <Stack.Screen name='consent' options={{ presentation: 'modal' }} />
          <Stack.Screen name='capture' options={{ presentation: 'modal' }} />
          <Stack.Screen name='birth' options={{ presentation: 'modal' }} />
          <Stack.Screen name='detail' options={{ presentation: 'modal' }} />
          <Stack.Screen name='history' options={{ presentation: 'modal' }} />
          <Stack.Screen name='paywall' options={{ presentation: 'modal' }} />
          <Stack.Screen name='privacy' options={{ presentation: 'modal' }} />
          <Stack.Screen name='result' options={{ presentation: 'modal' }} />
        </Stack>
      </CoreUIProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: darkTokens.bg },
})
