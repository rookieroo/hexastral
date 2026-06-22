/**
 * Auspice root layout — Tier-3 satellite shape (ADR-0010).
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
import * as Linking from 'expo-linking'
import { type Href, Stack, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useRef } from 'react'
import { StyleSheet, useColorScheme } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { getAuspiceBirthDate, getAuspiceBirthInfo } from '@/lib/birth'
import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { LocaleProvider, useStrings } from '@/lib/i18n-context'
import { parseKindredComposeUrl } from '@/lib/kindred-import'
import { addPerson, getPeople } from '@/lib/people'
import { getAuspiceProActive } from '@/lib/pro'
import {
  addAuspiceNotificationTapListener,
  configureNotifications,
  purgeStaleNotificationsOnce,
  refreshDailyPush,
  refreshTimelineReminders,
  scheduleBirthdayReminders,
  syncServerPush,
} from '@/lib/push'
import { migrateBirthdaysToServerOnce } from '@/lib/serverPush'
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
  // Auspice defaults light — 黄历 reads best on warm paper; honor explicit dark mode.
  const mode: 'light' | 'dark' = scheme === 'dark' ? 'dark' : 'light'

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        {/* Accent LOCKED to 苍墨 ink (2026-06): the brand mark + page feel are one
            fixed ink identity — no user accent switcher. */}
        <CoreUIProvider brand='cycle' mode={mode} accentVariant='ink'>
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
    // One-time purge of stale notifications (old id schemes → duplicate spam),
    // THEN rebuild a clean set: the daily window + 亲友 birthdays.
    void (async () => {
      await purgeStaleNotificationsOnce()
      const birthDate = (await getAuspiceBirthDate().catch(() => undefined)) ?? undefined
      const info = await getAuspiceBirthInfo().catch(() => null)
      const people = await getPeople().catch(() => [])
      // Real server push: register/unregister this device to match the local
      // enable flags (daily; birthday rides along). The cron then delivers
      // reliably even if the app isn't reopened. Once registered, the local
      // daily/birthday schedulers below no-op (server owns them); on failure
      // they run as the local fallback. (节假日 heads-up removed — see me.tsx.)
      await syncServerPush(locale)
      await migrateBirthdaysToServerOnce(people, await getAuspiceProActive().catch(() => false))
      await refreshDailyPush({ locale, birthDate })
      await scheduleBirthdayReminders(people, locale)
      // 人生节点提醒 (Pro) — self-clears if disabled / not Pro / no birth gender.
      if (info?.gender) {
        await refreshTimelineReminders({
          locale,
          birthDate: info.solarDate,
          birthHour: info.timeIndex === null ? -1 : info.timeIndex * 2,
          gender: info.gender === '男' ? 'M' : 'F',
        })
      }
    })()
  }, [locale])

  // Kindred → Auspice import: a `auspice://compose?...` hand-off adds the
  // person to 亲友 and lands on the list. Deduped by URL so the initial-URL +
  // event-listener pair don't double-add the same link.
  const lastComposeRef = useRef<string | null>(null)
  useEffect(() => {
    const handle = async (url: string | null) => {
      if (!url || url === lastComposeRef.current) return
      const input = parseKindredComposeUrl(url)
      if (!input) return
      lastComposeRef.current = url
      await addPerson(input)
      router.push('/people')
    }
    void Linking.getInitialURL().then(handle)
    const sub = Linking.addEventListener('url', ({ url }) => void handle(url))
    return () => sub.remove()
  }, [router])

  // Notification tap → deep-link Today to the notification's date.
  useEffect(() => {
    return addAuspiceNotificationTapListener(({ day, route }) => {
      if (route) router.push(route as Href)
      else if (day) router.push({ pathname: '/', params: { day } })
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
        <Stack.Screen name='welcome' options={{ animation: 'fade' }} />
        <Stack.Screen name='(tabs)' />
        <Stack.Screen name='display' options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name='event' options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name='festival/[id]' options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name='glossary' options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name='reading' options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name='people' options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name='remote-tz' options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name='timeline' options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name='makeif' options={{ animation: 'slide_from_right' }} />
      </Stack>
    </>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
