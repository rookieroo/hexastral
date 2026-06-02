/**
 * Home group (ADR-0018) — no bottom tab bar. The tab bar stacked chrome over the
 * 黄历, so it's gone. This is a plain stack: Today is home; Month and Me are
 * drill-ins that slide in from the right. Me is also reachable by swiping left on
 * Today (the shared SWIPE_TO_ME gesture); Month by an explicit entry on Today.
 * 节气 / 节日 land as their own drill-in routes in Sprint 3.
 */
import { useTheme } from '@zhop/core-ui'
import { Stack } from 'expo-router'

export default function CycleHomeStackLayout() {
  const { colors } = useTheme()
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name='index' />
      <Stack.Screen name='me' options={{ animation: 'slide_from_right' }} />
    </Stack>
  )
}
