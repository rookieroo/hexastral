/**
 * SealStamp — 石章落印 sequenced animation.
 *
 * 1:1 port of HTML POC `.phone.stamping` keyframes (1200ms total):
 *   • chopDrop : stone seal falls from above, lands with bounce, holds,
 *                lifts away, exits the top
 *   • shadow   : drop-shadow under the chop appears at impact, fades
 *   • reveal   : the actual ink seal impression fades in at 56-100%
 *                (after the chop has pressed it)
 *   • bleed    : red ink halo blooms then dissipates around the seal
 *
 * Four layers all driven by a single `progress` SharedValue 0→1 with
 * piecewise interpolations matching the HTML keyframe percentages.
 *
 *   <SealStamp
 *     active={stamped}
 *     sealImage={require('../assets/xin.png')}
 *     chopImage={require('../assets/lilong.png')}
 *     onComplete={() => …}
 *     style={{ right: 24, bottom: 99 }}
 *   />
 */

import { useEffect } from 'react'
import { Image, type ImageSourcePropType, StyleSheet, View, type ViewStyle } from 'react-native'
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

// HTML POC defaults
const DEFAULT_DURATION = 1200
const DEFAULT_SIZE = 50
// HTML chop: height 132 (px in 50x50 luokuan). Ratio ≈ 2.64.
const CHOP_HEIGHT_RATIO = 2.64

// HTML chopDrop easing: cubic-bezier(.3,.7,.25,1)
const CHOP_EASING = Easing.bezier(0.3, 0.7, 0.25, 1)
// Other tracks use ease-out
const OTHER_EASING = Easing.out(Easing.cubic)

export type SealStampProps = {
  /** Trigger animation by setting true. Set false to reset. */
  active: boolean
  /** PNG of the ink seal impression (square, matches `size`). */
  sealImage: ImageSourcePropType
  /** PNG of the stone chop (tall — height ≈ 2.6× width). */
  chopImage: ImageSourcePropType
  /** Final seal size in px. Default 50 (HTML POC `.luokuan` size). */
  size?: number
  /** Total duration in ms. Default 1200ms (HTML POC). */
  duration?: number
  /** Called when the stamp animation lands and chop exits. */
  onComplete?: () => void
  /** Position the seal — typically `{ right: 24, bottom: 99, position: 'absolute' }`. */
  style?: ViewStyle
}

/**
 * Stone-chop falls, presses paper, ink seal appears, red halo blooms,
 * chop lifts away. Driven entirely by a single progress timeline so each
 * sub-animation stays perfectly in phase.
 */
