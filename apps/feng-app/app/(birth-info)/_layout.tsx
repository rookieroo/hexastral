import { Stack } from 'expo-router'
import { useTheme } from '@zhop/core-ui'

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
