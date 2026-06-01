import '@/lib/ensure-intl'

import { initCrashReporting } from '@zhop/satellite-runtime'

// Sentry init MUST run before React renders so it can capture early-boot
// crashes. Safe to call at module top-level: degrades to no-op when
// EXPO_PUBLIC_SENTRY_DSN is unset (local dev) or @sentry/react-native is
// not installed.
initCrashReporting({ app: 'fate' })

/**
 * fate-app root layout — Tier-3 satellite shape (no auth gate, no IAP).
 *
 *   GestureHandlerRootView
 *     SafeAreaProvider
 *       CoreUIProvider (brand="hexastral" — 命 ink/charcoal, defaults dark)
 *         SatelliteGrowthMount  (anonymous portfolio bootstrap only)
 *         Stack
 *           index   — redirects into (tabs)
 *           (tabs)  — Chart (命) + Me
 *
 * No usePurchases / paywall — fate-app has no IAP. Apple Sign-In is optional and
 * wired later in the Me tab. Reading surfaces (八字/紫微/report) land in K.1.2.
 */

import { CoreUIProvider } from '@zhop/core-ui'
import {
  configurePushHandler,
  ErrorBoundary,
  type HexastralLink,
  usePortfolioSatelliteBootstrap,
  useTokenPermissionReconcile,
  useUniversalLinks,
} from '@zhop/satellite-runtime'
import { Stack } from 'expo-router'
import * as Linking from 'expo-linking'
import { StatusBar } from 'expo-status-bar'
import { useCallback } from 'react'
import { StyleSheet } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

// P1-12 — Configure push foreground display behavior before React renders.
// Safe no-op when expo-notifications isn't installed (matches the Sentry
// pattern from P0-7). Idempotent.
configurePushHandler()

import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { I18nProvider } from '@/lib/i18n'
import { useAppTheme } from '@/lib/theme'

function SatelliteGrowthMount() {
  usePortfolioSatelliteBootstrap({
    storagePrefix: PORTFOLIO_STORAGE_PREFIX,
    targetApp: PORTFOLIO_TARGET_APP,
  })
  // P1-12 — Reconcile orphan push tokens: if OS permission was revoked
  // since last register, drop server-side token on next foreground so
  // svc-notify stops sending. Without this, an iOS user who turns off
  // notifications in Settings keeps getting their push attempts logged
  // server-side until the 90-day stale-sweep cron cleans up.
  useTokenPermissionReconcile()
  // P1-15 — Universal Links dispatch. The bootstrap already handles
  // ?ddl=<token> invite tokens; this covers /u/{username} profile shares,
  // /report/{id} reading shares, and /lp/* marketing landings.
  const onLink = useCallback((link: HexastralLink) => {
    if (link.kind === 'profile') {
      // Public profile lives on web (hexastral-web/u/[username]). Native
      // viewer would duplicate the work; in-app SafariView avoids the
      // round-trip to system Safari.
      void Linking.openURL(`https://hexastral.com/u/${encodeURIComponent(link.username)}`)
      return
    }
    if (link.kind === 'report') {
      void Linking.openURL(`https://hexastral.com/report/${encodeURIComponent(link.reportId)}`)
      return
    }
    if (link.kind === 'lp') {
      void Linking.openURL(`https://hexastral.com/lp/${encodeURIComponent(link.slug)}`)
      return
    }
    // 'invite' is handled by the bootstrap above; 'unknown' falls through.
  }, [])
  useUniversalLinks({ onLink })
  return null
}

export default function RootLayout() {
  // 命 ink aesthetic — dark only. The FLIP spike visual language requires
  // a consistent dark surface; light mode would dilute the brand.

  return (
    <ErrorBoundary boundaryName='root'>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <CoreUIProvider brand='hexastral' mode='dark'>
            <I18nProvider>
              <RootLayoutInner />
            </I18nProvider>
          </CoreUIProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
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
        <Stack.Screen name='(tabs)' />
        <Stack.Screen name='birth' />
        <Stack.Screen name='chart' />
        <Stack.Screen name='spike' options={{ headerShown: false }} />
      </Stack>
      {/* Splash is now integrated into the home tab via magic-move */}
    </>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
