/**
 * (intro) — the cold-open group. Single screen, no header, night ground so the
 * launch → intro hand-off is seamless (BootSplash is the same 墨 night).
 */

import { Stack } from 'expo-router'
import { FENG_PALETTE } from '@/lib/theme'

export default function IntroLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: FENG_PALETTE.night },
      }}
    />
  )
}
