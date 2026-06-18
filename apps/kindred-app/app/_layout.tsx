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
import { kindredDark } from '@zhop/hexastral-tokens/kindred'
import { useFonts } from 'expo-font'
import * as Linking from 'expo-linking'
import { type Href, router, Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useMemo } from 'react'
import { View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from '@/lib/auth'
import { KindredClientGate } from '@/lib/client'
import { captureCompose } from '@/lib/composeLink'
import { attemptKindredDdlRestore, setKindredDdlToken } from '@/lib/ddl'
import { captureOnboardAttribution } from '@/lib/funnel-attribution'
import { resolveLocale } from '@/lib/i18n'
import { initializeYuanIap, loginYuanIap } from '@/lib/iap'
import { syncPushRegistration } from '@/lib/serverPush'
import { attachTimelineTapHandler, configureTimelineNotifications } from '@/lib/timeline-push'

/**
 * Boot cover — the client gate paints the kindred bg ONLY while session
 * provisioning resolves (a frame or two of automatic network setup, not a
 * user-initiated action). A moon-phase spinner here read as a redundant
 * "Loading" screen in front of the brand's own entrance flourish (intro moon
 * for first launch, HomeSplash for returning users); a loader belongs only
 * where the user took an explicit action and the API genuinely needs time.
 * The native splash already covers the cold-launch flash before this mounts.
 */
function BootSplash() {
  return <View style={{ flex: 1, backgroundColor: kindredDark.bg }} />
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
    // Reconcile push registration with the opt-in. Never prompts on launch — only
    // registers when permission is already granted (the toggle does the prompting).
    void syncPushRegistration(userId)
  }, [userId])
  return null
}

export default function RootLayout() {
  const locale = useMemo(() => resolveLocale(), [])

  // Report fonts (free-commercial SIL OFL). Non-gating: they pop in when ready;
  // the report uses them, falling back to system fonts for the first frames.
  //
  // CJK serif (kindredFonts.cjk === 'NotoSerifSC') is NOT yet bundled — the card,
  // glossary and share artefact already reference that family name, so CJK
  // currently falls back to the system serif. To finish: drop a SUBSETTED
  // assets/fonts/NotoSerifSC-Regular.ttf (full variable font ≈ 25 MB — subset to
  // the report's glyph range) and add `NotoSerifSC: require('../assets/fonts/
  // NotoSerifSC-Regular.ttf')` below. Deferred: needs the font binary + a
  // subsetting pass in an env with network/tooling (see docs/kindred-status.md).
  useFonts({
    LibreBaskerville: require('../assets/fonts/LibreBaskerville-Regular.ttf'),
    CrimsonPro: require('../assets/fonts/CrimsonPro-Regular.ttf'),
    'CrimsonPro-Italic': require('../assets/fonts/CrimsonPro-Italic.ttf'),
    IBMPlexMono: require('../assets/fonts/IBMPlexMono-Regular.ttf'),
  })

  useEffect(() => {
    // Two URL listeners — they're orthogonal: onboard captures `?from=` for
    // funnel attribution, compose pre-fills the onboarding draft from a
    // sibling app's hand-off (cycle → yuán today; see apps/auspice-app/lib/
    // kindred-handoff.ts for the contract).
    void Linking.getInitialURL().then((url) => {
      captureOnboardAttribution(url)
      captureCompose(url)
      void setKindredDdlToken(url)
    })
    const sub = Linking.addEventListener('url', ({ url }) => {
      void captureOnboardAttribution(url)
      captureCompose(url)
      void setKindredDdlToken(url)
    })
    return () => sub.remove()
  }, [])

  // Cold-install invite recovery (Deferred Deep Link). When B installed the app
  // from A's /resonate link, no URL carries the token — recover it via the DDL
  // fingerprint match and resume the invite at /accept/[token]. Runs once per
  // install (claimed guard inside); a non-invited user costs one no-op match.
  useEffect(() => {
    void attemptKindredDdlRestore().then((claim) => {
      if (claim) router.push({ pathname: '/accept/[token]', params: { token: claim.token } })
    })
  }, [])

  // Relationship-timeline reminders: set the foreground display behaviour once and
  // route taps to the timeline. The schedule itself is laid down lazily when the
  // timeline is viewed (Pro-gated server-side) — see lib/timeline-push.ts.
  useEffect(() => {
    configureTimelineNotifications()
    return attachTimelineTapHandler((route) => router.push(route as Href))
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
                  // Swipe-back was off everywhere but the report (which has its own
                  // gesture): the default edge gesture doesn't apply under a custom
                  // `slide_from_right`, so enable it explicitly. fullScreen = swipe
                  // from anywhere, not just the 20px edge.
                  gestureEnabled: true,
                  fullScreenGestureEnabled: true,
                }}
              >
                <Stack.Screen name='index' />
                <Stack.Screen name='(onboarding)' />
                <Stack.Screen name='(reading)' />
                <Stack.Screen name='(bonds)' />
                <Stack.Screen name='(timeline)' />
                {/* Settings dismiss is EDGE-ONLY (overrides the screenOptions default):
                    a full-screen back-swipe on the long settings scroll was too easy to
                    fire by accident (2026-06 feedback) — require a deliberate left-edge
                    start instead. */}
                <Stack.Screen name='(settings)' options={{ fullScreenGestureEnabled: false }} />
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
