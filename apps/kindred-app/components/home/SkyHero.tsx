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

import { Canvas, Circle, Group, RadialGradient, vec } from '@shopify/react-native-skia'
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
  withSequence,
  withTiming,
} from 'react-native-reanimated'

const INK = '#f4f3ef'
const HALO = '#c4a882' // default gold — you, when no element is known yet
const HALO_HOT = '#e6c88c'
const COOL = '#bcccea' // cool silver — the others in your orbit
const COOL_HOT = '#e4edff'
const STAR_HOT = '#ffffff'
// 解缘 black hole — a faint ring of light (accretion) that opens at the let-go star
// then collapses. Transparent center + edge, bright at ~0.8 → reads as a ring, not
// a disc (a dark disc would vanish on the dark sky).
const VOID_RING = ['#e4edff00', '#e4edff00', '#e4edffcc', '#e4edff00']

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
  /** Per-thread 五行 (the OTHER person's element), in orbit-slot order — tints each
   *  bond star so it reads in that person's colour. Falls back to cool silver. */
  threadElements?: Array<string | null | undefined>
  /** Pause the drift + breath (screen blurred / app backgrounded) to save heat. */
  paused?: boolean
  /** Tap your central star (or empty sky) → your personal reading. Receives page
   *  coords for the ink-bloom origin. */
  onTapSelf?: (x: number, y: number) => void
  /** Tap a thread's star → that bond. `index` is the orbit slot = the i-th thread
   *  the host passed (the host maps it to a bond id). */
  onTapThread?: (index: number, x: number, y: number) => void
  /** Swipe LEFT on the blank sky → a horizontal destination (the home wires this
   *  to Settings). Composed with the tap via Race, so a tap still opens a reading
   *  and only a deliberate leftward drag navigates. */
  onSwipeLeft?: () => void
  /** Collapse progress 0→1, driven by the home's scroll. At 1 the orbit rings,
   *  gravity spokes and orbiting threads fade out so only your central star is
   *  left as the hero recedes to a slim header. */
  collapse?: SharedValue<number>
}

