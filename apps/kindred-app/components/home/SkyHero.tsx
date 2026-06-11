/**
 * SkyHero — the home's living night sky.
 *
 * The persistent form of the intro's two-stars-gravity: you woke in the same
 * night, and the ones who stayed are orbiting you. YOU are the central gold star;
 * each thread (relationship) is a cool star drifting in slow orbit, joined to you
 * by a faint gravity line.
 *
 * CALM by design — this is a hub you return to, not a show: very slow orbital
 * drift + a gentle breath, no camera, no comet. Reduced-motion → a still
 * composition. It is pure atmosphere (no touch handling); the host wraps it in a
 * Pressable and owns "open your reading". The element/date live in the caption
 * below, so the central star stays abstract and luminous.
 */

import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Path,
  RadialGradient,
  Skia,
  type SkPath,
  vec,
} from '@shopify/react-native-skia'
import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import {
  Easing,
  type SharedValue,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

const INK = '#f4f3ef'
const INK_CLR = '#f4f3ef00'
const HALO = '#c4a882' // gold — you (the warm centre)
const HALO_HOT = '#e6c88c'
const HALO_CLR = '#c4a88200'
const COOL = '#bcccea' // cool silver — the others in your orbit
const COOL_HOT = '#e4edff'
const COOL_CLR = '#bcccea00'
const STAR_HOT = '#ffffff'

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
}

export function SkyHero({ width, height, threadCount }: SkyHeroProps) {
  const reduced = useReducedMotion()
  const cx = width / 2
  const cy = height * 0.5
  const heroMin = Math.min(width, height)
  const n = Math.min(Math.max(threadCount, 0), MAX_STARS)

  const clock = useSharedValue(0)
  const breath = useSharedValue(0)
  const appear = useSharedValue(0)
  useEffect(() => {
    if (reduced) {
      clock.value = 120000
      breath.value = 0.5
      appear.value = 1
      return
    }
    appear.value = withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) })
    clock.value = withTiming(CLOCK_END, { duration: CLOCK_END, easing: Easing.linear })
    breath.value = withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) })
    const id = setInterval(() => {
      breath.value = withTiming(breath.value < 0.5 ? 1 : 0, {
        duration: 3000,
        easing: Easing.inOut(Easing.sin),
      })
    }, 3000)
    return () => clearInterval(id)
  }, [reduced, clock, breath, appear])

  // Live positions of all six slots (one source — the gravity lines + each star
  // both read this).
  const pos = useDerivedValue(() =>
    SLOTS.map((s) => {
      const th = s.a0 + ORBIT_W * s.wf * clock.value
      const r = heroMin * s.rf
      return { x: cx + r * Math.cos(th), y: cy + r * Math.sin(th) * TILT }
    })
  )

  // Gravity lines — centre → each active star; they sweep as the sky turns.
  const lines = useDerivedValue<SkPath>(() => {
    const p = Skia.Path.Make()
    for (let i = 0; i < n; i++) {
      const q = pos.value[i] ?? { x: cx, y: cy }
      p.moveTo(cx, cy)
      p.lineTo(q.x, q.y)
    }
    return p
  })
  const linesOp = useDerivedValue(() => appear.value * 0.14)

  // Central star — you. Breath on scale + halo.
  const youT = useDerivedValue(() => {
    const k = 1 + breath.value * 0.06
    return [{ translateX: cx }, { translateY: cy }, { scale: k }]
  })
  const youHaloOp = useDerivedValue(() => appear.value * (0.2 + breath.value * 0.12))
  const youGlowOp = useDerivedValue(() => appear.value * 0.5)
  const youOp = useDerivedValue(() => appear.value)

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents='none'>
      {/* gravity lines (under the stars) */}
      <Path
        path={lines}
        style='stroke'
        strokeWidth={1}
        strokeCap='round'
        color={HALO}
        opacity={linesOp}
      >
        <BlurMask blur={0.6} style='normal' />
      </Path>

      {/* threads in orbit */}
      {SLOTS.map((_, i) => (
        <ThreadStar key={i} idx={i} pos={pos} appear={appear} active={i < n} />
      ))}

      {/* you — the centre */}
      <Group transform={youT}>
        <Circle c={vec(0, 0)} r={26} opacity={youHaloOp}>
          <RadialGradient c={vec(0, 0)} r={26} colors={[HALO, HALO_CLR]} positions={[0, 1]} />
        </Circle>
        <Circle c={vec(0, 0)} r={10} opacity={youGlowOp}>
          <RadialGradient
            c={vec(0, 0)}
            r={10}
            colors={[HALO_HOT, HALO, HALO_CLR]}
            positions={[0, 0.5, 1]}
          />
        </Circle>
        <Circle c={vec(0, 0)} r={3.6} opacity={youOp}>
          <RadialGradient
            c={vec(0, 0)}
            r={3.6}
            colors={[STAR_HOT, INK, INK_CLR]}
            positions={[0, 0.45, 1]}
          />
        </Circle>
      </Group>
    </Canvas>
  )
}

function ThreadStar({
  idx,
  pos,
  appear,
  active,
}: {
  idx: number
  pos: SharedValue<Array<{ x: number; y: number }>>
  appear: SharedValue<number>
  active: boolean
}) {
  const t = useDerivedValue(() => {
    const q = pos.value[idx] ?? { x: 0, y: 0 }
    return [{ translateX: q.x }, { translateY: q.y }]
  })
  const op = useDerivedValue(() => (active ? appear.value : 0))
  const glowOp = useDerivedValue(() => (active ? appear.value : 0) * 0.55)
  return (
    <Group transform={t}>
      <Circle c={vec(0, 0)} r={7} opacity={glowOp}>
        <RadialGradient
          c={vec(0, 0)}
          r={7}
          colors={[COOL_HOT, COOL, COOL_CLR]}
          positions={[0, 0.5, 1]}
        />
      </Circle>
      <Circle c={vec(0, 0)} r={2.4} opacity={op}>
        <RadialGradient
          c={vec(0, 0)}
          r={2.4}
          colors={[STAR_HOT, COOL, COOL_CLR]}
          positions={[0, 0.5, 1]}
        />
      </Circle>
    </Group>
  )
}
