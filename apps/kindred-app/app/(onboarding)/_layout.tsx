import { kindredDark } from '@zhop/hexastral-tokens/kindred'
import { Stack } from 'expo-router'

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: kindredDark.bg },
        animation: 'slide_from_right',
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    >
      {/* Intro is a one-shot cinematic — suppress edge-swipe back to nothing. */}
      <Stack.Screen name='intro' options={{ gestureEnabled: false }} />
      {/* Cross-fade (not slide) in from the intro so the brand moon reads as one
          continuous logo carrying across into the form (magic-move continuity). */}
      <Stack.Screen name='pair-input' options={{ animation: 'fade' }} />
      {/* Reveal masks API latency with its own ceremony — no edge-swipe back. */}
      <Stack.Screen name='reveal' options={{ gestureEnabled: false }} />
    </Stack>
  )
}
