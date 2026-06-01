/**
 * useBreathing — subtle infinite scale pulse for the planet logo (RN Animated API)
 *
 * Usage:
 *   const { animatedStyle } = useBreathing()
 *   <Animated.View style={animatedStyle}>...</Animated.View>
 */

import { useEffect, useRef } from 'react'
import { Animated, Easing } from 'react-native'

const SCALE_PEAK = 1.03
const HALF = 1500

export function useBreathing() {
  const scale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: SCALE_PEAK,
          duration: HALF,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: HALF,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    )
    anim.start()
    return () => anim.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale])

  return { animatedStyle: { transform: [{ scale }] } }
}
