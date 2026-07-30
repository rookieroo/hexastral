import { useTheme } from '@zhop/core-ui'
import { Stack } from 'expo-router'

export default function BirthInfoLayout() {
  const { colors } = useTheme()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  )
}
