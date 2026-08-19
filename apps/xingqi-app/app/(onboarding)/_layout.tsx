import { useTheme } from '@zhop/core-ui'
import { Stack } from 'expo-router'

export default function OnboardingLayout() {
  const { colors } = useTheme()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { flex: 1, backgroundColor: colors.bg },
      }}
    />
  )
}