export function SkyHero({
  width,
  height,
  threadCount,
  element,
  threadElements,
  paused,
  onTapSelf,
  onTapThread,
  onSwipeLeft,
  collapse,
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
  // Per-slot thread-star colours: each bond star takes the OTHER person's 五行 light
  // (so the sky reads as a constellation of elements), falling back to cool silver
  // when that bond's element isn't known yet. Mirrors the central star's glow/core
  // build so a thread star is the same form, just in its own hue.
  const threadColors = useMemo(
    () =>
      SLOTS.map((_, i) => {
        const el = threadElements?.[i]
        const s = (el && ELEMENT_STAR[el]) || { halo: COOL, hot: COOL_HOT }
        return {
          glow: [s.hot, s.halo, fade(s.halo)],
          core: [STAR_HOT, s.halo, fade(s.halo)],
        }
      }),
    [threadElements]
  )

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

  // Live positions of all six slots — each thread star reads its seat from here.
  // The threads DRIFT in orbit (the motion implies "in your orbit"); we no longer
  // draw the tracks or the spokes — only you + the active thread-stars. So the sky
  // answers to the real bond count: 0 threads = just you, and a let-go star simply
  // vanishes (its black-hole pulse) with no orphaned ring left behind.
  const pos = useDerivedValue(() =>
    SLOTS.map((s) => {
      const th = s.a0 + ORBIT_W * s.wf * clock.value
      const r = heroMin * s.rf
      return { x: cx + r * Math.cos(th), y: cy + r * Math.sin(th) * TILT }
    })
  )

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

  // Leftward swipe on the blank sky → onSwipeLeft (home wires it to Settings).
  // activeOffsetX keeps it from stealing stationary star-taps; failOffsetY yields
  // to vertical drags. Raced with the tap: a deliberate leftward drag past the
  // threshold wins, otherwise the tap opens a reading as before.
  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-15, 15])
        .failOffsetY([-20, 20])
        .onEnd((e) => {
          if ((e.translationX < -55 || e.velocityX < -650) && onSwipeLeft) {
            runOnJS(onSwipeLeft)()
          }
        }),
    [onSwipeLeft]
  )
  // Only compose the swipe when a handler is wired, so SkyHero's tap behaviour is
  // untouched for any caller that doesn't opt in.
  const gesture = useMemo(
    () => (onSwipeLeft ? Gesture.Race(swipe, tap) : tap),
    [onSwipeLeft, swipe, tap]
  )

  return (
    <View style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={gesture}>
        <Canvas style={StyleSheet.absoluteFill}>
          {/* threads in orbit — you + the active thread-stars only; no tracks, no
              spokes, so the sky maps 1:1 to your bonds */}
          {SLOTS.map((_, i) => (
            <ThreadStar
              key={i}
              idx={i}
              pos={pos}
              cx={cx}
              cy={cy}
              appear={appear}
              active={i < n}
              collapse={collapse}
              glowColors={threadColors[i]?.glow ?? [COOL_HOT, COOL, fade(COOL)]}
              coreColors={threadColors[i]?.core ?? [STAR_HOT, COOL, fade(COOL)]}
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
  collapse,
  glowColors,
  coreColors,
}: {
  idx: number
  pos: SharedValue<Array<{ x: number; y: number }>>
  cx: number
  cy: number
  appear: SharedValue<number>
  active: boolean
  collapse?: SharedValue<number>
  glowColors: string[]
  coreColors: string[]
}) {
  // presence: 1 = seated in orbit, 0 = gone. 解缘 (active true→false) opens a black
  // hole AT the star: an accretion ring blooms, the star is pulled in (shrinks) and
  // fades, then the ring collapses to nothing. A new bond simply fades in at its
  // seat. The gravity line is cut instantly (the tie severs the moment you let go).
  const presence = useSharedValue(active ? 1 : 0)
  const swallow = useSharedValue(0)
  const wasActive = useRef(active)
  useEffect(() => {
    presence.value = withTiming(active ? 1 : 0, {
      duration: active ? 520 : 760,
      easing: active ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
    })
    if (wasActive.current && !active) {
      // The swallow pulse: ring opens fast, then collapses as the star is consumed.
      swallow.value = 0
      swallow.value = withSequence(
        withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 480, easing: Easing.in(Easing.cubic) })
      )
    }
    wasActive.current = active
  }, [active, presence, swallow])

  // Seated at its live orbit point — the hole forms here, so the star collapses in
  // place (no outward drift now; the black hole does the work).
  const c = useDerivedValue(() => {
    const q = pos.value[idx] ?? { x: cx, y: cy }
    return vec(q.x, q.y)
  })
  // Star shrinks as the hole pulls it in (swallow), fades as it leaves (presence).
  const glowR = useDerivedValue(() => 7 * (1 - swallow.value * 0.92))
  const coreR = useDerivedValue(() => 2.4 * (1 - swallow.value * 0.92))
  const glowOpacity = useDerivedValue(
    () => appear.value * presence.value * 0.55 * (1 - (collapse?.value ?? 0))
  )
  const coreOpacity = useDerivedValue(
    () => appear.value * presence.value * (1 - (collapse?.value ?? 0))
  )
  // Accretion ring — radius opens then collapses with the swallow pulse.
  const ringR = useDerivedValue(() => Math.max(0.01, swallow.value * 18))
  const ringOpacity = useDerivedValue(() => swallow.value)
  return (
    <>
      <Circle c={c} r={ringR} opacity={ringOpacity}>
        <RadialGradient c={c} r={ringR} colors={VOID_RING} positions={[0, 0.55, 0.82, 1]} />
      </Circle>
      <Circle c={c} r={glowR} opacity={glowOpacity}>
        <RadialGradient c={c} r={glowR} colors={glowColors} positions={[0, 0.5, 1]} />
      </Circle>
      <Circle c={c} r={coreR} opacity={coreOpacity}>
        <RadialGradient c={c} r={coreR} colors={coreColors} positions={[0, 0.5, 1]} />
      </Circle>
    </>
  )
}
