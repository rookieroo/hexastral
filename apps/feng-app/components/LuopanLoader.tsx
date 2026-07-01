/**
 * LuopanLoader — the brand's 综合盘 (full 罗盘) used as Fēng's loading state.
 *
 * Spins the pure-SVG `LuopanDial` at `detail='full'` — the same instrument the
 * Compass tab and cold-open render, so the loader now reads as the real 罗盘
 * turning under the reader's eye rather than a stripped-down disc. No Skia.
 * Honors reduce-motion (renders static). Dark-only (the app + report are a dark
 * zinc ground now).
 */

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
import { FENG_PALETTE } from '@/lib/theme'
import { LuopanDial } from './LuopanDial'

interface LuopanLoaderProps {
  size?: number
  label?: string
}

export function LuopanLoader({ size = 200, label }: LuopanLoaderProps) {
  const spin = useSharedValue(0)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion) return
    // Slower than the old minimal dial — the dense 综合盘 reads calmer turning slowly.
    spin.value = withRepeat(withTiming(360, { duration: 26000, easing: Easing.linear }), -1, false)
  }, [spin, reduceMotion])

  const plateStyle = useAnimatedStyle(() => ({ transform: [{ rotateZ: `${spin.value}deg` }] }))

  return (
    <View
      accessibilityRole='progressbar'
      accessibilityLabel={label}
      style={{ alignItems: 'center', gap: 16 }}
    >
      <Animated.View style={plateStyle}>
        <LuopanDial size={size} detail='full' />
      </Animated.View>
      {label ? (
        <Text style={{ color: FENG_PALETTE.riceMute, fontSize: 13, letterSpacing: 1 }}>{label}</Text>
      ) : null}
    </View>
  )
}
