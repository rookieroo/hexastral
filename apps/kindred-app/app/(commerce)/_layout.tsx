import { ricePaper } from '@zhop/hexastral-tokens'
import { Stack } from 'expo-router'

export default function CommerceLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: ricePaper.ivory },
        animation: 'slide_from_bottom',
        presentation: 'modal',
      }}
    />
  )
}
