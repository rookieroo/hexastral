/**
 * LuopanLoader — a slowly-rotating 罗盘 (luopan) used as Fēng's loading state.
 *
 * Reuses the shared pure-SVG `BaguaCompassOverlay` (24山 ring + 八卦 wedges) and
 * spins it with Reanimated — no Skia dep. The center 朱砂 needle stays fixed
 * (天池/磁针) while the plate turns, echoing a real 罗盘 in use. Honors
 * reduce-motion (renders static).
 *
 * Replaces plain text/skeleton loaders on the report + analyze surfaces so the
 * wait itself carries the feng-shui identity.
 */

import { BaguaCompassOverlay } from '@zhop/scenario-feng'
import { useEffect } from 'react'
import { Text, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { FENG_PALETTE, spacing } from '@/lib/theme'

interface LuopanLoaderProps {
  size?: number
  label?: string
}

export function LuopanLoader({ size = 168, label }: LuopanLoaderProps) {
  const spin = useSharedValue(0)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion) return
    spin.value = withRepeat(withTiming(360, { duration: 16000, easing: Easing.linear }), -1, false)
  }, [spin, reduceMotion])

  const plateStyle = useAnimatedStyle(() => ({ transform: [{ rotateZ: `${spin.value}deg` }] }))

  return (
    <View
      accessibilityRole='progressbar'
      accessibilityLabel={label}
      style={{ alignItems: 'center', gap: spacing.lg }}
    >
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={plateStyle}>
          <BaguaCompassOverlay
            size={size}
            showWedges
            showMountains
            showCardinals={false}
            ringColor='rgba(176,141,91,0.40)'
            labelColor='rgba(176,141,91,0.70)'
            labelMajorColor={FENG_PALETTE.copperGold}
          />
        </Animated.View>
        {/* 天池磁针 — fixed center needle (does not rotate with the plate). */}
        <View
          style={{
            position: 'absolute',
            width: 2,
            height: size * 0.34,
            borderRadius: 1,
            backgroundColor: FENG_PALETTE.cinnabar,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: FENG_PALETTE.cinnabar,
          }}
        />
      </View>
      {label ? (
        <Text style={{ color: FENG_PALETTE.riceMute, fontSize: 13, letterSpacing: 1 }}>
          {label}
        </Text>
      ) : null}
    </View>
  )
}
