/**
 * Xingqi root — stack navigation (Kanyu/Yuel): no bottom tabs.
 * Funnel + settings are full-screen pushes. Only paywall is modal.
 */

import { CoreUIProvider, useTheme } from '@zhop/core-ui'
import {
  getPortfolioUserId,
  repairPortfolioCredentialMismatch,
  usePortfolioSatelliteBootstrap,
  usePurchases,
} from '@zhop/satellite-runtime'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { type ReactNode, useEffect, useState } from 'react'
import { Appearance, AppState, StyleSheet, useColorScheme, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { SharedElementFlight } from '@/components/SharedElementFlight'
import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { ReducedMotionMount } from '@/lib/reduced-motion'
import { initializeFaceIap, loginFaceIap } from '@/lib/iap'
import { useXingqiNotificationDeepLink } from '@/lib/notification-deeplink'

function useSyelMode(): 'light' | 'dark' {
  const hook = useColorScheme()
  const [native, setNative] = useState(() => Appearance.getColorScheme())
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => setNative(colorScheme))
    setNative(Appearance.getColorScheme())
    Appearance.setColorScheme(null)
    return () => sub.remove()
  }, [])
  return (hook ?? native) === 'dark' ? 'dark' : 'light'
}

function SatelliteGrowthMount() {
  usePortfolioSatelliteBootstrap({
    storagePrefix: PORTFOLIO_STORAGE_PREFIX,
    targetApp: PORTFOLIO_TARGET_APP,
  })
  usePurchases()
  return null
}

function SessionRepairMount(): null {
  useEffect(() => {
    void repairPortfolioCredentialMismatch()
  }, [])
  return null
}

function IapMount(): null {
  useEffect(() => {
    initializeFaceIap()
    void (async () => {
      await repairPortfolioCredentialMismatch()
      const userId = await getPortfolioUserId()
      if (userId) await loginFaceIap(userId)
    })()
  }, [])
  return null
}

function NotificationDeepLinkMount(): null {
  useXingqiNotificationDeepLink()
  return null
}

function IcloudPhotoSyncMount(): null {
  useEffect(() => {
    const run = () => {
      void import('@/lib/icloud-sync')
        .then(({ pullReadingPhotosFromICloudIfEnabled }) => pullReadingPhotosFromICloudIfEnabled())
        .catch(() => {})
    }
    run()
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') run()
    })
    return () => sub.remove()
  }, [])
  return null
}

function ThemedRoot({ children }: { children: ReactNode }) {
  const { colors, isDark } = useTheme()
  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SatelliteGrowthMount />
      <SessionRepairMount />
      <IapMount />
      <NotificationDeepLinkMount />
      <IcloudPhotoSyncMount />
      <ReducedMotionMount />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
      {/* Renders above the native stack as a Modal, so the photo flies over the
          incoming report screen rather than under it. */}
      <SharedElementFlight />
    </View>
  )
}

function AppStack() {
  const { colors } = useTheme()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        contentStyle: { flex: 1, backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name='index' />
      <Stack.Screen name='(onboarding)' options={{ animation: 'fade' }} />
      <Stack.Screen name='(app)' options={{ animation: 'none' }} />
      <Stack.Screen name='sign-in' />
      <Stack.Screen name='consent' />
      <Stack.Screen name='capture' options={{ animation: 'none' }} />
      <Stack.Screen name='birth' options={{ headerShown: false }} />
      <Stack.Screen
        name='brief'
        options={{
          headerShown: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: false,
        }}
      />
      <Stack.Screen
        name='result'
        options={{
          headerShown: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: false,
        }}
      />
      <Stack.Screen name='privacy' options={{ headerShown: false }} />
      <Stack.Screen name='history' options={{ headerShown: false }} />
      <Stack.Screen
        name='glossary'
        options={{
          headerShown: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: false,
        }}
      />
      <Stack.Screen
        name='terms'
        options={{
          headerShown: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: false,
        }}
      />
      <Stack.Screen
        name='reading-chat'
        options={{
          headerShown: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: false,
        }}
      />
      <Stack.Screen name='timeline' options={{ headerShown: false }} />
      <Stack.Screen name='makeif' options={{ headerShown: false }} />
      <Stack.Screen
        name='locus'
        options={{
          headerShown: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: false,
        }}
      />
      <Stack.Screen name='(commerce)' options={{ presentation: 'modal' }} />
    </Stack>
  )
}

export default function RootLayout() {
  useFonts({
    LibreBaskerville: require('../assets/fonts/LibreBaskerville-Regular.ttf'),
    CrimsonPro: require('../assets/fonts/CrimsonPro-Regular.ttf'),
    'CrimsonPro-Italic': require('../assets/fonts/CrimsonPro-Italic.ttf'),
    IBMPlexMono: require('../assets/fonts/IBMPlexMono-Regular.ttf'),
  })
  const mode = useSyelMode()

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <CoreUIProvider brand='faceoracle' mode={mode}>
          <ThemedRoot>
            <AppStack />
          </ThemedRoot>
        </CoreUIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1 },
})
