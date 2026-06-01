/**
 * Yuán root layout.
 *
 * Tree:
 *   GestureHandlerRootView
 *     SafeAreaProvider
 *       AuthProvider (provisions userId + deviceSecret)
 *         YuanClientGate (wires <YuanClientProvider> once userId is ready)
 *           expo-router <Stack>
 *             (onboarding)/*  — first-launch 8-screen flow
 *             (bonds)/*       — main app (bond list + detail)
 *             accept/[token]  — deep-link claim (B-user from email)
 */

import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useMemo } from 'react'
import { Text, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ricePaper, ink } from '@zhop/hexastral-tokens'
import { YuanSeal } from '@zhop/scenario-yuan'
import { AuthProvider } from '@/lib/auth'
import { YuanClientGate } from '@/lib/client'
import { resolveLocale } from '@/lib/i18n'

function BootSplash() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: ricePaper.ivory,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
      }}
    >
      <YuanSeal mode="breathing" size={96} />
      <Text style={{ fontSize: 13, letterSpacing: 4, color: ink.brown, textTransform: 'uppercase' }}>
        Yuán
      </Text>
    </View>
  )
}

export default function RootLayout() {
  const locale = useMemo(() => resolveLocale(), [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AuthProvider locale={locale}>
          <YuanClientGate fallback={<BootSplash />}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: ricePaper.ivory },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen name="(bonds)" />
              <Stack.Screen name="accept/[token]" options={{ presentation: 'modal' }} />
            </Stack>
          </YuanClientGate>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
