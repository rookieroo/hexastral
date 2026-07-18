import { darkTokens } from '@zhop/hexastral-tokens/palette'
import { Stack } from 'expo-router'

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { flex: 1, backgroundColor: darkTokens.bg },
      }}
    />
  )
}
