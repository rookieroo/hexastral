/**
 * Yuán root layout.
 *
 * Tree:
 *   GestureHandlerRootView
 *     SafeAreaProvider
 *       CoreUIProvider (brand='yuan', mode='light') — Phase F design system anchor
 *         AuthProvider (provisions userId + deviceSecret)
 *           YuanClientGate (wires <YuanClientProvider> once userId is ready)
 *             IapInitializer  (one-shot RevenueCat configure + login)
 *             expo-router <Stack>
 *               (onboarding)/*  — first-launch 8-screen flow
 *               (bonds)/*       — main app (bond list + detail)
 *               (settings)/*    — Apple Sign In + sign out
 *               (commerce)/*    — paywall modal
 *               accept/[token]  — deep-link claim (B-user from email)
 *
 * Yuán selectively adopts core-ui primitives (Card, EmptyState, ErrorState,
 * LoadingSkeleton) while keeping its editorial typography scale (yuanType)
 * and gold-underline CTA pattern (yuanPresets.ctaText) — those are
 * intentional brand identity, not generic infrastructure. See
 * docs/decisions/0004-satellite-funnel-pattern.md and
 * docs/phase-f-plan.md §2.
 */

import { CoreUIProvider } from '@zhop/core-ui'
import { ink, ricePaper } from '@zhop/hexastral-tokens'
import { YuanSeal } from '@zhop/scenario-yuan'
import * as Linking from 'expo-linking'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useMemo } from 'react'
import { Text, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from '@/lib/auth'
import { YuanClientGate } from '@/lib/client'
import { captureCompose } from '@/lib/composeLink'
import { captureOnboardAttribution } from '@/lib/funnel-attribution'
import { resolveLocale } from '@/lib/i18n'
import { initializeYuanIap, loginYuanIap } from '@/lib/iap'

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
      <YuanSeal mode='breathing' size={96} />
      <Text
        style={{ fontSize: 13, letterSpacing: 4, color: ink.brown, textTransform: 'uppercase' }}
      >
        Yuán
      </Text>
    </View>
  )
}

/**
 * One-shot RevenueCat init + login. Reads userId from AuthProvider; runs once
 * userId becomes available. Render returns null — pure side-effect component.
 */
function IapInitializer(): null {
  const { userId } = useAuth()
  useEffect(() => {
    initializeYuanIap()
  }, [])
  useEffect(() => {
    if (!userId) return
    void loginYuanIap(userId)
  }, [userId])
  return null
}

export default function RootLayout() {
  const locale = useMemo(() => resolveLocale(), [])

  useEffect(() => {
    // Two URL listeners — they're orthogonal: onboard captures `?from=` for
    // funnel attribution, compose pre-fills the onboarding draft from a
    // sibling app's hand-off (cycle → yuán today; see apps/cycle-app/lib/
    // yuan-handoff.ts for the contract).
    void Linking.getInitialURL().then((url) => {
      captureOnboardAttribution(url)
      captureCompose(url)
    })
    const sub = Linking.addEventListener('url', ({ url }) => {
      void captureOnboardAttribution(url)
      captureCompose(url)
    })
    return () => sub.remove()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style='auto' />
        <CoreUIProvider brand='yuan' mode='light'>
          <AuthProvider locale={locale}>
            <YuanClientGate fallback={<BootSplash />}>
              <IapInitializer />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: ricePaper.ivory },
                  animation: 'slide_from_right',
                }}
              >
                <Stack.Screen name='index' />
                <Stack.Screen name='(onboarding)' />
                <Stack.Screen name='(bonds)' />
                <Stack.Screen name='(settings)' />
                <Stack.Screen name='(commerce)' options={{ presentation: 'modal' }} />
                <Stack.Screen name='accept/[token]' options={{ presentation: 'modal' }} />
              </Stack>
            </YuanClientGate>
          </AuthProvider>
        </CoreUIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
