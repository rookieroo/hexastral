/**
 * Yiching detail stack — guarantees gesture-enabled swipe-back
 * for the hexagram detail screen regardless of parent navigator.
 */
import { Stack } from 'expo-router'

export default function YichingDetailLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'card',
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    />
  )
}
