/**
 * Breathing light-spot markers on normalized photo coordinates.
 * Pulse loop never restarts on select — selection uses a separate progress SV.
 */

import { useEffect } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { type ImageSize, mapNormToContainStage } from '@/lib/image-stage-layout'
import type { LocusStar } from '@/lib/locus-data'

function BreathSpot({
  star,
  stageW,
  stageH,
  imageSize,
  accent,
  selected,
  debugSource,
  onPress,
}: {
  star: LocusStar
  stageW: number
  stageH: number
  imageSize: ImageSize | null
  accent: string
  selected: boolean
  /** __DEV__ only: photo vs canon provenance */
  debugSource?: 'photo' | 'canon' | null
  onPress: () => void
}) {
  const pulse = useSharedValue(0.45)
  const selectedProgress = useSharedValue(selected ? 1 : 0)
  const cited = star.fromReading

  // Start breath once; do not depend on `selected` (avoids flash on swap).
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 1600 }), withTiming(0.42, { duration: 1600 })),
      -1,
      false
    )
  }, [pulse])

  useEffect(() => {
    selectedProgress.value = withTiming(selected ? 1 : 0, { duration: 220 })
  }, [selected, selectedProgress])

  const glow = useAnimatedStyle(() => {
    const sel = selectedProgress.value
    const base = 0.12 + (cited ? 0.1 : 0) + sel * 0.28
    const amp = 0.1 + (cited ? 0.08 : 0) + sel * 0.12
    const scaleBase = 0.92 + sel * 0.22
    const scaleAmp = 0.18 + sel * 0.12
    return {
      opacity: base + pulse.value * amp,
      transform: [{ scale: scaleBase + pulse.value * scaleAmp }],
    }
  })

  const core = useAnimatedStyle(() => {
    const sel = selectedProgress.value
    const base = (cited ? 0.55 : 0.38) + sel * 0.35
    const amp = 0.12 * (1 - sel * 0.7)
    return {
      opacity: base + pulse.value * amp,
      transform: [{ scale: 0.9 + pulse.value * 0.12 * (1 - sel) + sel * 0.08 }],
    }
  })

  const ring = useAnimatedStyle(() => ({
    opacity: selectedProgress.value * (0.75 + pulse.value * 0.15),
    transform: [{ scale: 0.88 + selectedProgress.value * 0.14 + pulse.value * 0.04 }],
  }))

  const coreSize = selected ? 14 : cited ? 10 : 7
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
            width: selected ? 32 : 26,
            height: selected ? 32 : 26,
            borderRadius: selected ? 16 : 13,
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
      {__DEV__ && debugSource ? (
        <Text
          style={{
            position: 'absolute',
            top: -10,
            fontSize: 7,
            color: debugSource === 'photo' ? accent : '#888',
          }}
        >
          {debugSource === 'photo' ? 'P' : 'C'}
        </Text>
      ) : null}
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
  debugSources,
  onSelect,
}: {
  stars: LocusStar[]
  stageW: number
  stageH: number
  imageSize?: ImageSize | null
  accent: string
  selectedKey?: string | null
  /** __DEV__: featureKey → photo|canon */
  debugSources?: Record<string, 'photo' | 'canon'> | null
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
          debugSource={debugSources?.[star.featureKey] ?? null}
          onPress={() => onSelect(star)}
        />
      ))}
    </View>
  )
}