export function SealStamp({
  active,
  sealImage,
  chopImage,
  size = DEFAULT_SIZE,
  duration = DEFAULT_DURATION,
  onComplete,
  style,
}: SealStampProps) {
  // 0 = idle, 1 = animation complete (chop exited, seal landed)
  const progress = useSharedValue(0)

  // Scale all the HTML keyframe-px values to current size (HTML was 50px)
  const k = size / DEFAULT_SIZE

  useEffect(() => {
    if (active) {
      progress.value = withTiming(1, { duration, easing: CHOP_EASING })
    } else {
      progress.value = 0
    }
  }, [active, duration, progress])

  // Fire onComplete when progress lands at 1
  useAnimatedReaction(
    () => progress.value,
    (cur, prev) => {
      if (!onComplete) return
      if (prev !== null && prev < 1 && cur >= 1) {
        runOnJS(onComplete)()
      }
    }
  )

  // chopDrop keyframes — translateY in px (HTML, scaled by k)
  // 0% -300, 28% -300 (hold opacity-only), 40% 0, 47% 4 (compression),
  // 54% 0 (bounce-back), 64% 0 (hold), 92% -148 (lift), 100% -310 (exit)
  const chopStyle = useAnimatedStyle(() => {
    const p = progress.value
    const ty = interpolate(
      p,
      [0, 0.28, 0.4, 0.47, 0.54, 0.64, 0.92, 1.0],
      [-300 * k, -300 * k, 0, 4 * k, 0, 0, -148 * k, -310 * k]
    )
    const sc = interpolate(p, [0, 0.47, 0.54, 1], [1, 0.992, 1, 1])
    const op = interpolate(p, [0, 0.28, 0.64, 0.92, 1.0], [0, 1, 1, 1, 0])
    return {
      opacity: op,
      transform: [{ translateX: -size / 2 }, { translateY: ty }, { scale: sc }],
    }
  })

  // shadow keyframes — opacity + scale
  // 0% 0/1.6, 40% .5/1, 48% .55/.94, 66% .1/1.5, 100% 0/—
  const shadowStyle = useAnimatedStyle(() => {
    const p = progress.value
    const op = interpolate(p, [0, 0.4, 0.48, 0.66, 1.0], [0, 0.5, 0.55, 0.1, 0])
    const sc = interpolate(p, [0, 0.4, 0.48, 0.66, 1.0], [1.6, 1.0, 0.94, 1.5, 1.5])
    return { opacity: op, transform: [{ translateX: -29 * k }, { scale: sc }] }
  })

  // yinji (seal impression) keyframes
  // 0%,56% 0/.95, 66% 1/1.04, 78% —/.99, 100% 1/1
  const sealStyle = useAnimatedStyle(() => {
    const p = progress.value
    const op = interpolate(p, [0, 0.56, 0.66, 1.0], [0, 0, 1, 1])
    const sc = interpolate(p, [0, 0.56, 0.66, 0.78, 1.0], [0.95, 0.95, 1.04, 0.99, 1])
    return { opacity: op, transform: [{ scale: sc }] }
  })

  // bleed (red halo) keyframes
  // 0%,56% 0/.4, 66% .5/1.06, 100% 0/1.5
  const bleedStyle = useAnimatedStyle(() => {
    const p = progress.value
    const op = interpolate(p, [0, 0.56, 0.66, 1.0], [0, 0, 0.5, 0])
    const sc = interpolate(p, [0, 0.56, 0.66, 1.0], [0.4, 0.4, 1.06, 1.5])
    return { opacity: op, transform: [{ scale: sc }] }
  })

  // Layout: 50x50 (or `size`) container; chop is taller and anchored
  // at the seal's bottom (left:50% + 6px in HTML).
  const chopW = size * (60 / 50) // HTML chop displayed width ≈ 60px in 50px box
  const chopH = size * CHOP_HEIGHT_RATIO

  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents='none'>
      {/* bleed — red halo (radial gradient via View bg + radial-ish opacity) */}
      <Animated.View
        style={[
          styles.bleed,
          {
            inset: -size * 0.26,
            borderRadius: size * 0.24,
          },
          bleedStyle,
        ]}
      />

      {/* shadow — drop-shadow on paper under chop */}
      <Animated.View
        style={[
          styles.shadow,
          {
            width: size * 1.16,
            height: size * 0.26,
            left: '50%',
            bottom: '40%',
            borderRadius: size,
            marginLeft: -29 * k,
          },
          shadowStyle,
        ]}
      />

      {/* yinji — the seal impression (the persistent print) */}
      <Animated.View style={[StyleSheet.absoluteFillObject, sealStyle]}>
        <Image source={sealImage} style={{ width: size, height: size }} resizeMode='contain' />
      </Animated.View>

      {/* chop — the stone seal that falls */}
      <Animated.View
        style={[
          styles.chop,
          {
            left: '50%',
            bottom: 1,
            width: chopW,
            height: chopH,
            // HTML adds left:calc(50% + 6px); the +6 offsets the chop's
            // visual centre (not image centre) over the seal centre.
            marginLeft: 6 * k,
          },
          chopStyle,
        ]}
      >
        <Image source={chopImage} style={{ width: chopW, height: chopH }} resizeMode='contain' />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  bleed: {
    position: 'absolute',
    // Pseudo-radial: a soft red glow. RN can't do radial-gradient natively
    // without expo-linear-gradient/Skia; we use a solid bg + heavy shadow
    // for an approximate halo. For pixel-perfect parity caller can pass a
    // pre-rendered PNG or wrap with their own Skia gradient layer.
    backgroundColor: 'rgba(155,34,38,0.5)',
    shadowColor: '#9B2226',
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  shadow: {
    position: 'absolute',
    backgroundColor: 'rgba(40,30,18,0.4)',
    // Approximate radial fade via shadow
    shadowColor: '#28201e',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  chop: {
    position: 'absolute',
    transformOrigin: '50% 100%',
  },
})
