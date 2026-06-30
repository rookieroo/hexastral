/**
 * (glossary) — the 风水 terms reference. Reached from Settings → tools and from
 * the inline FengTermBubble. Reads on the 宣纸 ground like the report itself.
 */

import { Stack } from 'expo-router'
import { FENG_PAPER } from '@/lib/theme'

export default function GlossaryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: FENG_PAPER.bg },
      }}
    />
  )
}
