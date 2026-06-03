import '@/lib/ensure-intl'

/**
 * Kindred root layout.
 *
 * Tree:
 *   GestureHandlerRootView
 *     SafeAreaProvider
 *       CoreUIProvider (brand='kindred', mode='dark') — dark-only (ADR-0018 ink aesthetic)
 *         AuthProvider (provisions userId + deviceSecret)
 *           KindredClientGate (wires <KindredClientProvider> once userId is ready)
 *             IapInitializer  (one-shot RevenueCat configure + login)
 *             expo-router <Stack>
 *               (onboarding)/*  — intro → self → [first run: solo reading] or mode → partner flow
 *               (reading)/*     — HOME: solo 八字紫微 report (ADR-0021 K1)
 *               (bonds)/*       — Threads: bond list + detail
 *               (settings)/*    — Apple Sign In + sign out
 *               (commerce)/*    — paywall modal
 *               accept/[token]  — deep-link claim (B-user from email)
 *
 * Kindred selectively adopts core-ui primitives (Card, EmptyState, ErrorState,
 * LoadingSkeleton) while keeping its editorial typography scale (kindredType)
 * and gold-underline CTA pattern (kindredPresets.ctaText) — those are
 * intentional brand identity, not generic infrastructure. See
 * docs/decisions/0004-satellite-funnel-pattern.md and
 * docs/phase-f-plan.md §2.
 */

import { CoreUIProvider } from '@zhop/core-ui'
import { AutoMoonPhaseLoader } from '@zhop/core-ui/motion'
import { kindredDark } from '@zhop/hexastral-tokens/kindred'
import { SKIN_CINNABAR } from '@zhop/hexastral-tokens/moon'
import * as Linking from 'expo-linking'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useMemo } from 'react'
import { Text, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from '@/lib/auth'
import { KindredClientGate } from '@/lib/client'
import { captureCompose } from '@/lib/composeLink'
import { captureOnboardAttribution } from '@/lib/funnel-attribution'
import { resolveLocale } from '@/lib/i18n'
import { initializeYuanIap, loginYuanIap } from '@/lib/iap'

function BootSplash() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: kindredDark.bg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
      }}
    >
      <AutoMoonPhaseLoader size={96} skin={SKIN_CINNABAR} />
      <Text
        style={{
          fontSize: 13,
          letterSpacing: 4,
          color: kindredDark.textSecondary,
          textTransform: 'uppercase',
        }}
      >
        Kindred
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
    // sibling app's hand-off (cycle → yuán today; see apps/auspice-app/lib/
    // kindred-handoff.ts for the contract).
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
        <StatusBar style='light' />
        <CoreUIProvider brand='yuan' mode='dark'>
          <AuthProvider locale={locale}>
            <KindredClientGate fallback={<BootSplash />}>
              <IapInitializer />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: kindredDark.bg },
                  animation: 'slide_from_right',
                }}
              >
                <Stack.Screen name='index' />
                <Stack.Screen name='(onboarding)' />
                <Stack.Screen name='(reading)' />
                <Stack.Screen name='(bonds)' />
                <Stack.Screen name='(settings)' />
                <Stack.Screen name='(commerce)' options={{ presentation: 'modal' }} />
                <Stack.Screen name='accept/[token]' options={{ presentation: 'modal' }} />
              </Stack>
            </KindredClientGate>
          </AuthProvider>
        </CoreUIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
