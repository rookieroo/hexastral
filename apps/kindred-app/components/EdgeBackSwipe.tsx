/**
 * EdgeBackSwipe — a back-swipe that monitors the swipe's ANGLE, so it only fires on a
 * deliberate horizontal intent. The native stack gesture can't gate on angle, so a
 * diagonal up-right flick on a long scroll page kept triggering back. Here a Pan
 * activates only when horizontal motion leads (activeOffsetX) and a mostly-vertical
 * drag fails out to the ScrollView (failOffsetY); at release we also require the
 * horizontal travel to dominate the vertical by a clear margin before navigating.
 *
 * Use on scrollable document screens (glossary / symbol gallery) with the native
 * screen gesture DISABLED (gestureEnabled:false) so the two don't both grab the swipe.
 */

import type { ReactNode } from 'react'
import { View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'

export function EdgeBackSwipe({
  onBack,
  children,
}: {
  onBack: () => void
  children: ReactNode
}) {
  const pan = Gesture.Pan()
    // Activate only on a rightward horizontal lead; a vertical move past ±24 first
    // fails the gesture so the page scrolls instead.
    .activeOffsetX([20, 9999])
    .failOffsetY([-24, 24])
    .onEnd((e) => {
      // Angle gate: horizontal travel must clearly dominate the vertical (≈ within
      // ~22° of horizontal) AND be a real rightward swipe before we go back.
      if (
        e.translationX > 72 &&
        e.translationX > Math.abs(e.translationY) * 2.5 &&
        e.velocityX > 0
      ) {
        runOnJS(onBack)()
      }
    })

  return (
    <GestureDetector gesture={pan}>
      <View style={{ flex: 1 }}>{children}</View>
    </GestureDetector>
  )
}
