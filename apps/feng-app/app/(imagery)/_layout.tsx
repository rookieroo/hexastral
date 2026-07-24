/**
 * (imagery) — legend for report 意象图 (symbolic chapter illustrations).
 * Reached from Settings → Learn.
 */

import { Stack } from 'expo-router'
import { FENG_PAPER } from '@/lib/theme'

export default function ImageryLayout() {
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
