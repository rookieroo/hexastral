/**
 * Birth onboarding layout (Phase C.1).
 *
 * Form-as-conversation pattern: each question is its own screen, swiped from
 * right with a 300ms spring. Mirrors yuan-app's onboarding shell but uses
 * hexastral-app's auto-themed background.
 */

import { Stack } from 'expo-router'
import { useIosPalette } from '@/lib/theme'

export default function BirthLayout() {
  const ios = useIosPalette()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: ios.bg },
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    />
  )
}
