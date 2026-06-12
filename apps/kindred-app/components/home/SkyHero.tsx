/**
 * SkyHero — the home's living night sky (Skia).
 *
 * The persistent form of the intro's two-stars-gravity: you woke in the same
 * night, and the ones who stayed are orbiting you. YOU are the central star —
 * tinted to your day-master 五行 (你 are 木/火/土/金/水), a quiet 意象 so the hero
 * means something, not a generic light; each thread (relationship) is a cool star
 * drifting in slow orbit, joined to you by a faint gravity line.
 *
 * 2026-06: the orbit/breath math is unchanged (Reanimated), but the RENDER moved
 * off react-native-svg onto a Skia <Canvas>. The SVG version committed ~16 node
 * props (gradient-filled circles + a path) to native views every frame — that
 * per-node update model is what warmed the phone. Skia redraws the whole scene
 * in ONE GPU pass per frame, with no BlurMask (the original Skia-heat culprit) —
 * just radial gradients. CALM by design: very slow orbital drift + a gentle
 * breath, no camera. Reduced-motion → a still composition.
 *
 * PERF: the orbit clock + breath only run while the home is visible + foreground
 * (the host passes `paused`); we cancel/resume so the GPU isn't redrawing a sky
 * nobody is looking at.
 */

import { Canvas, Circle, Group, Path, RadialGradient, Skia, vec } from '@shopify/react-native-skia'
import { useEffect, useMemo, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import {
  cancelAnimation,
  Easing,
  runOnJS,
  type SharedValue,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

const INK = '#f4f3ef'
const HALO = '#c4a882' // default gold — you, when no element is known yet
const HALO_HOT = '#e6c88c'
const COOL = '#bcccea' // cool silver — the others in your orbit
const COOL_HOT = '#e4edff'
const STAR_HOT = '#ffffff'

/** Hue-preserving fade to alpha 0 (mirrors the SVG stops: same colour, opacity→0).
 *  Skia parses #RRGGBBAA, so appending '00' is a transparent twin of the colour. */
const fade = (c: string) => `${c}00`

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
  /** Tap your central star (or empty sky) → your personal reading. Receives page
   *  coords for the ink-bloom origin. */
  onTapSelf?: (x: number, y: number) => void
  /** Tap a thread's star → that bond. `index` is the orbit slot = the i-th thread
   *  the host passed (the host maps it to a bond id). */
  onTapThread?: (index: number, x: number, y: number) => void
}

export function SkyHero({
  width,
  height,
  threadCount,
  element,
  paused,
  onTapSelf,
  onTapThread,
}: SkyHeroProps) {
  const reduced = useReducedMotion()
  const cx = width / 2
  const cy = height * 0.5
  const heroMin = Math.min(width, height)
  const n = Math.min(Math.max(threadCount, 0), MAX_STARS)
  const center = useMemo(() => vec(cx, cy), [cx, cy])

  const star = (element && ELEMENT_STAR[element]) || { halo: HALO, hot: HALO_HOT }

  // Gradient stop colours (static — only geometry/opacity animate).
  const youHaloC = useMemo(() => [star.halo, fade(star.halo)], [star.halo])
  const youGlowC = useMemo(() => [star.hot, star.halo, fade(star.halo)], [star.hot, star.halo])
  const youCoreC = useMemo(() => [STAR_HOT, INK, fade(INK)], [])
  const threadGlowC = useMemo(() => [COOL_HOT, COOL, fade(COOL)], [])
  const threadCoreC = useMemo(() => [STAR_HOT, COOL, fade(COOL)], [])

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

  // Live positions of all six slots — one source the gravity Path + each star read.
  const pos = useDerivedValue(() =>
    SLOTS.map((s) => {
      const th = s.a0 + ORBIT_W * s.wf * clock.value
      const r = heroMin * s.rf
      return { x: cx + r * Math.cos(th), y: cy + r * Math.sin(th) * TILT }
    })
  )

  // Gravity lines — centre → each active star, as one Skia Path.
  const linesPath = useDerivedValue(() => {
    const p = Skia.Path.Make()
    for (let i = 0; i < n; i++) {
      const q = pos.value[i] ?? { x: cx, y: cy }
      p.moveTo(cx, cy)
      p.lineTo(q.x, q.y)
    }
    return p
  })
  const linesOpacity = useDerivedValue(() => appear.value * 0.14)

  // Central star — you. Breath grows it via a gentle group scale (≈ the old r
  // breath) about its own centre; opacity breathes per layer.
  const youScale = useDerivedValue(() => [{ scale: 1 + breath.value * 0.06 }])
  const haloOpacity = useDerivedValue(() => appear.value * (0.2 + breath.value * 0.12))
  const glowOpacity = useDerivedValue(() => appear.value * 0.5)
  const coreOpacity = useDerivedValue(() => appear.value)

  // Tap routing: a thread's star → that bond; your star / empty sky → your reading.
  // Hit-tests the LIVE star positions in the worklet (within a generous radius),
  // and hands page coords back so the report blooms from the finger. maxDistance
  // keeps a vertical drag a list-scroll, not a tap.
  const tap = useMemo(
    () =>
      Gesture.Tap()
        .maxDistance(14)
        .onEnd((e) => {
          let hit = -1
          let best = 26 // px hit radius
          for (let i = 0; i < n; i++) {
            const q = pos.value[i]
            if (!q) continue
            const d = Math.hypot(e.x - q.x, e.y - q.y)
            if (d < best) {
              best = d
              hit = i
            }
          }
          if (hit >= 0 && onTapThread) runOnJS(onTapThread)(hit, e.absoluteX, e.absoluteY)
          else if (onTapSelf) runOnJS(onTapSelf)(e.absoluteX, e.absoluteY)
        }),
    [n, pos, onTapSelf, onTapThread]
  )

  return (
    <View style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={tap}>
        <Canvas style={StyleSheet.absoluteFill}>
          {/* gravity lines (under the stars) */}
          <Path
            path={linesPath}
            style='stroke'
            color={star.halo}
            strokeWidth={1}
            strokeCap='round'
            opacity={linesOpacity}
          />

          {/* threads in orbit */}
          {SLOTS.map((_, i) => (
            <ThreadStar
              key={i}
              idx={i}
              pos={pos}
              cx={cx}
              cy={cy}
              appear={appear}
              active={i < n}
              glowColors={threadGlowC}
              coreColors={threadCoreC}
            />
          ))}

          {/* you — the centre, tinted to your element */}
          <Group origin={center} transform={youScale}>
            <Circle c={center} r={26} opacity={haloOpacity}>
              <RadialGradient c={center} r={26} colors={youHaloC} />
            </Circle>
            <Circle c={center} r={10} opacity={glowOpacity}>
              <RadialGradient c={center} r={10} colors={youGlowC} positions={[0, 0.5, 1]} />
            </Circle>
            <Circle c={center} r={3.6} opacity={coreOpacity}>
              <RadialGradient c={center} r={3.6} colors={youCoreC} positions={[0, 0.45, 1]} />
            </Circle>
          </Group>
        </Canvas>
      </GestureDetector>
    </View>
  )
}

function ThreadStar({
  idx,
  pos,
  cx,
  cy,
  appear,
  active,
  glowColors,
  coreColors,
}: {
  idx: number
  pos: SharedValue<Array<{ x: number; y: number }>>
  cx: number
  cy: number
  appear: SharedValue<number>
  active: boolean
  glowColors: string[]
  coreColors: string[]
}) {
  // presence: 1 = seated in orbit, 0 = gone. A vacated slot (a bond you let go of)
  // animates OUT — drifting outward off its tether as it fades — instead of
  // popping; a new bond fades IN, settling inward to its orbit. The faint gravity
  // line is cut instantly (解缘 severs the tie, the star drifts free into the dark).
  const presence = useSharedValue(active ? 1 : 0)
  useEffect(() => {
    presence.value = withTiming(active ? 1 : 0, {
      duration: active ? 520 : 760,
      easing: active ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
    })
  }, [active, presence])
  const c = useDerivedValue(() => {
    const q = pos.value[idx] ?? { x: cx, y: cy }
    const dx = q.x - cx
    const dy = q.y - cy
    const len = Math.hypot(dx, dy) || 1
    const drift = (1 - presence.value) * 60 // px outward as it leaves / inward as it arrives
    return vec(q.x + (dx / len) * drift, q.y + (dy / len) * drift)
  })
  const glowOpacity = useDerivedValue(() => appear.value * presence.value * 0.55)
  const coreOpacity = useDerivedValue(() => appear.value * presence.value)
  return (
    <>
      <Circle c={c} r={7} opacity={glowOpacity}>
        <RadialGradient c={c} r={7} colors={glowColors} positions={[0, 0.5, 1]} />
      </Circle>
      <Circle c={c} r={2.4} opacity={coreOpacity}>
        <RadialGradient c={c} r={2.4} colors={coreColors} positions={[0, 0.5, 1]} />
      </Circle>
    </>
  )
}
