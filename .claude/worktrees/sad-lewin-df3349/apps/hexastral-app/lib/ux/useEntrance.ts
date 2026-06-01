/**
 * useEntrance — staggered fade-in + slide-up entrance animation (RN Animated API)
 *
 * Usage:
 *   const { animatedStyle } = useEntrance(300)
 *   <Animated.View style={animatedStyle}>...</Animated.View>
 */

import { useEffect, useRef } from 'react'
import { Animated, Easing } from 'react-native'

const DURATION = 600
const SLIDE_DISTANCE = 20

export function useEntrance(delay = 0) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(SLIDE_DISTANCE)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: DURATION,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: DURATION,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translateY, opacity, delay])

  return { animatedStyle: { opacity, transform: [{ translateY }] } }
}
