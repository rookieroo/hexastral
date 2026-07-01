/**
 * LuopanLoader — a slowly-rotating 罗盘 (luopan) used as Fēng's loading state.
 *
 * Spins the pure-SVG `LuopanDial` (内盘) with Reanimated — no Skia. The 天心十道
 * alignment threads stay fixed over the turning plate, echoing a real 罗盘 in
 * use. Honors reduce-motion (renders static). `tone` defaults to 'dark' — the
 * app + report are a dark zinc ground now; pass 'paper' only for a light surface.
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
import { FENG_PALETTE, FENG_PAPER } from '@/lib/theme'
import { LuopanDial, type LuopanTone } from './LuopanDial'

interface LuopanLoaderProps {
  size?: number
  label?: string
  tone?: LuopanTone
}

export function LuopanLoader({ size = 168, label, tone = 'dark' }: LuopanLoaderProps) {
  const spin = useSharedValue(0)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion) return
    spin.value = withRepeat(withTiming(360, { duration: 16000, easing: Easing.linear }), -1, false)
  }, [spin, reduceMotion])

  const plateStyle = useAnimatedStyle(() => ({ transform: [{ rotateZ: `${spin.value}deg` }] }))

  const thread = tone === 'paper' ? 'rgba(113,113,122,0.35)' : 'rgba(228,228,231,0.30)'
  const labelColor = tone === 'paper' ? FENG_PAPER.muted : FENG_PALETTE.riceMute

  return (
    <View
      accessibilityRole='progressbar'
      accessibilityLabel={label}
      style={{ alignItems: 'center', gap: 16 }}
    >
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={plateStyle}>
          <LuopanDial size={size} tone={tone} />
        </Animated.View>
        {/* 天心十道 — fixed alignment threads over the turning plate. */}
        <View style={{ position: 'absolute', width: size, height: 0.6, backgroundColor: thread }} />
        <View style={{ position: 'absolute', width: 0.6, height: size, backgroundColor: thread }} />
      </View>
      {label ? (
        <Text style={{ color: labelColor, fontSize: 13, letterSpacing: 1 }}>{label}</Text>
      ) : null}
    </View>
  )
}
