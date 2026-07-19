/**
 * XingqiLoader — brand mark as motion: three beads, adjacent dots move opposite
 * vertically (↑↓↑ sine). Use instead of ActivityIndicator in Xingqi surfaces.
 */

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

const BEADS = [
  { r: 5.5, color: '#FAFAFA', opacity: 1, phase: 0 },
  { r: 4.2, color: '#52A878', opacity: 0.85, phase: Math.PI },
  { r: 3.2, color: '#3F7B5C', opacity: 0.55, phase: 0 },
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
    // Adjacent beads: phase 0 vs π → opposite vertical direction.
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
      {BEADS.map((b, i) => (
        <Bead key={i} {...b} progress={progress} gap={gap} />
      ))}
    </View>
  )
}
