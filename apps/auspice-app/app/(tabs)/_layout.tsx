/**
 * Home group (ADR-0018) — no bottom tab bar. Today is home; Me is a drill-in
 * from the header settings icon. Month expands inline on Today (no /calendar 负一屏).
 */
import { useTheme } from '@zhop/core-ui'
import { Stack } from 'expo-router'

export default function AuspiceHomeStackLayout() {
  const { colors } = useTheme()
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name='index' />
      <Stack.Screen name='me' options={{ animation: 'slide_from_right' }} />
    </Stack>
  )
}
