/**
 * Fēng root layout.
 *
 * Tree:
 *   GestureHandlerRootView
 *     SafeAreaProvider
 *       CoreUIProvider (brand='feng', mode tracks system color scheme)
 *         AuthProvider (provisions userId + deviceSecret)
 *           FengClientGate (wires <FengClientProvider> once userId is ready)
 *             Stack
 *               (tabs)         — main app surface (sites / compass / readings / profile)
 *               (new-site)     — 4-screen new-site flow
 *               (report)/[siteId]
 *
 * Phase F migration: CoreUIProvider replaces direct FENG_PALETTE consumption
 * at root. `useFengTheme()` remains as a back-compat shim (lib/theme.ts) so
 * existing screens keep working; new screens use `useTheme()` from core-ui.
 * See docs/phase-f-migration-notes.md §1-2.
 */

import { CoreUIProvider } from '@zhop/core-ui'
import * as Linking from 'expo-linking'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useMemo } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthGate } from '@/components/AuthGate'
import { FengMark } from '@/components/FengMark'
import { AuthProvider, useAuth } from '@/lib/auth'
import { FengClientGate } from '@/lib/client'
import { captureOnboardAttribution } from '@/lib/funnel-attribution'
import { initializeFengIap, loginFengIap } from '@/lib/iap'
import { resolveLocale } from '@/lib/i18n'
import { FENG_PALETTE } from '@/lib/theme'

function BootSplash() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: FENG_PALETTE.night,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
      }}
    >
      <FengMark size={72} />
      <ActivityIndicator color={FENG_PALETTE.copperGold} />
    </View>
  )
}

function IapBootstrap() {
  const { userId } = useAuth()
  useEffect(() => {
    initializeFengIap()
  }, [])
  useEffect(() => {
    if (userId) void loginFengIap(userId)
  }, [userId])
  return null
}

export default function RootLayout() {
  const locale = useMemo(() => resolveLocale(), [])
  // Fēng is a dark-first brand (zinc-on-near-black). A light theme isn't authored
  // yet, and following the system scheme produced a half-adapted mix (dark report
  // + light chrome). Pin dark until a real light surface exists.
  const mode = 'dark' as const

  useEffect(() => {
    void Linking.getInitialURL().then((url) => captureOnboardAttribution(url))
    const sub = Linking.addEventListener('url', ({ url }) => {
      void captureOnboardAttribution(url)
    })
    return () => sub.remove()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style='auto' />
        <CoreUIProvider brand='feng' mode={mode}>
          <AuthProvider>
            <AuthGate>
              <IapBootstrap />
              <FengClientGate fallback={<BootSplash />}>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                  }}
                >
                  <Stack.Screen name='index' />
                  <Stack.Screen name='(intro)' />
                  <Stack.Screen name='(tabs)' />
                  <Stack.Screen name='(new-site)' />
                  <Stack.Screen name='(report)' />
                  <Stack.Screen name='(birth-info)' />
                  <Stack.Screen name='(glossary)' />
                  <Stack.Screen name='paywall' options={{ presentation: 'modal' }} />
                </Stack>
              </FengClientGate>
            </AuthGate>
          </AuthProvider>
        </CoreUIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
