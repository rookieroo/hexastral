/**
 * IntroScene — ambient deep-space backdrop for the Yuel intro.
 *
 * The narrative stars (A·B·C·D) and the brand moon live in IntroThread; this
 * file is only the scenery they float in: a full-frame twinkling star field.
 *
 * All scatter comes from a sin-hash (no Math.random per repo convention), so the
 * sky is byte-identical on every launch and across a shared-screenshot compare.
 */

import { zinc } from '@zhop/hexastral-tokens'
import { useEffect, useMemo } from 'react'
import { StyleSheet } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

/* ── Palette ────────────────────────────────────────────────────────────── */
const STAR = zinc[400]

/* ── Deterministic scatter ──────────────────────────────────────────────── */

/** Deterministic 0..1 hash — stable scatter without Math.random. */
function hash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/* ── Star field ─────────────────────────────────────────────────────────── */

interface Star {
  x: number
  y: number
  r: number
  phase: number
}

export function StarField({
  width,
  height,
  brightSv,
  paused,
}: {
  width: number
  height: number
  brightSv: SharedValue<number>
  /** Freeze the per-star twinkle (e.g. on the home when blurred/backgrounded) so
   *  30 infinite loops aren't redrawing for a screen nobody is looking at. */
  paused?: boolean
}) {
  // Hand-placed primary stars across the WHOLE frame (these twinkle, and appear
  // staggered as the sky brightens). The field wraps the pair on every side now
  // that the planet ground is gone — the bottom is no longer dead black.
  const stars = useMemo<Star[]>(() => {
    const seeds: Array<[number, number, number, number]> = [
      // upper sky
      [0.08, 0.1, 1.2, 0.0],
      [0.18, 0.05, 0.8, 0.3],
      [0.27, 0.2, 1.0, 0.6],
      [0.37, 0.08, 0.9, 0.9],
      [0.45, 0.16, 1.4, 0.2],
      [0.53, 0.04, 0.7, 0.5],
      [0.62, 0.13, 1.1, 0.8],
      [0.7, 0.23, 0.9, 0.1],
      [0.79, 0.07, 1.3, 0.4],
      [0.87, 0.18, 1.0, 0.7],
      [0.93, 0.1, 0.8, 0.0],
      // mid band (around the pair)
      [0.12, 0.4, 0.9, 0.55],
      [0.3, 0.36, 1.1, 0.15],
      [0.58, 0.34, 0.8, 0.85],
      [0.76, 0.42, 1.0, 0.45],
      [0.05, 0.52, 0.8, 0.25],
      [0.9, 0.5, 0.9, 0.65],
      [0.4, 0.58, 0.7, 0.35],
      [0.66, 0.55, 1.0, 0.05],
      // lower sky
      [0.1, 0.72, 0.9, 0.5],
      [0.22, 0.82, 1.1, 0.2],
      [0.34, 0.68, 0.8, 0.75],
      [0.5, 0.88, 0.7, 0.4],
      [0.6, 0.74, 1.0, 0.6],
      [0.74, 0.84, 0.9, 0.1],
      [0.86, 0.7, 1.2, 0.8],
      [0.94, 0.9, 0.8, 0.3],
      [0.16, 0.94, 0.9, 0.0],
      [0.44, 0.78, 1.0, 0.7],
      [0.8, 0.95, 0.8, 0.45],
    ]
    return seeds.map(([fx, fy, r, phase]) => ({
      x: fx * width,
      y: fy * height,
      r,
      phase,
    }))
  }, [width, height])

  // A second, static layer of fainter micro-stars for depth across the FULL
  // frame (no animation — keeps the animated-node count flat while doubling
  // perceived density).
  const microStars = useMemo<Star[]>(() => {
    const out: Star[] = []
    for (let i = 0; i < 48; i++) {
      out.push({
        x: hash(i * 3 + 1) * width,
        y: hash(i * 3 + 2) * height,
        r: 0.4 + hash(i * 3 + 3) * 0.5,
        phase: 0,
      })
    }
    return out
  }, [width, height])

  return (
    <Svg style={StyleSheet.absoluteFillObject} pointerEvents='none'>
      {microStars.map((s, i) => (
        <Circle key={`m${i}`} cx={s.x} cy={s.y} r={s.r} fill={STAR} opacity={0.16} />
      ))}
      {stars.map((s, i) => (
        <StarDot key={i} star={s} brightSv={brightSv} paused={paused} />
      ))}
    </Svg>
  )
}

function StarDot({
  star,
  brightSv,
  paused,
}: {
  star: Star
  brightSv: SharedValue<number>
  paused?: boolean
}) {
  // Each star has a per-star phase offset so they twinkle out of sync.
  const twinkle = useSharedValue(0)
  useEffect(() => {
    if (paused) {
      cancelAnimation(twinkle)
      return
    }
    twinkle.value = withDelay(
      star.phase * 1000,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.3, { duration: 1400, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    )
    return () => cancelAnimation(twinkle)
  }, [paused])

  const animatedProps = useAnimatedProps(() => {
    // Stagger appearance by phase — the sky lights sparse→dense as it brightens.
    const a = (brightSv.value - star.phase * 0.35) / 0.5
    const appear = a < 0 ? 0 : a > 1 ? 1 : a
    return { opacity: (0.15 + twinkle.value * 0.35 + brightSv.value * 0.45) * appear }
  })

  return (
    <AnimatedCircle cx={star.x} cy={star.y} r={star.r} fill={STAR} animatedProps={animatedProps} />
  )
}
