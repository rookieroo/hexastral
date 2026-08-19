import { useTheme } from '@zhop/core-ui'
import { Stack } from 'expo-router'

export default function AppLayout() {
  const { colors } = useTheme()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name='index' options={{ animation: 'none' }} />
      <Stack.Screen name='archive' />
      <Stack.Screen name='settings' />
      <Stack.Screen name='usage' />
    </Stack>
  )
}
