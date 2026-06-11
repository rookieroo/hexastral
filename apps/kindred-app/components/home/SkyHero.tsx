/**
 * SkyHero — the home's living night sky (SVG).
 *
 * The persistent form of the intro's two-stars-gravity: you woke in the same
 * night, and the ones who stayed are orbiting you. YOU are the central star —
 * tinted to your day-master 五行 (你 are 木/火/土/金/水), a quiet 意象 so the hero
 * means something, not a generic light; each thread (relationship) is a cool star
 * drifting in slow orbit, joined to you by a faint gravity line.
 *
 * 2026-06: ported off Skia to react-native-svg (per "skia → svg" — drop the Skia
 * canvas + the GPU BlurMask for a lighter, cooler hero). Reanimated drives the
 * SVG attributes (cx/cy/r/opacity + the gravity Path `d`), the same pattern the
 * ambient StarField already uses. CALM by design — very slow orbital drift + a
 * gentle breath, no camera. Reduced-motion → a still composition.
 *
 * PERF: the orbit clock + breath only run while the home is visible + foreground
 * (the host passes `paused`); we cancel/resume so the GPU isn't redrawing a sky
 * nobody is looking at.
 */

import { useEffect, useMemo, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle, Defs, type NumberProp, Path, RadialGradient, Stop } from 'react-native-svg'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const AnimatedPath = Animated.createAnimatedComponent(Path)

const INK = '#f4f3ef'
const HALO = '#c4a882' // default gold — you, when no element is known yet
const HALO_HOT = '#e6c88c'
const COOL = '#bcccea' // cool silver — the others in your orbit
const COOL_HOT = '#e4edff'
const STAR_HOT = '#ffffff'

/** Your central star, coloured by day-master 五行 — a quiet elemental 意象. The
 *  white-hot core stays white; only the halo + glow take the element's light. */
const ELEMENT_STAR: Record<string, { halo: string; hot: string }> = {
  木: { halo: '#86b66f', hot: '#cbe8b0' }, // wood — green
  火: { halo: '#d2745a', hot: '#f3b98c' }, // fire — warm red
  土: { halo: '#c4a067', hot: '#e6cc95' }, // earth — ochre gold
  金: { halo: '#cfc8b0', hot: '#f0ead8' }, // metal — white gold
  水: { halo: '#6f9cc8', hot: '#b8d6f0' }, // water — blue
}

const TILT = 0.5 // orbit ellipse Y-squash → a tilted plane (3D feel)
const ORBIT_W = 0.00018 // rad/ms — very slow; the sky barely turns
const CLOCK_END = 600000

/** Six fixed orbit slots — spread in angle + two radius bands; gently differential
 *  rotation so the constellation breathes rather than spins as a rigid wheel. */
const SLOTS = [
  { a0: -0.5, rf: 0.3, wf: 1.0 },
  { a0: 1.3, rf: 0.42, wf: 0.78 },
  { a0: 2.7, rf: 0.31, wf: 1.12 },
  { a0: 3.95, rf: 0.44, wf: 0.72 },
  { a0: 5.1, rf: 0.33, wf: 0.95 },
  { a0: 0.5, rf: 0.46, wf: 0.66 },
] as const
const MAX_STARS = SLOTS.length

export interface SkyHeroProps {
  width: number
  height: number
  /** How many thread-stars to seat in orbit (capped at six). */
  threadCount: number
  /** Day-master 五行 (木/火/土/金/水) — tints your central star. */
  element?: string
  /** Pause the drift + breath (screen blurred / app backgrounded) to save heat. */
  paused?: boolean
}

