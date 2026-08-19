import { useTheme } from '@zhop/core-ui'
import { Stack } from 'expo-router'

/**
 * Single stacked-slot capture screen. right/face remain as redirects for old links.
 */
export default function CaptureLayout() {
  const { colors } = useTheme()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        contentStyle: { flex: 1, backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name='index' />
      <Stack.Screen name='right' />
      <Stack.Screen name='face' />
    </Stack>
  )
}
