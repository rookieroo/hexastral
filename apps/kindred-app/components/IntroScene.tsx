/**
 * IntroScene — the "stage" for the onboarding intro parable.
 *
 * intro.tsx owns the script (timeline, figures, speech); this file owns the
 * scenery: night sky, planet ground, galaxy, glow halos, walking dust. Two
 * rendering paths:
 *
 *   1. Procedural (default) — everything drawn with react-native-svg from
 *      deterministic seeds. Zero assets, resolution-independent.
 *   2. AI backdrop plates — when raster scene plates are dropped into
 *      assets/intro/ (see assets/intro/README.md for generation prompts),
 *      IntroStage swaps the procedural sky/ground for the plates. Figures,
 *      glow and dust stay vector either way so they remain tintable and
 *      animatable by reanimated.
 *
 * All "random" scatter (stars, grain, galaxy dust) comes from a sin-hash —
 * no Math.random per project conventions, so the scene is identical on every
 * launch and across both ends of a shared-screenshot comparison.
 */

import { ricePaper, rubbing, zinc } from '@zhop/hexastral-tokens'
import { useEffect, useMemo } from 'react'
import { Image, type ImageSourcePropType, StyleSheet, View } from 'react-native'
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
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const AnimatedPath = Animated.createAnimatedComponent(Path)

/* ── Palette ────────────────────────────────────────────────────────────── */
const ARC = zinc[600]
const STAR = zinc[400]
const GRAIN = ricePaper.ivory
const GLOW = ricePaper.ivory
const DUST = zinc[400]

/* ── Deterministic scatter helpers ──────────────────────────────────────── */

/** Deterministic 0..1 hash — stable scatter without Math.random. */
function hash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/** Quadratic bezier interpolation for one axis. */
function bez(t: number, p0: number, p1: number, p2: number): number {
  const u = 1 - t
  return u * u * p0 + 2 * u * t * p1 + t * t * p2
}

/* ── AI backdrop plate slot ─────────────────────────────────────────────── */
// Drop AI-generated scene plates into assets/intro/ (see assets/intro/README.md
// for prompts + export specs), then switch these requires on. Metro needs
// static require() calls, hence the comment toggle rather than a dynamic path:
//
//   const PLATE_DIM: ImageSourcePropType | null = require('../assets/intro/backdrop-dim.png')
//   const PLATE_BRIGHT: ImageSourcePropType | null = require('../assets/intro/backdrop-bright.png')
//
const PLATE_DIM: ImageSourcePropType | null = null
const PLATE_BRIGHT: ImageSourcePropType | null = null

/** True once raster plates are wired in — IntroStage then skips the procedural sky/ground. */
export const HAS_BACKDROP_PLATES = PLATE_DIM != null

/**
 * SceneBackdrop — two stacked full-bleed plates. The dim plate is always
 * visible; the bright plate (galaxy revealed, stars lit) cross-fades in on
 * top, driven by the same `brightSv` the procedural stars use.
 */
