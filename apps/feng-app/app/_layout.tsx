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
import { ActivityIndicator, useColorScheme, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthGate } from '@/components/AuthGate'
import { FengMark } from '@/components/FengMark'
import { AuthProvider } from '@/lib/auth'
import { FengClientGate } from '@/lib/client'
import { captureOnboardAttribution } from '@/lib/funnel-attribution'
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

export default function RootLayout() {
  const locale = useMemo(() => resolveLocale(), [])
  const scheme = useColorScheme()
  // Fēng defaults to light (rice-paper report-friendly); flips with system dark mode.
  const mode = scheme === 'dark' ? 'dark' : 'light'

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
                </Stack>
              </FengClientGate>
            </AuthGate>
          </AuthProvider>
        </CoreUIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
