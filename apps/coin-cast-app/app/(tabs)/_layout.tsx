/**
 * App surface — Stack, NO bottom tabs (Fēng / Yuel navigation model).
 *
 * `index` is the casting home; `profile` is Settings (gear + left-swipe);
 * `history` is stack-pushed from profile.
 */
import { Stack } from 'expo-router'

export default function CoinCastTabsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name='index' />
      <Stack.Screen name='profile' options={{ fullScreenGestureEnabled: false }} />
      <Stack.Screen name='history' />
    </Stack>
  )
}
