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
        // Edge-only back-swipe (NOT full-screen): the glossary + settings are long
        // vertical scrolls, and a full-screen back-swipe fired on an up-flick that
        // drifted sideways — and dismissed the whole group to home instead of popping
        // one screen. Edge-only requires a deliberate left-edge horizontal intent;
        // an up-swipe is never mistaken for it.
        fullScreenGestureEnabled: false,
      }}
    >
      {/* The glossary + symbol gallery are long scroll pages — replace the native
          back-swipe with EdgeBackSwipe (angle-gated, so a diagonal up-flick can't
          trigger it). Native gesture off here so the two don't both grab the swipe. */}
      <Stack.Screen name='terms' options={{ gestureEnabled: false }} />
      <Stack.Screen name='glossary' options={{ gestureEnabled: false }} />
    </Stack>
  )
}
