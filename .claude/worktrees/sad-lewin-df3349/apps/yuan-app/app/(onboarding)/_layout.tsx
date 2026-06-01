import { Stack } from 'expo-router'
import { ricePaper } from '@zhop/hexastral-tokens'

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: ricePaper.ivory },
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    />
  )
}
