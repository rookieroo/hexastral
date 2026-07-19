/**
 * Xingqi root — stack navigation (Kanyu/Yuel): no bottom tabs.
 * Funnel + settings are full-screen pushes. Only paywall is modal.
 */

import { CoreUIProvider } from '@zhop/core-ui'
import { darkTokens } from '@zhop/hexastral-tokens/palette'
import {
  getPortfolioUserId,
  usePortfolioSatelliteBootstrap,
  usePurchases,
} from '@zhop/satellite-runtime'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { initializeFaceIap, loginFaceIap } from '@/lib/iap'
import { useXingqiNotificationDeepLink } from '@/lib/notification-deeplink'

function SatelliteGrowthMount() {
  usePortfolioSatelliteBootstrap({
    storagePrefix: PORTFOLIO_STORAGE_PREFIX,
    targetApp: PORTFOLIO_TARGET_APP,
  })
  usePurchases()
  return null
}

function IapMount(): null {
  useEffect(() => {
    initializeFaceIap()
    void (async () => {
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

export default function RootLayout() {
  useFonts({
    LibreBaskerville: require('../assets/fonts/LibreBaskerville-Regular.ttf'),
    CrimsonPro: require('../assets/fonts/CrimsonPro-Regular.ttf'),
    'CrimsonPro-Italic': require('../assets/fonts/CrimsonPro-Italic.ttf'),
    IBMPlexMono: require('../assets/fonts/IBMPlexMono-Regular.ttf'),
  })

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <CoreUIProvider brand='faceoracle' mode='dark'>
          <SatelliteGrowthMount />
          <IapMount />
          <NotificationDeepLinkMount />
          <StatusBar style='light' />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
              contentStyle: { flex: 1, backgroundColor: darkTokens.bg },
            }}
          >
            <Stack.Screen name='index' />
            <Stack.Screen name='(onboarding)' />
            <Stack.Screen name='(app)' />
            <Stack.Screen name='sign-in' />
            <Stack.Screen name='consent' />
            <Stack.Screen name='capture' />
            <Stack.Screen name='birth' options={{ headerShown: false }} />
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
                // Edge-only: same as iOS system / Kindred glossary — full-screen
                // back-swipe was too sensitive on long vertical scrolls.
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
            <Stack.Screen name='(commerce)' options={{ presentation: 'modal' }} />
          </Stack>
        </CoreUIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: darkTokens.bg },
})
