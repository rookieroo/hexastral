/**
 * useShimmer — looping opacity animation for skeleton screens.
 *
 * Returns an animated style that fades a placeholder block between 0.4 and
 * 0.8 opacity on a 1.4s cycle. Apply to a base-colored View to create the
 * shimmering skeleton effect.
 */

import { useEffect } from 'react'
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

export function useShimmer() {
  const opacity = useSharedValue(0.4)

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.8, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    )
  }, [opacity])

  return useAnimatedStyle(() => ({ opacity: opacity.value }))
}
