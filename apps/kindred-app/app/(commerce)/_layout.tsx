import { kindredPaper } from '@zhop/hexastral-tokens/kindred'
import { Stack } from 'expo-router'

export default function CommerceLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Shared 宣纸 document layer — same surface as the reading + settings.
        contentStyle: { backgroundColor: kindredPaper.bg },
        animation: 'slide_from_bottom',
        presentation: 'modal',
      }}
    />
  )
}
