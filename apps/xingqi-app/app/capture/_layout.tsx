import { darkTokens } from '@zhop/hexastral-tokens/palette'
import { Stack } from 'expo-router'

/**
 * Three photo steps as a real stack — iOS edge / full-screen back is the only
 * horizontal gesture (no custom pan). Step 1 back → previous root screen (home).
 */
export default function CaptureLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        contentStyle: { flex: 1, backgroundColor: darkTokens.bg },
      }}
    >
      <Stack.Screen name='index' />
      <Stack.Screen name='right' />
      <Stack.Screen name='face' />
    </Stack>
  )
}
