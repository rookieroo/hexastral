/**
 * XingqiLoader — brand mark as motion: three beads, adjacent dots move opposite
 * vertically (↑↓↑ sine). Use instead of ActivityIndicator in Xingqi surfaces.
 */

import { useTheme } from '@zhop/core-ui'
import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

const BEAD_META = [
  { r: 5.5, opacity: 0.28, phase: 0 },
  { r: 4.2, opacity: 0.62, phase: Math.PI },
  { r: 3.2, opacity: 0.95, phase: 0 },
] as const

const CYCLE_MS = 900
const AMP = 5.5

interface XingqiLoaderProps {
  size?: number
  /** Accessibility label */
  label?: string
}

function Bead({
  r,
  color,
  opacity,
  phase,
  progress,
  gap,
}: {
  r: number
  color: string
  opacity: number
  phase: number
  progress: SharedValue<number>
  gap: number
}) {
  const style = useAnimatedStyle(() => {
    const y = Math.sin(progress.value * Math.PI * 2 + phase) * AMP
    return {
      transform: [{ translateY: y }],
    }
  })

  return (
    <Animated.View
      style={[
        {
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          backgroundColor: color,
          opacity,
          marginHorizontal: gap / 2,
        },
        style,
      ]}
    />
  )
}

export function XingqiLoader({ size = 44, label = 'Loading' }: XingqiLoaderProps) {
  const { colors } = useTheme()
  const progress = useSharedValue(0)
  const gap = Math.max(4, size * 0.12)

  useEffect(() => {
    progress.value = 0
    progress.value = withRepeat(
      withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }),
      -1,
      false
    )
  }, [progress])

  return (
    <View
      accessibilityRole='progressbar'
      accessibilityLabel={label}
      style={{
        height: size,
        minWidth: size * 1.6,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {BEAD_META.map((b, i) => (
        <Bead key={i} {...b} color={colors.accent} progress={progress} gap={gap} />
      ))}
    </View>
  )
}
