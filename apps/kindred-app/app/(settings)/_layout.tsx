import { kindredPaper } from '@zhop/hexastral-tokens/kindred'
import { Stack } from 'expo-router'

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Shared 宣纸 document layer — same surface as the reading + paywall.
        contentStyle: { backgroundColor: kindredPaper.bg },
        animation: 'slide_from_right',
      }}
    />
  )
}
