/**
 * KindredSeal — the cinnabar Kindred stamp.
 *
 * Used in:
 *   1. Onboarding welcome screen (slow breathing animation)
 *   2. Reveal moment after creating a bond (slam-down animation + Heavy haptic)
 *   3. Shareable chapter cards (static, as the brand mark)
 *
 * The animation behavior is driven by `mode`. The seal itself is a 96x96 circle
 * of cinnabar.seal (#9B2226) with the Kindred glyph in ink.gold (#C4A882) centered.
 */

import { cinnabar, ink } from '@zhop/hexastral-tokens'
import * as Haptics from 'expo-haptics'
import { useEffect } from 'react'
import { Text, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

export type KindredSealMode =
  /** Slow breathing — for welcome screen idle state */
  | 'breathing'
  /** Slam-down with heavy haptic — fires once on mount */
  | 'stamp'
  /** Static, no animation — for share cards and chapter headers */
  | 'static'

export interface KindredSealProps {
  size?: number
  mode?: KindredSealMode
  /** Delay before stamp animation starts, in ms. Ignored for other modes. */
  stampDelayMs?: number
}

const STAMP_EASING = Easing.bezier(0.32, 0.0, 0.67, 0.32)

export function KindredSeal({ size = 96, mode = 'static', stampDelayMs = 0 }: KindredSealProps) {
  const scale = useSharedValue(mode === 'stamp' ? 1.5 : 1.0)
  const opacity = useSharedValue(mode === 'stamp' ? 0 : 1)
  const rotate = useSharedValue(mode === 'stamp' ? -8 : 0)

  useEffect(() => {
    if (mode === 'breathing') {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.0, { duration: 1200, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    } else if (mode === 'stamp') {
      const startStamp = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        scale.value = withTiming(1.0, { duration: 320, easing: STAMP_EASING })
        opacity.value = withTiming(1.0, { duration: 320 })
        rotate.value = withTiming(0, { duration: 320, easing: STAMP_EASING })
      }
      if (stampDelayMs > 0) {
        opacity.value = withDelay(stampDelayMs, withTiming(opacity.value))
        const timer = setTimeout(startStamp, stampDelayMs)
        return () => clearTimeout(timer)
      }
      startStamp()
    }
  }, [mode, stampDelayMs])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
    opacity: opacity.value,
  }))

  // A single seal glyph — 緣, the fate-bond this app is built on — sized to sit
  // inside the disc with margin. (Was the literal word "Kindred" at 0.5·size,
  // which overflowed the circle and clipped to "Kind".)
  const glyphSize = Math.round(size * 0.52)

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: cinnabar.seal,
          alignItems: 'center',
          justifyContent: 'center',
        },
        animatedStyle,
      ]}
    >
      <Text
        numberOfLines={1}
        style={{
          fontSize: glyphSize,
          lineHeight: glyphSize * 1.1,
          color: ink.gold,
          fontWeight: '400',
          textAlign: 'center',
          includeFontPadding: false,
        }}
      >
        緣
      </Text>
    </Animated.View>
  )
}
