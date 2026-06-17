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
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    >
      {/* The 命理 glossary is a long vertical scroll — a full-screen back-swipe
          fires on an up-flick that drifts sideways. Keep edge-swipe-back, drop the
          full-screen variant so scrolling never navigates. */}
      <Stack.Screen name='terms' options={{ fullScreenGestureEnabled: false }} />
    </Stack>
  )
}