export function SceneBackdrop({ brightSv }: { brightSv: SharedValue<number> }) {
  const brightStyle = useAnimatedStyle(() => ({ opacity: brightSv.value }))
  if (PLATE_DIM == null) return null
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents='none'>
      <Image source={PLATE_DIM} style={styles.plate} resizeMode='cover' />
      {PLATE_BRIGHT != null && (
        <Animated.Image
          source={PLATE_BRIGHT}
          style={[styles.plate, brightStyle]}
          resizeMode='cover'
        />
      )}
    </View>
  )
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
  const stars = useMemo<Star[]>(() => {
    // Hand-placed primary stars (these twinkle).
    const seeds: Array<[number, number, number, number]> = [
      [0.08, 0.12, 1.2, 0.0],
      [0.18, 0.06, 0.8, 0.3],
      [0.27, 0.22, 1.0, 0.6],
      [0.36, 0.09, 0.9, 0.9],
      [0.44, 0.18, 1.4, 0.2],
      [0.52, 0.04, 0.7, 0.5],
      [0.61, 0.15, 1.1, 0.8],
      [0.69, 0.25, 0.9, 0.1],
      [0.78, 0.08, 1.3, 0.4],
      [0.86, 0.19, 1.0, 0.7],
      [0.93, 0.11, 0.8, 0.0],
      [0.14, 0.3, 0.9, 0.55],
      [0.32, 0.34, 1.1, 0.15],
      [0.58, 0.32, 0.8, 0.85],
      [0.75, 0.36, 1.0, 0.45],
    ]
    return seeds.map(([fx, fy, r, phase]) => ({
      x: fx * width,
      y: fy * height,
      r,
      phase,
    }))
  }, [width, height])

  // A second, static layer of fainter micro-stars for depth (no animation —
  // keeps the animated-node count flat while doubling perceived density).
  const microStars = useMemo<Star[]>(() => {
    const out: Star[] = []
    for (let i = 0; i < 22; i++) {
      out.push({
        x: hash(i * 3 + 1) * width,
        y: hash(i * 3 + 2) * height * 0.5,
        r: 0.4 + hash(i * 3 + 3) * 0.5,
        phase: 0,
      })
    }
    return out
  }, [width, height])

  return (
    <Svg style={StyleSheet.absoluteFillObject} pointerEvents='none'>
      {microStars.map((s, i) => (
        <Circle key={`m${i}`} cx={s.x} cy={s.y} r={s.r} fill={STAR} opacity={0.18} />
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

  const animatedProps = useAnimatedProps(() => ({
    opacity: 0.15 + twinkle.value * 0.35 + brightSv.value * 0.45,
  }))

  return (
    <AnimatedCircle cx={star.x} cy={star.y} r={star.r} fill={STAR} animatedProps={animatedProps} />
  )
}

/* ── Galaxy band ────────────────────────────────────────────────────────── */

/**
 * GalaxyBand — a diagonal milky-way streak in the upper right, revealed by
 * `brightSv` (the same value that brightens the stars at the end of the
 * parable). Dust specks scatter around the band axis with a triangular
 * distribution (denser at the core), plus two soft glow cores.
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

/* ── Planet ground ──────────────────────────────────────────────────────── */

/**
 * Ground — the planet surface: a filled hill below the rim arc (vertical
 * gradient, weathered → void) with deterministic grain specks for rocky
 * texture, plus the rim line itself which draws in via `drawSv`
 * (1 = hidden, 0 = drawn — same contract as the old inline arc).
 */
export function Ground({
  width,
  height,
  drawSv,
}: {
  width: number
  height: number
  drawSv: SharedValue<number>
}) {
  const center = width / 2
  const y0 = height * 0.85
  const yPeak = height * 0.65 - 30

  const rimD = `M -40 ${y0} Q ${center} ${yPeak} ${width + 40} ${y0}`
  const fillD = `${rimD} L ${width + 40} ${height} L -40 ${height} Z`

  // Rocky grain just below the rim.
  const grain = useMemo(() => {
    const out: Array<{ x: number; y: number; r: number; o: number }> = []
    for (let i = 0; i < 26; i++) {
      const t = 0.06 + 0.88 * hash(i * 7 + 1)
      const depth = 5 + hash(i * 7 + 2) * 34
      out.push({
        x: bez(t, -40, center, width + 40),
        y: bez(t, y0, yPeak, y0) + depth,
        r: 0.6 + hash(i * 7 + 3) * 1.4,
        o: 0.04 + hash(i * 7 + 4) * 0.06,
      })
    }
    return out
  }, [center, width, y0, yPeak])

  const rimProps = useAnimatedProps(() => ({
    strokeDashoffset: drawSv.value * 2000,
  }))
  const fillStyle = useAnimatedStyle(() => ({ opacity: 1 - drawSv.value }))

  return (
    <>
      {/* Filled hill + grain — fades in as the rim draws. */}
      <Animated.View style={[StyleSheet.absoluteFillObject, fillStyle]} pointerEvents='none'>
        <Svg style={StyleSheet.absoluteFillObject}>
          <Defs>
            <LinearGradient id='groundFill' x1='0' y1='0' x2='0' y2='1'>
              <Stop offset='0' stopColor={rubbing.weathered} stopOpacity='1' />
              <Stop offset='0.4' stopColor={rubbing.stone} stopOpacity='1' />
              <Stop offset='1' stopColor={rubbing.void} stopOpacity='1' />
            </LinearGradient>
          </Defs>
          <Path d={fillD} fill='url(#groundFill)' />
          {grain.map((g, i) => (
            <Circle key={i} cx={g.x} cy={g.y} r={g.r} fill={GRAIN} opacity={g.o} />
          ))}
        </Svg>
      </Animated.View>
      {/* Rim line — draw-in animation. */}
      <Svg style={StyleSheet.absoluteFillObject} pointerEvents='none'>
        <AnimatedPath
          d={rimD}
          stroke={ARC}
          strokeWidth={2.2}
          fill='none'
          strokeLinecap='round'
          strokeDasharray='2000'
          animatedProps={rimProps}
        />
      </Svg>
    </>
  )
}

/* ── Stage (sky + ground switch) ────────────────────────────────────────── */

/**
 * IntroStage — single mount point for the scenery. Renders AI plates when
 * they exist, otherwise the procedural sky + galaxy + ground.
 */
export function IntroStage({
  width,
  height,
  drawSv,
  brightSv,
}: {
  width: number
  height: number
  drawSv: SharedValue<number>
  brightSv: SharedValue<number>
}) {
  if (HAS_BACKDROP_PLATES) {
    return <SceneBackdrop brightSv={brightSv} />
  }
  return (
    <>
      <StarField width={width} height={height} brightSv={brightSv} />
      <GalaxyBand width={width} height={height} brightSv={brightSv} />
      <Ground width={width} height={height} drawSv={drawSv} />
    </>
  )
}

/* ── Figure glow ────────────────────────────────────────────────────────── */

/** Ray angles (degrees, 0 = up) for the radiating lines around an embrace. */
const RAY_ANGLES = [-110, -75, -40, -10, 10, 40, 75, 110]

/**
 * FigureGlow — a warm halo with short radiating rays, placed behind an
 * embracing / sitting pair. Position (center x) and opacity are both driven
 * by the caller's shared values so the glow can follow the pair between the
 * hug slot and the sit slot.
 */
export function FigureGlow({
  xSv,
  opacitySv,
  top,
  size = 150,
}: {
  /** Screen-space center x of the glow (same coordinate space as figure slots). */
  xSv: SharedValue<number>
  opacitySv: SharedValue<number>
  top: number
  size?: number
}) {
  const style = useAnimatedStyle(() => ({
    opacity: opacitySv.value,
    transform: [{ translateX: xSv.value - size / 2 }],
  }))

  const c = size / 2
  // Rays sit just outside the bright core.
  const rayInner = size * 0.3
  const rayOuter = size * 0.38

  return (
    <Animated.View
      pointerEvents='none'
      style={[{ position: 'absolute', top, left: 0, width: size, height: size }, style]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id='figureGlow' cx='50%' cy='50%' r='50%'>
            <Stop offset='0' stopColor={GLOW} stopOpacity='0.3' />
            <Stop offset='0.55' stopColor={GLOW} stopOpacity='0.1' />
            <Stop offset='1' stopColor={GLOW} stopOpacity='0' />
          </RadialGradient>
        </Defs>
        <Circle cx={c} cy={c} r={c} fill='url(#figureGlow)' />
        {RAY_ANGLES.map((deg) => {
          const rad = ((deg - 90) * Math.PI) / 180
          const cos = Math.cos(rad)
          const sin = Math.sin(rad)
          return (
            <Line
              key={deg}
              x1={c + cos * rayInner}
              y1={c + sin * rayInner}
              x2={c + cos * rayOuter}
              y2={c + sin * rayOuter}
              stroke={GLOW}
              strokeWidth={1.2}
              strokeLinecap='round'
              opacity={0.35}
            />
          )
        })}
      </Svg>
    </Animated.View>
  )
}

/* ── Walking dust ───────────────────────────────────────────────────────── */

/**
 * WalkDust — three small specks that pulse behind a walking figure's feet
 * (the comic "speed dust"). Mount inside the figure's animated container so
 * the dust travels with it; `heading` is the movement direction — dust trails
 * on the opposite side.
 */
export function WalkDust({ active, heading }: { active: boolean; heading: 'L' | 'R' }) {
  // Dust trails behind the figure — opposite the walking direction.
  const dir = heading === 'R' ? -1 : 1
  const o1 = useSharedValue(0)
  const o2 = useSharedValue(0)
  const o3 = useSharedValue(0)

  useEffect(() => {
    const dots = [o1, o2, o3]
    if (!active) {
      for (const o of dots) {
        cancelAnimation(o)
        o.value = withTiming(0, { duration: 200 })
      }
      return
    }
    dots.forEach((o, i) => {
      o.value = withDelay(
        i * 170,
        withRepeat(
          withSequence(
            withTiming(0.55, { duration: 240, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 420, easing: Easing.in(Easing.quad) })
          ),
          -1
        )
      )
    })
    return () => {
      for (const o of dots) cancelAnimation(o)
    }
  }, [active])

  // As each speck fades it drifts further behind.
  const s1 = useAnimatedStyle(() => ({
    opacity: o1.value,
    transform: [{ translateX: (1 - o1.value) * dir * 6 }],
  }))
  const s2 = useAnimatedStyle(() => ({
    opacity: o2.value,
    transform: [{ translateX: (1 - o2.value) * dir * 8 }],
  }))
  const s3 = useAnimatedStyle(() => ({
    opacity: o3.value,
    transform: [{ translateX: (1 - o3.value) * dir * 10 }],
  }))

  return (
    <View pointerEvents='none' style={styles.dustRow}>
      <Animated.View style={[styles.dust, { left: 32 + dir * 10, width: 3, height: 3 }, s1]} />
      <Animated.View style={[styles.dust, { left: 32 + dir * 16, width: 2.5, height: 2.5 }, s2]} />
      <Animated.View style={[styles.dust, { left: 32 + dir * 22, width: 2, height: 2 }, s3]} />
    </View>
  )
}

const styles = StyleSheet.create({
  plate: {
    ...StyleSheet.absoluteFillObject,
  },
  dustRow: {
    position: 'absolute',
    bottom: 5,
    left: 0,
    right: 0,
    height: 10,
  },
  dust: {
    position: 'absolute',
    bottom: 0,
    borderRadius: 2,
    backgroundColor: DUST,
  },
})
