import { Stack } from 'expo-router'
import { useFengTheme } from '@/lib/theme'

export default function NewSiteLayout() {
  const { colors } = useFengTheme()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    />
  )
}
