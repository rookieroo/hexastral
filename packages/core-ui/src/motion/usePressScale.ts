/**
 * usePressScale — Reanimated v4 worklet for tap-state scale-down.
 *
 * Returns shared values + handlers that any `<Pressable>` can wire up. The
 * scale animates with motion.spring.snap (critically damped, no overshoot)
 * so taps feel responsive without a bounce.
 */

import { spring } from '@zhop/hexastral-tokens/motion'
import { useCallback } from 'react'
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'

export interface UsePressScaleArgs {
  /** Scale value at press-in. Default 0.97. */
  pressedScale?: number
}

export function usePressScale(args: UsePressScaleArgs = {}) {
  const { pressedScale = 0.97 } = args
  const scale = useSharedValue(1)

  const onPressIn = useCallback(() => {
    scale.value = withSpring(pressedScale, spring.snap)
  }, [scale, pressedScale])

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, spring.snap)
  }, [scale])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return { animatedStyle, onPressIn, onPressOut }
}
