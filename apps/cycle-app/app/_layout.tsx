/**
 * Cycle root layout — Tier-3 satellite shape (ADR-0010).
 *
 *   GestureHandlerRootView
 *     SafeAreaProvider
 *       CoreUIProvider (brand="cycle" — 朱泥 terra; defaults light for 黄历 paper reading)
 *         LocaleProvider (zh-Hans / zh-Hant / ja / en)
 *           SatelliteGrowthMount (anonymous bootstrap; no IAP — Tier 3)
 *           Stack: (tabs) + day/[date] + event
 */

import { CoreUIProvider } from '@zhop/core-ui'
import { usePortfolioSatelliteBootstrap, usePurchases } from '@zhop/satellite-runtime'
import { Stack, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { StyleSheet, useColorScheme } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { getCycleBirthDate } from '@/lib/birth'
import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { LocaleProvider, useStrings } from '@/lib/i18n-context'
import { getPeople } from '@/lib/people'
import {
  addCycleNotificationTapListener,
  configureNotifications,
  refreshDailyPush,
  scheduleBirthdayReminders,
} from '@/lib/push'
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
  // Cycle defaults light — 黄历 reads best on warm paper; honor explicit dark mode.
  const mode: 'light' | 'dark' = scheme === 'dark' ? 'dark' : 'light'

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <CoreUIProvider brand='cycle' mode={mode}>
          <LocaleProvider>
            <RootLayoutInner />
          </LocaleProvider>
        </CoreUIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

function RootLayoutInner() {
  const { colors, isDark } = useAppTheme()
  const { locale } = useStrings()
  const router = useRouter()

  // Foreground display handler + re-sync the deterministic daily-push window on open
  // (keeps the rolling 8am notifications' content fresh; no-op unless push is enabled).
  useEffect(() => {
    configureNotifications()
    getCycleBirthDate()
      .then((birthDate) => refreshDailyPush({ locale, birthDate }))
      .catch(() => {})
    getPeople()
      .then((people) => scheduleBirthdayReminders(people, locale))
      .catch(() => {})
  }, [locale])

  // Notification tap → deep-link Today to the notification's date.
  useEffect(() => {
    return addCycleNotificationTapListener((day) => {
      if (day) router.push({ pathname: '/', params: { day } })
      else router.push('/')
    })
  }, [router])

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
        <Stack.Screen name='display' options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name='event' options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name='festival/[id]' options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name='glossary' options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name='people' options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name='remote-tz' options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name='timeline' options={{ animation: 'slide_from_right' }} />
      </Stack>
    </>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
