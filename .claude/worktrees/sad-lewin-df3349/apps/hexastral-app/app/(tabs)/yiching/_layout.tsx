/**
 * Yiching stack layout — wraps index + history as a nested stack
 * so both files register as a single tab group rather than two separate tabs.
 * The whole group is hidden from the tab bar via _layout.tsx href:null.
 */
import { Stack } from 'expo-router'

export default function YichingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: true, presentation: 'card' }}>
      <Stack.Screen name='index' />
      <Stack.Screen
        name='history'
        options={{ presentation: 'card', animation: 'slide_from_right', gestureEnabled: true }}
      />
    </Stack>
  )
}
