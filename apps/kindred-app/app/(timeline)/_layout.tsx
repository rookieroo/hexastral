import { kindredDark } from '@zhop/hexastral-tokens/kindred'
import { Stack } from 'expo-router'

export default function TimelineLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: kindredDark.bg },
        animation: 'slide_from_right',
        // Edge-only (not fullScreen): the timeline scrubs horizontally, so a
        // full-screen back-swipe would fight it.
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name='index' />
    </Stack>
  )
}
