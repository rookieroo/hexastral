/**
 * App surface — Stack, NO bottom tabs (Kanyu / Yuel model).
 * Home + settings as stack pushes; funnel lives on root stack.
 */

import { darkTokens } from '@zhop/hexastral-tokens/palette'
import { Stack } from 'expo-router'

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        contentStyle: { backgroundColor: darkTokens.bg },
      }}
    >
      {/* none: first mount after intro must not slide in again */}
      <Stack.Screen name='index' options={{ animation: 'none' }} />
      <Stack.Screen name='archive' />
      <Stack.Screen name='settings' />
      <Stack.Screen name='usage' />
    </Stack>
  )
}
