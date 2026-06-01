/**
 * UnsealReveal — 蜡封 (wax seal) breaking open.
 *
 * Port of `docs/design/motion-poc-reading-unlock.html` wax seal animation.
 * A circular wax disc embossed with a glyph (e.g. 封 / 命) sits intact.
 * When `sealed` flips false, the two halves split apart, rotate slightly,
 * fade, and emit a few splatter particles. Whatever is beneath is revealed.
 *
 * The wax shape is rendered via Skia (radial gradient + slight ink
 * displacement on the edge for organic wax bleed). The break animation
 * uses Reanimated transforms on each half + the splatter particles.
 *
 *   <UnsealReveal
 *     sealed={!unlocked}
 *     glyph="封"
 *     size={66}
 *     onBroken={() => setUnlocked(true)}
 *   />
 */

import { Canvas, Circle, Group, RadialGradient, Skia, vec } from '@shopify/react-native-skia'
import { useEffect, useMemo } from 'react'
import { StyleSheet, Text, View, type ViewStyle } from 'react-native'
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

const DEFAULT_DURATION = 700
const BREAK_EASING = Easing.bezier(0.4, 0, 0.2, 1)

export type UnsealRevealProps = {
  /**
   * Whether the seal is intact. Flip to false to play the break animation.
   * Setting back to true resets to intact (e.g. for replay).
   */
  sealed: boolean
  /** Diameter of the wax disc in px. Default 66. */
  size?: number
  /** Glyph embossed on the seal. Default "封". Use "命" for fate-app etc. */
  glyph?: string
  /** Total break duration in ms. Default 700ms. */
  duration?: number
  /** Called when the break animation completes. */
  onBroken?: () => void
  /** Wrapper style. */
  style?: ViewStyle
}

/**
 * Wax seal that splits in half on `sealed` going false.
 */
