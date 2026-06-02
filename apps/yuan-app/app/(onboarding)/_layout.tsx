import { ricePaper } from '@zhop/hexastral-tokens'
import { Stack } from 'expo-router'

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: ricePaper.ivory },
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      {/* pair-input owns its own entrance (figure settle), so suppress the
          horizontal slide and the edge-swipe back to the (deleted) welcome. */}
      <Stack.Screen name='pair-input' options={{ animation: 'fade', gestureEnabled: false }} />
    </Stack>
  )
}
