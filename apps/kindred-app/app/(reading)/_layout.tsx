import { kindredDark } from '@zhop/hexastral-tokens/kindred'
import { Stack } from 'expo-router'

export default function ReadingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: kindredDark.bg },
        animation: 'slide_from_right',
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    >
      <Stack.Screen name='index' />
      <Stack.Screen name='summary' />
    </Stack>
  )
}