export function SkyHero({ width, height, threadCount, element, paused }: SkyHeroProps) {
  const reduced = useReducedMotion()
  const cx = width / 2
  const cy = height * 0.5
  const heroMin = Math.min(width, height)
  const n = Math.min(Math.max(threadCount, 0), MAX_STARS)

  const star = (element && ELEMENT_STAR[element]) || { halo: HALO, hot: HALO_HOT }

  const clock = useSharedValue(0)
  const breath = useSharedValue(0)
  const appear = useSharedValue(0)
  const breathTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const stopBreath = () => {
      if (breathTimer.current) {
        clearInterval(breathTimer.current)
        breathTimer.current = null
      }
    }
    if (reduced) {
      clock.value = 120000
      breath.value = 0.5
      appear.value = 1
      return stopBreath
    }
    if (paused) {
      cancelAnimation(clock)
      cancelAnimation(breath)
      stopBreath()
      return stopBreath
    }
    if (appear.value < 1) {
      appear.value = withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) })
    }
    clock.value = withTiming(CLOCK_END, {
      duration: Math.max(1, CLOCK_END - clock.value),
      easing: Easing.linear,
    })
    breath.value = withTiming(breath.value < 0.5 ? 1 : 0, {
      duration: 3000,
      easing: Easing.inOut(Easing.sin),
    })
    breathTimer.current = setInterval(() => {
      breath.value = withTiming(breath.value < 0.5 ? 1 : 0, {
        duration: 3000,
        easing: Easing.inOut(Easing.sin),
      })
    }, 3000)
    return stopBreath
  }, [reduced, paused, clock, breath, appear])

  // Live positions of all six slots (one source — the gravity Path + each star
  // both read this).
  const pos = useDerivedValue(() =>
    SLOTS.map((s) => {
      const th = s.a0 + ORBIT_W * s.wf * clock.value
      const r = heroMin * s.rf
      return { x: cx + r * Math.cos(th), y: cy + r * Math.sin(th) * TILT }
    })
  )

  // Gravity lines — centre → each active star, as one Path's `d`.
  const linesProps = useAnimatedProps(() => {
    let d = ''
    for (let i = 0; i < n; i++) {
      const q = pos.value[i] ?? { x: cx, y: cy }
      d += `M${cx} ${cy}L${q.x} ${q.y}`
    }
    return { d, opacity: appear.value * 0.14 } as { d: string; opacity: NumberProp }
  })

  // Central star — you. Breath grows r + halo a touch (≈ the old scale breath).
  const k = useDerivedValue(() => 1 + breath.value * 0.06)
  const haloProps = useAnimatedProps(
    () => ({ r: 26 * k.value, opacity: appear.value * (0.2 + breath.value * 0.12) }) as object
  )
  const glowProps = useAnimatedProps(
    () => ({ r: 10 * k.value, opacity: appear.value * 0.5 }) as object
  )
  const coreProps = useAnimatedProps(() => ({ r: 3.6 * k.value, opacity: appear.value }) as object)

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents='none'>
      <Svg width={width} height={height}>
        <Defs>
          {/* element-tinted central star */}
          <RadialGradient id='youHalo'>
            <Stop offset='0' stopColor={star.halo} stopOpacity={1} />
            <Stop offset='1' stopColor={star.halo} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id='youGlow'>
            <Stop offset='0' stopColor={star.hot} stopOpacity={1} />
            <Stop offset='0.5' stopColor={star.halo} stopOpacity={1} />
            <Stop offset='1' stopColor={star.halo} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id='youCore'>
            <Stop offset='0' stopColor={STAR_HOT} stopOpacity={1} />
            <Stop offset='0.45' stopColor={INK} stopOpacity={1} />
            <Stop offset='1' stopColor={INK} stopOpacity={0} />
          </RadialGradient>
          {/* cool thread stars */}
          <RadialGradient id='threadGlow'>
            <Stop offset='0' stopColor={COOL_HOT} stopOpacity={1} />
            <Stop offset='0.5' stopColor={COOL} stopOpacity={1} />
            <Stop offset='1' stopColor={COOL} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id='threadCore'>
            <Stop offset='0' stopColor={STAR_HOT} stopOpacity={1} />
            <Stop offset='0.5' stopColor={COOL} stopOpacity={1} />
            <Stop offset='1' stopColor={COOL} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* gravity lines (under the stars) */}
        <AnimatedPath
          animatedProps={linesProps}
          stroke={star.halo}
          strokeWidth={1}
          strokeLinecap='round'
          fill='none'
        />

        {/* threads in orbit */}
        {SLOTS.map((_, i) => (
          <ThreadStar key={i} idx={i} pos={pos} appear={appear} active={i < n} />
        ))}

        {/* you — the centre, tinted to your element */}
        <AnimatedCircle cx={cx} cy={cy} fill='url(#youHalo)' animatedProps={haloProps} />
        <AnimatedCircle cx={cx} cy={cy} fill='url(#youGlow)' animatedProps={glowProps} />
        <AnimatedCircle cx={cx} cy={cy} fill='url(#youCore)' animatedProps={coreProps} />
      </Svg>
    </View>
  )
}

function ThreadStar({
  idx,
  pos,
  appear,
  active,
}: {
  idx: number
  pos: ReturnType<typeof useDerivedValue<Array<{ x: number; y: number }>>>
  appear: ReturnType<typeof useSharedValue<number>>
  active: boolean
}) {
  const glowProps = useAnimatedProps(() => {
    const q = pos.value[idx] ?? { x: 0, y: 0 }
    return { cx: q.x, cy: q.y, r: 7, opacity: (active ? appear.value : 0) * 0.55 } as object
  })
  const coreProps = useAnimatedProps(() => {
    const q = pos.value[idx] ?? { x: 0, y: 0 }
    return { cx: q.x, cy: q.y, r: 2.4, opacity: active ? appear.value : 0 } as object
  })
  return (
    <>
      <AnimatedCircle fill='url(#threadGlow)' animatedProps={glowProps} />
      <AnimatedCircle fill='url(#threadCore)' animatedProps={coreProps} />
    </>
  )
}
