/**
 * Lantai root — zinc light-default (Notion-first). Respects system dark.
 * No AlmanacThemeProvider / astro-core / widgets.
 */

import { CoreUIProvider } from '@zhop/core-ui'
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
  const mode: 'light' | 'dark' = scheme === 'dark' ? 'dark' : 'light'

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <CoreUIProvider brand='lantai' mode={mode}>
          <SatelliteGrowthMount />
          <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name='(tabs)' />
            <Stack.Screen name='config/[id]' />
            <Stack.Screen name='connect' />
            <Stack.Screen name='install' />
            <Stack.Screen name='confirm/[jobId]' />
          </Stack>
        </CoreUIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
