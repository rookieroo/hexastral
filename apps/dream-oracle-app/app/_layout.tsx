/**
 * Dream Oracle root layout.
 *
 * Phase F: wrapped in <CoreUIProvider brand="dreamoracle" mode="dark"> per
 * ADR-0004 §1 — indigo + silver palette locked into core-ui satellites.ts.
 * The satellite intentionally defaults to dark mode (night-sky / dream
 * aesthetic); light mode is opt-in via system pref.
 */

import { CoreUIProvider } from '@zhop/core-ui'
import { getTokens } from '@zhop/hexastral-tokens/palette'
import { usePortfolioSatelliteBootstrap, usePurchases } from '@zhop/satellite-runtime'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { StyleSheet, useColorScheme } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

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
  // Dream Oracle defaults to dark — night-sky palette is intentional brand identity.
  const mode: 'light' | 'dark' = scheme === 'light' ? 'light' : 'dark'
  const isDark = mode === 'dark'
  const colors = getTokens(isDark)

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.bg }]}>
      <SafeAreaProvider>
        <CoreUIProvider brand='dreamoracle' mode={mode}>
          <SatelliteGrowthMount />
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              headerTitleStyle: { fontWeight: '500' },
              contentStyle: { flex: 1, backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name='dream' options={{ presentation: 'modal' }} />
            <Stack.Screen name='detail' options={{ presentation: 'modal' }} />
            <Stack.Screen name='history' options={{ presentation: 'modal' }} />
            <Stack.Screen name='paywall' options={{ presentation: 'modal' }} />
            <Stack.Screen name='result' options={{ presentation: 'modal' }} />
          </Stack>
        </CoreUIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
