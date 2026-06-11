/**
 * SkyHero — the home's living night sky.
 *
 * The persistent form of the intro's two-stars-gravity: you woke in the same
 * night, and the ones who stayed are orbiting you. YOU are the central star —
 * tinted to your day-master 五行 (你 are 木/火/土/金/水), a quiet 意象 so the hero
 * means something, not a generic light; each thread (relationship) is a cool star
 * drifting in slow orbit, joined to you by a faint gravity line.
 *
 * CALM by design — a hub you return to, not a show: very slow orbital drift + a
 * gentle breath, no camera, no comet. Reduced-motion → a still composition.
 *
 * PERF (2026-06 "手机发烫"): the orbital clock + breath only run while the home is
 * actually visible + foreground — the host passes `paused` (true when the screen
 * is blurred or the app is backgrounded), and we cancel/resume the animations so
 * the GPU isn't redrawing the sky for a screen nobody is looking at.
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
import { useEffect, useRef } from 'react'
import { StyleSheet } from 'react-native'
import {
  cancelAnimation,
  Easing,
  type SharedValue,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

const INK = '#f4f3ef'
const INK_CLR = '#f4f3ef00'
const HALO = '#c4a882' // default gold — you, when no element is known yet
const HALO_HOT = '#e6c88c'
const COOL = '#bcccea' // cool silver — the others in your orbit
const COOL_HOT = '#e4edff'
const COOL_CLR = '#bcccea00'
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
  const youHalo = star.halo
  const youHot = star.hot
  const youHaloClr = `${star.halo}00`

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
      // Freeze in place — no GPU work while the home isn't being looked at.
      cancelAnimation(clock)
      cancelAnimation(breath)
      stopBreath()
      return stopBreath
    }
    // Run / resume from wherever we froze (the orbit continues, doesn't restart).
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
        color={youHalo}
        opacity={linesOp}
      >
        <BlurMask blur={0.6} style='normal' />
      </Path>

      {/* threads in orbit */}
      {SLOTS.map((_, i) => (
        <ThreadStar key={i} idx={i} pos={pos} appear={appear} active={i < n} />
      ))}

      {/* you — the centre, tinted to your element */}
      <Group transform={youT}>
        <Circle c={vec(0, 0)} r={26} opacity={youHaloOp}>
          <RadialGradient c={vec(0, 0)} r={26} colors={[youHalo, youHaloClr]} positions={[0, 1]} />
        </Circle>
        <Circle c={vec(0, 0)} r={10} opacity={youGlowOp}>
          <RadialGradient
            c={vec(0, 0)}
            r={10}
            colors={[youHot, youHalo, youHaloClr]}
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
