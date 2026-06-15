import { kindredDark } from '@zhop/hexastral-tokens/kindred'
import { Stack } from 'expo-router'

export default function BondsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: kindredDark.bg },
        animation: 'slide_from_right',
        // Edge-only (not fullScreen): the report's ChapterPager + make-if scroll
        // horizontally, so keep the back-swipe to the left edge.
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name='index' />
      {/* The report owns its own 水墨晕开 entrance (ReportBloom), so suppress the
          slide and let the ink bloom be the transition. */}
      <Stack.Screen name='[id]' options={{ animation: 'fade' }} />
      <Stack.Screen name='chat' />
    </Stack>
  )
}
