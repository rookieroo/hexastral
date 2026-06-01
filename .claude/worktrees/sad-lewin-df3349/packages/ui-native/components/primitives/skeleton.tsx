/**
 * Skeleton — animated loading placeholder.
 * Uses a pulsing opacity animation on a surface-colored block.
 */
import { useEffect, useRef } from 'react'
import { Animated } from 'react-native'
import type { ViewStyle } from 'react-native'

interface SkeletonBoxProps {
  width: number | `${number}%`
  height: number
  borderRadius?: number
  style?: ViewStyle
  /** Surface color — pass from theme: isDark ? '#18181B' : '#F4F4F5' */
  color: string
}

export function SkeletonBox({ width, height, borderRadius = 4, style, color }: SkeletonBoxProps) {
  const opacity = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    )
    anim.start()
    return () => anim.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: color, opacity }, style]}
    />
  )
}
