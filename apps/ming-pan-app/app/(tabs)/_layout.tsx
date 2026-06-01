import { Stack } from 'expo-router'

import { useAppTheme } from '@/lib/theme'

/**
 * Home group — was a bottom tab bar; the bar read as clutter over the FLIP home,
 * so it's gone. This is now a plain stack: navigation to Me is a left-swipe
 * gesture on home plus a top-right overflow menu. `me` slides in from the right
 * so the swipe reads as sliding across; the native edge-swipe returns home.
 */
export default function FateHomeStackLayout() {
  const { colors } = useAppTheme()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name='index' />
      <Stack.Screen name='me' options={{ animation: 'slide_from_right' }} />
    </Stack>
  )
}