export function UnsealReveal({
  sealed,
  size = 66,
  glyph = '封',
  duration = DEFAULT_DURATION,
  onBroken,
  style,
}: UnsealRevealProps) {
  // 0 = intact (sealed), 1 = fully broken
  const progress = useSharedValue(sealed ? 0 : 1)

  useEffect(() => {
    if (sealed) {
      progress.value = 0 // snap back when re-sealed (for replay)
    } else {
      progress.value = withTiming(1, { duration, easing: BREAK_EASING })
    }
  }, [sealed, duration, progress])

  useAnimatedReaction(
    () => progress.value,
    (cur, prev) => {
      if (!onBroken) return
      if (prev !== null && prev < 1 && cur >= 1) {
        runOnJS(onBroken)()
      }
    }
  )

  // Each half: translate apart, rotate ±14°, fade
  const leftStyle = useAnimatedStyle(() => {
    const p = progress.value
    const tx = interpolate(p, [0, 1], [0, -size * 0.32])
    const ty = interpolate(p, [0, 1], [0, size * 0.18])
    const rot = interpolate(p, [0, 1], [0, -14]) // degrees
    const op = interpolate(p, [0, 0.45, 1], [1, 1, 0])
    return {
      transform: [{ translateX: tx }, { translateY: ty }, { rotate: `${rot}deg` }],
      opacity: op,
    }
  })

  const rightStyle = useAnimatedStyle(() => {
    const p = progress.value
    const tx = interpolate(p, [0, 1], [0, size * 0.32])
    const ty = interpolate(p, [0, 1], [0, size * 0.18])
    const rot = interpolate(p, [0, 1], [0, 14])
    const op = interpolate(p, [0, 0.45, 1], [1, 1, 0])
    return {
      transform: [{ translateX: tx }, { translateY: ty }, { rotate: `${rot}deg` }],
      opacity: op,
    }
  })

  // Splatter particles — 3 small circles flying out at different angles
  const splatter1 = useAnimatedStyle(() => {
    const p = progress.value
    return {
      transform: [
        { translateX: interpolate(p, [0, 1], [0, -size * 0.55]) },
        { translateY: interpolate(p, [0, 1], [0, -size * 0.25]) },
        { scale: interpolate(p, [0, 0.15, 0.55, 1], [0, 1, 1, 0.6]) },
      ],
      opacity: interpolate(p, [0, 0.15, 0.6, 1], [0, 0.85, 0.4, 0]),
    }
  })
  const splatter2 = useAnimatedStyle(() => {
    const p = progress.value
    return {
      transform: [
        { translateX: interpolate(p, [0, 1], [0, size * 0.6]) },
        { translateY: interpolate(p, [0, 1], [0, -size * 0.18]) },
        { scale: interpolate(p, [0, 0.15, 0.55, 1], [0, 0.7, 0.7, 0.4]) },
      ],
      opacity: interpolate(p, [0, 0.15, 0.6, 1], [0, 0.7, 0.3, 0]),
    }
  })
  const splatter3 = useAnimatedStyle(() => {
    const p = progress.value
    return {
      transform: [
        { translateX: interpolate(p, [0, 1], [0, size * 0.2]) },
        { translateY: interpolate(p, [0, 1], [0, size * 0.55]) },
        { scale: interpolate(p, [0, 0.15, 0.55, 1], [0, 1.1, 0.9, 0.5]) },
      ],
      opacity: interpolate(p, [0, 0.15, 0.6, 1], [0, 0.8, 0.35, 0]),
    }
  })

  // Skia wax half — pre-built path (semicircle) for each side
  const leftHalfPath = useMemo(() => {
    const p = Skia.Path.Make()
    // Half-circle: left side of size×size
    p.moveTo(size / 2, 0)
    p.addArc({ x: 0, y: 0, width: size, height: size }, 270, -180)
    p.close()
    return p
  }, [size])

  const rightHalfPath = useMemo(() => {
    const p = Skia.Path.Make()
    p.moveTo(size / 2, 0)
    p.addArc({ x: 0, y: 0, width: size, height: size }, 270, 180)
    p.close()
    return p
  }, [size])

  return (
    <View style={[{ width: size, height: size }, style]}>
      {/* Splatter particles */}
      <Animated.View
        style={[
          styles.splatter,
          { width: size * 0.18, height: size * 0.18, top: size / 2, left: size / 2 },
          splatter1,
        ]}
      />
      <Animated.View
        style={[
          styles.splatter,
          { width: size * 0.14, height: size * 0.14, top: size / 2, left: size / 2 },
          splatter2,
        ]}
      />
      <Animated.View
        style={[
          styles.splatter,
          { width: size * 0.16, height: size * 0.16, top: size / 2, left: size / 2 },
          splatter3,
        ]}
      />

      {/* Left half */}
      <Animated.View style={[styles.half, leftStyle]}>
        <WaxHalf size={size} path={leftHalfPath} />
        {/* Glyph — visible only on left half (positioned to span full disc) */}
        <View
          style={[
            styles.glyphWrap,
            {
              width: size,
              height: size,
              left: 0,
              top: 0,
            },
          ]}
          pointerEvents='none'
        >
          <Text style={[styles.glyph, { fontSize: size * 0.52 }]}>{glyph}</Text>
        </View>
      </Animated.View>

      {/* Right half */}
      <Animated.View style={[styles.half, rightStyle]}>
        <WaxHalf size={size} path={rightHalfPath} />
        <View
          style={[
            styles.glyphWrap,
            {
              width: size,
              height: size,
              left: -size / 2,
              top: 0,
            },
          ]}
          pointerEvents='none'
        >
          <Text style={[styles.glyph, { fontSize: size * 0.52 }]}>{glyph}</Text>
        </View>
      </Animated.View>
    </View>
  )
}

/** Single half-disc wax shape via Skia (radial red gradient + clip). */
function WaxHalf({ size, path }: { size: number; path: ReturnType<typeof Skia.Path.Make> }) {
  // Gradient centre slightly off-centre top-left for "lit" wax bulge
  const cx = size * 0.5
  const cy = size * 0.5
  return (
    <View style={{ width: size, height: size }} pointerEvents='none'>
      <Canvas style={{ width: size, height: size }}>
        <Group clip={path}>
          <Circle cx={cx} cy={cy} r={size * 0.55}>
            <RadialGradient
              c={vec(size * 0.36, size * 0.3)}
              r={size * 0.7}
              colors={['#c84a3e', '#8e2520', '#5a1310', '#3a0a08']}
              positions={[0, 0.36, 0.78, 1]}
            />
          </Circle>
        </Group>
      </Canvas>
    </View>
  )
}

const styles = StyleSheet.create({
  half: {
    position: 'absolute',
    inset: 0,
    overflow: 'visible',
  },
  glyphWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden', // each half clips to its semicircle area
  },
  glyph: {
    color: '#3a0a08',
    fontFamily: 'Songti SC',
    fontWeight: '700',
    lineHeight: undefined,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: -1 },
    textShadowRadius: 0,
  },
  splatter: {
    position: 'absolute',
    marginLeft: -1,
    marginTop: -1,
    borderRadius: 999,
    backgroundColor: '#8e2520',
  },
})
