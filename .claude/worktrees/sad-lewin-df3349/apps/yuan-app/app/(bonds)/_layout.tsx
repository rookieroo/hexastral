import { Stack } from 'expo-router'
import { ricePaper } from '@zhop/hexastral-tokens'

export default function BondsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: ricePaper.ivory },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  )
}
