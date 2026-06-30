/**
 * App surface layout — Stack, NO bottom tabs (Yuel/kindred navigation model).
 *
 * The bottom-4-tab layout is retired. `index` is the home (sites + FAB);
 * `profile` is the Settings route reached via the home's gear button and a
 * left-swipe (edge-only back-swipe so long scrolls don't dismiss it);
 * `compass` / `readings` are stack routes reached from home / settings —
 * not sibling tabs.
 */

import { Stack } from 'expo-router'
import { FENG_PALETTE } from '@/lib/theme'

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: FENG_PALETTE.inkTeal },
      }}
    >
      <Stack.Screen name='index' />
      <Stack.Screen name='profile' options={{ fullScreenGestureEnabled: false }} />
      <Stack.Screen name='compass' />
      <Stack.Screen name='readings' />
    </Stack>
  )
}
