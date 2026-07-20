/**
 * Breathing light-spot markers on normalized photo coordinates.
 */

import { useEffect } from 'react'
import { Pressable, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

import type { LocusStar } from '@/lib/locus-data'

function BreathSpot({
  star,
  stageW,
  stageH,
  accent,
  onPress,
}: {
  star: LocusStar
  stageW: number
  stageH: number
  accent: string
  onPress: () => void
}) {
  const pulse = useSharedValue(0.45)
  // Cited loci (a reading note exists) breathe brighter with a solid core;
  // teaching-only loci stay a faint, smaller spot.
  const cited = star.fromReading

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 1100 }), withTiming(0.4, { duration: 1100 })),
      -1,
      false
    )
  }, [pulse])

  const glow = useAnimatedStyle(() => ({
    opacity: (cited ? 0.24 : 0.14) + pulse.value * (cited ? 0.36 : 0.24),
    transform: [{ scale: 0.9 + pulse.value * (cited ? 0.6 : 0.42) }],
  }))

  const core = useAnimatedStyle(() => ({
    opacity: (cited ? 0.7 : 0.42) + pulse.value * (cited ? 0.3 : 0.28),
    transform: [{ scale: 0.85 + pulse.value * 0.2 }],
  }))

  const coreSize = cited ? 11 : 7
  const left = star.x * stageW - 16
  const top = star.y * stageH - 16

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={star.locus}
      style={{
        position: 'absolute',
        left,
        top,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      hitSlop={10}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: accent,
          },
          glow,
        ]}
      />
      <Animated.View
        style={[
          {
            width: coreSize,
            height: coreSize,
            borderRadius: coreSize / 2,
            backgroundColor: accent,
          },
          core,
        ]}
      />
    </Pressable>
  )
}

export function LocusStarLayer({
  stars,
  stageW,
  stageH,
  accent,
  onSelect,
}: {
  stars: LocusStar[]
  stageW: number
  stageH: number
  accent: string
  onSelect: (star: LocusStar) => void
}) {
  if (stageW <= 0 || stageH <= 0) return null
  return (
    <View pointerEvents='box-none' style={{ position: 'absolute', inset: 0 }}>
      {stars.map((star) => (
        <BreathSpot
          key={star.featureKey}
          star={star}
          stageW={stageW}
          stageH={stageH}
          accent={accent}
          onPress={() => onSelect(star)}
        />
      ))}
    </View>
  )
}
