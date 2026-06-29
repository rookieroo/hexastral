/**
 * Coin Cast root layout.
 *
 * Phase F: wrapped in <CoreUIProvider brand="coincast" mode={...}> per ADR-0004
 * §1 — amber + wood-grain palette locked into core-ui satellites.ts.
 *
 * Architecture note: the existing `useAppTheme()` hook is now a back-compat
 * shim consuming `useTheme()` from core-ui. Because the shim requires the
 * provider to be in the tree, the root is split into an outer scaffold that
 * provides the CoreUIProvider and an inner `RootLayoutInner` that consumes it.
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
  // Coin Cast defaults to dark — bronze coins read like instruments on slate.
  const mode: 'light' | 'dark' = scheme === 'light' ? 'light' : 'dark'

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <CoreUIProvider brand='coincast' mode={mode}>
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
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '500' },
          contentStyle: { flex: 1, backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen
          name='cast'
          options={{
            presentation: 'formSheet',
            sheetGrabberVisible: true,
            ...(Platform.OS === 'ios'
              ? { sheetAllowedDetents: [0.42, 0.72], sheetInitialDetentIndex: 0 }
              : {}),
          }}
        />
        <Stack.Screen
          name='detail'
          options={{
            presentation: 'formSheet',
            sheetGrabberVisible: true,
            ...(Platform.OS === 'ios'
              ? { sheetAllowedDetents: [0.55, 0.92], sheetInitialDetentIndex: 0 }
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
          name='result'
          options={{
            presentation: 'formSheet',
            sheetGrabberVisible: true,
            ...(Platform.OS === 'ios'
              ? { sheetAllowedDetents: [0.45, 0.85], sheetInitialDetentIndex: 0 }
              : {}),
          }}
        />
        <Stack.Screen
          name='settings'
          options={{
            presentation: 'formSheet',
            sheetGrabberVisible: true,
            ...(Platform.OS === 'ios'
              ? { sheetAllowedDetents: [0.65, 0.95], sheetInitialDetentIndex: 1 }
              : {}),
          }}
        />
        <Stack.Screen
          name='before-cast'
          options={{
            presentation: 'formSheet',
            sheetGrabberVisible: true,
            ...(Platform.OS === 'ios'
              ? { sheetAllowedDetents: [0.42, 0.78], sheetInitialDetentIndex: 0 }
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
