/**
 * Breathing light-spot markers on normalized photo coordinates.
 * Active (selected) star: larger ring + brighter core so it is unmistakable.
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
import { mapNormToContainStage, type ImageSize } from '@/lib/image-stage-layout'

function BreathSpot({
  star,
  stageW,
  stageH,
  imageSize,
  accent,
  selected,
  onPress,
}: {
  star: LocusStar
  stageW: number
  stageH: number
  imageSize: ImageSize | null
  accent: string
  selected: boolean
  onPress: () => void
}) {
  const pulse = useSharedValue(0.45)
  const cited = star.fromReading

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: selected ? 700 : 1100 }),
        withTiming(selected ? 0.55 : 0.4, { duration: selected ? 700 : 1100 })
      ),
      -1,
      false
    )
  }, [pulse, selected])

  const glow = useAnimatedStyle(() => {
    const base = selected ? 0.42 : cited ? 0.24 : 0.14
    const amp = selected ? 0.42 : cited ? 0.36 : 0.24
    const scaleBase = selected ? 1.15 : 0.9
    const scaleAmp = selected ? 0.55 : cited ? 0.6 : 0.42
    return {
      opacity: base + pulse.value * amp,
      transform: [{ scale: scaleBase + pulse.value * scaleAmp }],
    }
  })

  const core = useAnimatedStyle(() => {
    const base = selected ? 0.95 : cited ? 0.7 : 0.42
    const amp = selected ? 0.05 : cited ? 0.3 : 0.28
    return {
      opacity: base + pulse.value * amp,
      transform: [{ scale: selected ? 1 : 0.85 + pulse.value * 0.2 }],
    }
  })

  const ring = useAnimatedStyle(() => ({
    opacity: selected ? 0.85 + pulse.value * 0.15 : 0,
    transform: [{ scale: selected ? 0.95 + pulse.value * 0.12 : 0.8 }],
  }))

  const coreSize = selected ? 14 : cited ? 11 : 7
  const hit = selected ? 40 : 32
  const pos =
    imageSize != null
      ? mapNormToContainStage(star.x, star.y, stageW, stageH, imageSize)
      : { x: star.x * stageW, y: star.y * stageH }
  const left = pos.x - hit / 2
  const top = pos.y - hit / 2

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={star.locus}
      accessibilityState={{ selected }}
      style={{
        position: 'absolute',
        left,
        top,
        width: hit,
        height: hit,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: selected ? 20 : 1,
      }}
      hitSlop={10}
    >
      {/* Selection ring — only when active */}
      <Animated.View
        pointerEvents='none'
        style={[
          {
            position: 'absolute',
            width: 34,
            height: 34,
            borderRadius: 17,
            borderWidth: 2,
            borderColor: accent,
            backgroundColor: 'transparent',
          },
          ring,
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: selected ? 34 : 28,
            height: selected ? 34 : 28,
            borderRadius: selected ? 17 : 14,
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
  imageSize,
  accent,
  selectedKey,
  onSelect,
}: {
  stars: LocusStar[]
  stageW: number
  stageH: number
  /** When set, stars map through contain letterbox (matches resizeMode="contain"). */
  imageSize?: ImageSize | null
  accent: string
  /** featureKey of the star whose sheet is open — visual highlight. */
  selectedKey?: string | null
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
          imageSize={imageSize ?? null}
          accent={accent}
          selected={selectedKey === star.featureKey}
          onPress={() => onSelect(star)}
        />
      ))}
    </View>
  )
}
