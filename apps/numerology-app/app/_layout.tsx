/**
 * Numerology root layout — Phase G Tier-1 satellite shape.
 *
 * Tree mirrors coin-cast / face-oracle / dream-oracle:
 *   GestureHandlerRootView
 *     SafeAreaProvider
 *       CoreUIProvider (brand="numerology", mode tracks system)
 *         SatelliteGrowthMount  (anonymous bootstrap + RC purchases)
 *         Stack
 *           index           — onboarding gate (redirects)
 *           (auth)          — first-launch onboarding flow
 *           (tabs)          — Home (Numbers) + Me
 *           compute         — input sheet
 *           result          — six-number panel sheet
 *           history         — past readings sheet
 *           paywall         — RC paywall sheet
 *           settings        — language + about sheet
 *
 * Defaults to light mode — Numerology is the Western-market wedge per ADR-0004
 * §1; light surface + violet accent matches the "accessible mystical" aesthetic.
 */

import { CoreUIProvider } from '@zhop/core-ui'
import { usePortfolioSatelliteBootstrap, usePurchases } from '@zhop/satellite-runtime'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Platform, StyleSheet, useColorScheme } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { useAppTheme } from '@/lib/theme'

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
  // Numerology defaults to light — Western-market accessible aesthetic per ADR-0004.
  const mode: 'light' | 'dark' = scheme === 'dark' ? 'dark' : 'light'

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <CoreUIProvider brand='numerology' mode={mode}>
          <RootLayoutInner />
        </CoreUIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

function RootLayoutInner() {
  const { colors, isDark } = useAppTheme()

  return (
    <>
      <SatelliteGrowthMount />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { flex: 1, backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name='index' />
        <Stack.Screen name='(auth)' />
        <Stack.Screen name='(tabs)' />
        <Stack.Screen
          name='compute'
          options={{
            presentation: 'formSheet',
            sheetGrabberVisible: true,
            ...(Platform.OS === 'ios'
              ? { sheetAllowedDetents: [0.55, 0.92], sheetInitialDetentIndex: 0 }
              : {}),
          }}
        />
        <Stack.Screen
          name='result'
          options={{
            presentation: 'formSheet',
            sheetGrabberVisible: true,
            ...(Platform.OS === 'ios'
              ? { sheetAllowedDetents: [0.6, 0.95], sheetInitialDetentIndex: 0 }
              : {}),
          }}
        />
        <Stack.Screen
          name='history'
          options={{
            presentation: 'formSheet',
            sheetGrabberVisible: true,
            ...(Platform.OS === 'ios'
              ? { sheetAllowedDetents: [0.5, 0.9], sheetInitialDetentIndex: 0 }
              : {}),
          }}
        />
        <Stack.Screen
          name='paywall'
          options={{
            presentation: 'formSheet',
            sheetGrabberVisible: true,
            ...(Platform.OS === 'ios'
              ? { sheetAllowedDetents: [0.38, 0.72], sheetInitialDetentIndex: 0 }
              : {}),
          }}
        />
        <Stack.Screen
          name='settings'
          options={{
            presentation: 'formSheet',
            sheetGrabberVisible: true,
            ...(Platform.OS === 'ios'
              ? { sheetAllowedDetents: [0.32, 0.52], sheetInitialDetentIndex: 0 }
              : {}),
          }}
        />
      </Stack>
    </>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
