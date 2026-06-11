/**
 * IntroScene — ambient deep-space backdrop for the Yuel intro.
 *
 * The narrative stars (A·B·C·D) and the brand moon live in IntroThread; this
 * file is only the scenery they float in: a full-frame twinkling star field and
 * a faint galaxy band. (The old planet-ground / walking-figure parable this file
 * used to stage was retired with the two-stars rewrite — its Ground / FigureGlow
 * / WalkDust / AI-plate machinery is gone.)
 *
 * All scatter comes from a sin-hash (no Math.random per repo convention), so the
 * sky is byte-identical on every launch and across a shared-screenshot compare.
 */

import { ricePaper, zinc } from '@zhop/hexastral-tokens'
import { useEffect, useMemo } from 'react'
import { StyleSheet } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

/* ── Palette ────────────────────────────────────────────────────────────── */
const STAR = zinc[400]
const GLOW = ricePaper.ivory

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
}: {
  width: number
  height: number
  brightSv: SharedValue<number>
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
        <StarDot key={i} star={s} brightSv={brightSv} />
      ))}
    </Svg>
  )
}

function StarDot({ star, brightSv }: { star: Star; brightSv: SharedValue<number> }) {
  // Each star has a per-star phase offset so they twinkle out of sync.
  const twinkle = useSharedValue(0)
  useEffect(() => {
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
  }, [])

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

/* ── Galaxy band ────────────────────────────────────────────────────────── */

/**
 * GalaxyBand — a diagonal milky-way streak in the upper right, revealed by
 * `brightSv` (the same value that brightens the stars). Dust specks scatter
 * around the band axis with a triangular distribution (denser at the core),
 * plus two soft glow cores.
 */
export function GalaxyBand({
  width,
  height,
  brightSv,
}: {
  width: number
  height: number
  brightSv: SharedValue<number>
}) {
  // Band axis: upper-center → off-screen right, sloping down.
  const x0 = width * 0.55
  const y0 = height * 0.04
  const x1 = width * 1.08
  const y1 = height * 0.42
  const halfWidth = width * 0.12

  const specks = useMemo(() => {
    const dx = x1 - x0
    const dy = y1 - y0
    const len = Math.hypot(dx, dy) || 1
    const px = -dy / len
    const py = dx / len
    const out: Array<{ x: number; y: number; r: number; o: number }> = []
    for (let i = 0; i < 38; i++) {
      const t = hash(i * 5 + 1)
      // Sum of two hashes - 1 → triangular distribution centered on the axis.
      const off = (hash(i * 5 + 2) + hash(i * 5 + 3) - 1) * halfWidth
      out.push({
        x: x0 + dx * t + px * off,
        y: y0 + dy * t + py * off,
        r: 0.5 + hash(i * 5 + 4) * 1.2,
        o: 0.25 + hash(i * 5 + 5) * 0.5,
      })
    }
    return out
  }, [x0, y0, x1, y1, halfWidth])

  const fadeStyle = useAnimatedStyle(() => ({ opacity: brightSv.value * 0.9 }))

  // Two soft glow cores along the band.
  const cores: Array<[number, number]> = [
    [0.3, width * 0.1],
    [0.65, width * 0.13],
  ]

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, fadeStyle]} pointerEvents='none'>
      <Svg style={StyleSheet.absoluteFillObject}>
        <Defs>
          <RadialGradient id='galaxyCore' cx='50%' cy='50%' r='50%'>
            <Stop offset='0' stopColor={GLOW} stopOpacity='0.2' />
            <Stop offset='0.6' stopColor={GLOW} stopOpacity='0.06' />
            <Stop offset='1' stopColor={GLOW} stopOpacity='0' />
          </RadialGradient>
        </Defs>
        {cores.map(([t, r], i) => (
          <Circle
            key={`c${i}`}
            cx={x0 + (x1 - x0) * t}
            cy={y0 + (y1 - y0) * t}
            r={r}
            fill='url(#galaxyCore)'
          />
        ))}
        {specks.map((s, i) => (
          <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill={STAR} opacity={s.o} />
        ))}
      </Svg>
    </Animated.View>
  )
}
