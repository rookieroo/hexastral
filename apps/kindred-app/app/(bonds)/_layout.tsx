import { kindredDark } from '@zhop/hexastral-tokens/kindred'
import { Stack } from 'expo-router'

export default function BondsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: kindredDark.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name='index' />
      <Stack.Screen name='[id]' />
      <Stack.Screen name='chat' />
    </Stack>
  )
}
