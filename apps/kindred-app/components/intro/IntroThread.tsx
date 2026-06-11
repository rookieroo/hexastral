/**
 * IntroThread — the Yuel (缘) intro: two stars and the gravity between them,
 * scored on a millisecond timeline (2026-06 director pass · v4).
 *
 * v4 craft pass (per the user's review):
 *   - GLOWS are real now: every star is a layered RADIAL light (soft outer halo →
 *     hot inner glow → white pip), not a flat opacity disc. Hero stars (A · D)
 *     gain a faint diffraction cross in the CLOSE-UP only.
 *   - COMET tail is BLURRED (BlurMask) gas — three widening, softening envelopes
 *     + a luminous coma head — instead of three hard sticks.
 *   - The MOON earns the ending. It rises with a bloom, presides through the
 *     story, then BRIGHTENS + GROWS to crown the bonded pair (the camera tilts the
 *     pair up to meet it). On the user's tap (`exit` 0→1) the scene fades to the
 *     dark ground while the moon settles to its onboarding resting size, centred —
 *     the literal hand-off into pair-input (whose moon is centred, size 64).
 *   - PACING / 由远及近 unchanged: WIDE comet → CUT closer for the parting orbit →
 *     CUT to a pushed-in 特写 (1.65→2.7) that HOLDS. No auto-advance; the tap is
 *     the only way forward and the host owns WHEN.
 *
 * Captions are trapezoids (fade in → hold → fade out), one at a time; the last
 * line holds. Constants below are the score — hand-feel wants device tuning.
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
import { kindredDark } from '@zhop/hexastral-tokens/kindred'
import { useEffect, useMemo } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, {
  Circle as SvgCircle,
  Defs as SvgDefs,
  RadialGradient as SvgRadial,
  Stop as SvgStop,
} from 'react-native-svg'
import { GalaxyBand, StarField } from '@/components/IntroScene'
import { KindredMoon } from '@/components/KindredMoon'

const BG = kindredDark.bg
// Literal palette so every gradient's transparent stop shares its sibling's hue
// (same-hue → 0 alpha = no grey/white fringing on the falloff).
const INK = '#f4f3ef' // starlight — the stars (people)
const INK_CLR = '#f4f3ef00'
const HALO = '#c4a882' // kindredDark.accent (ink.gold) — A, the WARM star
const HALO_HOT = '#e6c88c' // gold core (toned off near-white so A reads star, not sun)
const HALO_CLR = '#c4a88200'
const COOL = '#bcccea' // cool silver-blue — D, the OTHER star (warm/cool pair, not twins)
const COOL_HOT = '#e4edff'
const COOL_CLR = '#bcccea00'
const TAIL = '#dce9ff' // cool comet light
const TAIL_HOT = '#eef5ff'
const TAIL_CLR = '#dce9ff00'
const STAR_HOT = '#ffffff' // tiny white pip at each star's heart

const MOON_BASE = 96 // moon render size; transform-scaled per state

/* ── the score (absolute ms) ─────────────────────────────────────────────── */
const T_RISE = 3200 // shot 1: the sky fills, unhurried
const T_AB = T_RISE + 4800 // shot 2 (wide): comet SWEEPS past; a short lonely beat
const T_AC = T_AB + 5900 // shot 3 (closer): the slow 1½-turn orbit; C spirals away
const T_AD = T_AC + 6000 // shot 4 (close-up): the pair settles into its turn
// After T_AD nothing new happens — the pair keeps orbiting while the clock
// idles on (long tail), and the screen waits for the user's tap.
const CLOCK_END = T_AD + 600000

const C0 = { x: 0.5, y: 0.46 } // the barycentre (A's resting spot)
const TILT = 0.46 // orbit ellipse Y-squash → tilted orbital plane
const ORBIT_W = 0.0007 // rad/ms — the lasting pair's slow, calm turn

/* ── worklet helpers ─────────────────────────────────────────────────────── */
function clamp01(x: number): number {
  'worklet'
  return x < 0 ? 0 : x > 1 ? 1 : x
}
function between(t: number, a: number, b: number): number {
  'worklet'
  return clamp01((t - a) / (b - a))
}
function smooth(x: number): number {
  'worklet'
  return x * x * (3 - 2 * x)
}
function easeInC(x: number): number {
  'worklet'
  return x * x * x
}
function easeOutC(x: number): number {
  'worklet'
  const u = 1 - x
  return 1 - u * u * u
}
function lerp(a: number, b: number, t: number): number {
  'worklet'
  return a + (b - a) * t
}
/** One soft twinkle (0→1→0) starting at `at`, lasting `dur` ms of local time. */
function twinkle(u: number, at: number, dur: number): number {
  'worklet'
  const x = (u - at) / dur
  if (x < 0 || x > 1) return 0
  return Math.sin(x * Math.PI)
}
/** Trapezoid opacity: fade in over [i0,i1], hold, fade out over [o0,o1]. */
function fade(t: number, i0: number, i1: number, o0: number, o1: number): number {
  'worklet'
  if (t <= i0 || t >= o1) return 0
  if (t < i1) return smooth((t - i0) / (i1 - i0))
  if (t <= o0) return 1
  return 1 - smooth((t - o0) / (o1 - o0))
}
/** Quadratic bezier on one axis. */
function qbez(u: number, s: number, c: number, e: number): number {
  'worklet'
  const v = 1 - u
  return v * v * s + 2 * v * u * c + u * u * e
}

export interface IntroThreadProps {
  /** Four captions (the sky / the comet / the orbit that parts / the one that stays). */
  acts: string[]
  /** Persistent "tap to begin" hint — the ONLY way forward (no auto-advance). */
  continueLabel: string
  /**
   * Host-driven exit 0→1. On the user's tap the host ramps this; we fade the
   * scene to the dark ground while the moon settles to its onboarding resting
   * size (centred) — the brand hand-off into pair-input. The host owns WHEN.
   */
  exit: SharedValue<number>
}

export function IntroThread({ acts, continueLabel, exit }: IntroThreadProps) {
  const { width, height } = useWindowDimensions()
  const reduced = useReducedMotion()
  // pair-input's moon rests at safeTop + scroll-paddingTop(lg 24) + half-moon(32).
  // The exit lands the moon EXACTLY here so the cross-fade swap doesn't hop.
  const restY = useSafeAreaInsets().top + 24 + 32

  const mx = width * C0.x
  const my = height * C0.y
  const orbitR = Math.min(width, height) * 0.15

  // The clock — real milliseconds, linear, with a long idle tail so the final
  // pair keeps turning while the screen waits for the user.
  const clock = useSharedValue(0)
  useEffect(() => {
    if (reduced) {
      // Reduced motion: jump straight to the held final composition (no motion,
      // no auto-advance — the user taps when ready).
      clock.value = T_AD + 5000
      return
    }
    clock.value = withTiming(CLOCK_END, { duration: CLOCK_END, easing: Easing.linear })
  }, [reduced, clock])

  // Breath — the slow pulse on A (and, counter-phase, on D once bonded).
  const breath = useSharedValue(0)
  useEffect(() => {
    if (reduced) return
    breath.value = withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) })
    const id = setInterval(() => {
      breath.value = withTiming(breath.value < 0.5 ? 1 : 0, {
        duration: 2600,
        easing: Easing.inOut(Easing.sin),
      })
    }, 2600)
    return () => clearInterval(id)
  }, [reduced, breath])

  // A faint diffraction cross for the hero stars — drawn at the star's local
  // origin (inside its animated Group), shown only in the close-up.
  const spikePath = useMemo(() => {
    const p = Skia.Path.Make()
    const L = 12
    p.moveTo(-L, 0)
    p.lineTo(L, 0)
    p.moveTo(0, -L)
    p.lineTo(0, L)
    return p
  }, [])

  /* ── the scene, one frame worklet ──────────────────────────────────────── */
  const frame = useDerivedValue(() => {
    const t = clock.value
    const w = width
    const h = height
    const r = orbitR

    // shot 1 — the rise: A + the field translate up into place, unhurried.
    const rise = easeOutC(between(t, 800, 2600))
    const riseY = (1 - rise) * h * 0.42
    const aOp = rise

    // defaults
    let ax = mx
    let ay = my
    let aTw = 0
    const bsx = 0.16 * w
    const bsy = 0.2 * h
    let bx = bsx
    let by = bsy
    let bop = 0
    let tailUx = 1
    let tailUy = 0
    let tailL = 0
    let cx = 0.74 * w
    let cy = 0.32 * h
    let cop = 0
    let cTw = 0
    const dsx = 0.4 * w // D starts INSIDE the close-up frame (was 0.26 → zoomed off)
    const dsy = 0.56 * h
    let dx = dsx
    let dy = dsy
    let dop = 0
    let dTw = 0

    if (t >= T_RISE && t < T_AB) {
      // — SHOT 2 · the comet (WIDE) — a slow twinkle, then the comet SWEEPS the
      //   whole sky past A's side (an even arc you can watch, not a blink), then a
      //   short beat with A alone — present, not a wait.
      const u = t - T_RISE
      aTw = twinkle(u, 400, 600)
      const bTw = twinkle(u, 1200, 600)
      const su = smooth(between(u, 2000, 3900)) // a real sweep — even speed, ~1.9s
      const ex_ = 1.4 * w
      const ey_ = 0.72 * h
      const cpx = mx - 0.16 * w // control point offset — passes A's side
      const cpy = my + 0.02 * h
      bx = qbez(su, bsx, cpx, ex_)
      by = qbez(su, bsy, cpy, ey_)
      const vx = 2 * (1 - su) * (cpx - bsx) + 2 * su * (ex_ - cpx)
      const vy = 2 * (1 - su) * (cpy - bsy) + 2 * su * (ey_ - cpy)
      const vl = Math.hypot(vx, vy) || 1
      tailUx = vx / vl
      tailUy = vy / vl
      tailL = su > 0.01 && su < 0.995 ? 18 + 110 * su : 0 // tail vanishes as it exits
      const appear = smooth(between(u, 1000, 1600))
      const gone = smooth(between(u, 3750, 3950))
      bop = Math.max(bTw, appear * (1 - gone) * 0.95)
      // … 3900–4800: A alone. A short held beat, then we cut.
    } else if (t >= T_AB && t < T_AC) {
      // — SHOT 3 · the orbit that parts (one step CLOSER) — a quick settle, then
      //   1½ turns played out IN FULL; C then SPIRALS out of orbit and fades —
      //   slipping away along its own arc, not jerked sideways.
      const u = t - T_AB
      aTw = twinkle(u, 300, 600)
      cTw = twinkle(u, 900, 600)
      const rA = r * 0.42 // unequal masses — A swings less
      const rC = r * 0.58
      const csx = 0.74 * w
      const csy = 0.32 * h
      if (u < 2200) {
        const ap = smooth(between(u, 1200, 2200))
        ax = lerp(mx, mx + rA, ap)
        ay = my
        cx = lerp(csx, mx - rC, ap)
        cy = lerp(csy, my, ap)
        cop = smooth(between(u, 800, 1200))
      } else if (u < 4600) {
        // 1.5 turns over 2.4s — smoothstep: gentle start, steady middle, soft end.
        const theta = smooth(between(u, 2200, 4600)) * 3 * Math.PI
        ax = mx + rA * Math.cos(theta)
        ay = my + rA * Math.sin(theta) * TILT
        cx = mx - rC * Math.cos(theta)
        cy = my - rC * Math.sin(theta) * TILT
        cop = 1
      } else {
        // release at θ=3π: C keeps curving (spiral OUT) and fades — a graceful
        // slingshot, not a sideways jerk. A eases back to the barycentre.
        const lv = between(u, 4600, 5700)
        const e = easeInC(lv)
        const spiral = 3 * Math.PI + lv * 1.5
        const rOut = rC * (1 + e * 2.6)
        cx = mx - rOut * Math.cos(spiral)
        cy = my - rOut * Math.sin(spiral) * TILT
        cop = 1 - smooth(lv)
        ax = lerp(mx - rA, mx, easeOutC(between(u, 4600, 5500)))
        ay = my
      }
    } else if (t >= T_AC) {
      // — SHOT 4 · the one (CLOSE-UP) — call-and-response, a slow approach, then
      //   a gentle perpetual turn. After T_AD nothing new: the pair just keeps
      //   orbiting while the screen waits for the user's tap.
      const u = t - T_AC
      aTw = Math.max(twinkle(u, 400, 500), twinkle(u, 1700, 500))
      dTw = Math.max(twinkle(u, 1000, 500), twinkle(u, 2300, 500))
      dop = smooth(between(u, 900, 1400))
      const rr = r * 0.34 // a TIGHT pair — stays framed inside the 2.7× close-up
      if (u < 3500) {
        // D slides in EARLY (while the lens is still pushing) so it never parks at
        // the edge to be shoved off-frame.
        const ap = smooth(between(u, 1500, 3500))
        ax = lerp(mx, mx + rr, ap)
        ay = my
        dx = lerp(dsx, mx - rr, ap)
        dy = lerp(dsy, my, ap)
      } else {
        // angular velocity ramps over R ms, then a constant slow turn — forever.
        const ou = u - 3500
        const R = 1000
        const theta = ou < R ? (ORBIT_W * ou * ou) / (2 * R) : ORBIT_W * (R / 2 + (ou - R))
        ax = mx + rr * Math.cos(theta)
        ay = my + rr * Math.sin(theta) * TILT
        dx = mx - rr * Math.cos(theta)
        dy = my - rr * Math.sin(theta) * TILT
        dop = 1
      }
    }

    return {
      ax,
      ay: ay + riseY,
      aOp,
      aTw,
      bx,
      by: by + riseY,
      bop,
      tailUx,
      tailUy,
      tailL,
      cx,
      cy: cy + riseY,
      cop,
      cTw,
      dx,
      dy: dy + riseY,
      dop,
      dTw,
    }
  })

  /* ── camera (运镜): 由远及近 — each encounter one step closer; CUTs at shots ── */
  const camTransform = useDerivedValue(() => {
    const t = clock.value
    // CONTINUOUS 运镜 — no hard cuts, no blink. The lens TRAVELS by-far-to-near in
    // staged pushes (hold → smooth glide → hold), each landing on the next
    // encounter's framing. Scene changes are real camera moves, not a flash.
    const zoom =
      1.1 -
      0.18 * smooth(between(t, 0, T_RISE)) + // → 0.92 wide (the comet sweeps)
      0.34 * smooth(between(t, T_AB - 600, T_AB + 800)) + // → 1.26 closer (the orbit)
      0.4 * smooth(between(t, T_AC - 600, T_AC + 800)) + // → 1.66 in (the pair forms)
      1.04 * smooth(between(t, T_AC + 1400, T_AC + 6800)) // → 2.70 the slow push-in
    const rot =
      0.14 * smooth(between(t, T_AB - 600, T_AB + 800)) - // ease into the orbit's tilt
      0.19 * smooth(between(t, T_AC - 600, T_AC + 800)) // ease back for the close-up
    // pan: a faint chase on the comet (returns to 0), then the close-up lateral
    // drift + a final tilt UP so the pair rises to the presiding moon. Every term
    // starts at 0 → no jump at a boundary.
    const us = t - T_RISE
    const chase = smooth(between(us, 2000, 3400)) * (1 - smooth(between(us, 3500, 4300)))
    const panX = -16 * chase - 12 * smooth(between(t, T_AC + 800, T_AC + 5800))
    const panY = -height * 0.05 * smooth(between(t, T_AC + 1500, T_AC + 6800))
    return [{ translateX: panX }, { translateY: panY }, { scale: zoom }, { rotate: rot }]
  })

  /* ── node inputs — each star is an animated Group; paints stay static ────── */
  const f = frame
  const closeup = useDerivedValue(() => smooth(between(clock.value, T_AC, T_AC + 2500)))

  // A — the warm protagonist.
  const aT = useDerivedValue(() => {
    const k = 1 + breath.value * 0.1 + f.value.aTw * 0.22
    return [{ translateX: f.value.ax }, { translateY: f.value.ay }, { scale: k }]
  })
  const aHaloOp = useDerivedValue(
    () => f.value.aOp * (0.1 + breath.value * 0.06 + f.value.aTw * 0.2)
  )
  const aGlowOp = useDerivedValue(() => f.value.aOp * (0.24 + f.value.aTw * 0.2))
  const aCoreOp = useDerivedValue(() => f.value.aOp)
  const aSpikeOp = useDerivedValue(() => f.value.aOp * closeup.value * (0.12 + 0.22 * f.value.aTw))

  // D — the one; answers A's breath in counter-phase once bonded (互相呼应).
  const dT = useDerivedValue(() => {
    const k = 1 + (1 - breath.value) * 0.1 + f.value.dTw * 0.22
    return [{ translateX: f.value.dx }, { translateY: f.value.dy }, { scale: k }]
  })
  const dHaloOp = useDerivedValue(
    () => f.value.dop * (0.1 + (1 - breath.value) * 0.06 + f.value.dTw * 0.2)
  )
  const dGlowOp = useDerivedValue(() => f.value.dop * (0.24 + f.value.dTw * 0.2))
  const dCoreOp = useDerivedValue(() => f.value.dop)
  const dSpikeOp = useDerivedValue(() => f.value.dop * closeup.value * (0.12 + 0.22 * f.value.dTw))

  // B — the comet: a head Group + a layered, blurred tail (absolute coords, it
  // follows the velocity vector so it can't be grouped with the head).
  const bT = useDerivedValue(() => [{ translateX: f.value.bx }, { translateY: f.value.by }])
  const bOp = useDerivedValue(() => f.value.bop)
  const comaOp = useDerivedValue(() => f.value.bop * 0.6)
  const tailCore = useDerivedValue<SkPath>(() => {
    const path = Skia.Path.Make()
    const v = f.value
    path.moveTo(v.bx, v.by)
    path.lineTo(v.bx - v.tailUx * v.tailL, v.by - v.tailUy * v.tailL)
    return path
  })
  const tailMid = useDerivedValue<SkPath>(() => {
    const path = Skia.Path.Make()
    const v = f.value
    path.moveTo(v.bx, v.by)
    path.lineTo(v.bx - v.tailUx * v.tailL * 0.62, v.by - v.tailUy * v.tailL * 0.62)
    return path
  })
  const tailWide = useDerivedValue<SkPath>(() => {
    const path = Skia.Path.Make()
    const v = f.value
    path.moveTo(v.bx, v.by)
    path.lineTo(v.bx - v.tailUx * v.tailL * 0.36, v.by - v.tailUy * v.tailL * 0.36)
    return path
  })
  const tailOn = useDerivedValue(() => (f.value.tailL > 0 ? f.value.bop : 0))
  const tailCoreOp = useDerivedValue(() => tailOn.value * 0.5)
  const tailMidOp = useDerivedValue(() => tailOn.value * 0.22)
  const tailWideOp = useDerivedValue(() => tailOn.value * 0.12)

  // C — passes through A's orbit once, then slips away (no halo; transient).
  const cT = useDerivedValue(() => {
    const k = 1 + f.value.cTw * 0.25
    return [{ translateX: f.value.cx }, { translateY: f.value.cy }, { scale: k }]
  })
  const cOp = useDerivedValue(() => Math.max(f.value.cop, f.value.cTw * 0.85))

  const bright = useDerivedValue(() => smooth(between(clock.value, 1000, 3200)))

  /* ── RN-side styles (moon + bloom, starfield, captions, cta, exit) ───────── */
  // The moon: rises from below FIRST, presides through the story, BRIGHTENS +
  // GROWS to crown the bonded pair, then on exit settles to pair-input's centred
  // size-64 resting state (the logo hand-off).
  const moonStyle = useAnimatedStyle(() => {
    const t = clock.value
    const e = exit.value
    const rise = easeOutC(between(t, 200, 1900))
    const crown = smooth(between(t, T_AC + 1500, T_AD + 800))
    const fromBelow = (1 - rise) * height * 0.26
    // exit (e→1): settle to pair-input's resting moon — centred, restY, size 64 —
    // so the cross-fade route swap reads as ONE continuous moon (no jump/flicker).
    const yc = lerp(height * 0.16, restY, e) + fromBelow
    const s = lerp(lerp(0.84, 1.12, crown), 64 / MOON_BASE, e)
    const op = rise * Math.min(1, 0.58 + 0.22 * breath.value + 0.45 * crown)
    return {
      opacity: op,
      transform: [{ translateY: yc - MOON_BASE / 2 }, { scale: s }],
    }
  })
  const bloomStyle = useAnimatedStyle(() => {
    const t = clock.value
    const arrive = Math.sin(clamp01(between(t, 200, 2500)) * Math.PI) // 0→1→0 on the rise
    const crown = smooth(between(t, T_AC + 1500, T_AD + 800))
    return {
      opacity: (arrive * 0.6 + crown * 0.5) * (1 - exit.value),
      transform: [{ scale: 0.75 + 0.45 * arrive + 0.3 * crown }],
    }
  })

  const starfieldStyle = useAnimatedStyle(() => {
    const t = clock.value
    const sRise = easeOutC(between(t, 800, 2600))
    return {
      opacity: sRise,
      transform: [
        { translateY: (1 - sRise) * height * 0.35 },
        { scale: 1 + 0.02 * smooth(between(t, T_AC, T_AC + 6000)) },
        { rotate: `${-0.03 * smooth(between(t, T_AB, T_AB + 600))}rad` },
      ],
    }
  })

  // captions — trapezoids timed to the shots; the last line holds.
  const cap0 = useAnimatedStyle(() => ({
    opacity: fade(clock.value, 1500, 2100, 3200, 3800) * 0.62,
  }))
  const cap1 = useAnimatedStyle(() => ({
    opacity: fade(clock.value, T_RISE + 1800, T_RISE + 2400, T_RISE + 3800, T_RISE + 4300) * 0.62,
  }))
  const cap2 = useAnimatedStyle(() => ({
    opacity: fade(clock.value, T_AB + 2400, T_AB + 3000, T_AB + 5000, T_AB + 5500) * 0.62,
  }))
  const cap3 = useAnimatedStyle(() => ({
    opacity: fade(clock.value, T_AC + 4500, T_AC + 5200, CLOCK_END + 1, CLOCK_END + 2) * 0.62,
  }))
  const caps = [cap0, cap1, cap2, cap3]

  // The hint stays hidden through the opening, then breathes up; brightens once
  // the story resolves, and fades with the exit.
  const ctaStyle = useAnimatedStyle(() => {
    const show = smooth(between(clock.value, T_RISE + 600, T_RISE + 2100))
    const settle = smooth(between(clock.value, T_AD - 800, T_AD + 1400))
    return { opacity: show * (0.4 + 0.16 * breath.value + 0.34 * settle) * (1 - exit.value) }
  })

  const exitStyle = useAnimatedStyle(() => ({ opacity: exit.value }))

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* 星空 — rises with the night; echoes the camera faintly (parallax). */}
      <Animated.View style={[StyleSheet.absoluteFill, starfieldStyle]} pointerEvents='none'>
        <StarField width={width} height={height} brightSv={bright} />
        <GalaxyBand width={width} height={height} brightSv={bright} />
      </Animated.View>

      {/* the stars — transparent canvas; the camera Group cuts/zooms/drifts.
          pointerEvents none so taps fall through to the host Pressable (skip). */}
      <Canvas style={StyleSheet.absoluteFill} pointerEvents='none'>
        <Group transform={camTransform} origin={vec(mx, my)}>
          {/* B — the comet: blurred gas tail (wide→core) + luminous coma head */}
          <Path
            path={tailWide}
            style='stroke'
            strokeWidth={9}
            strokeCap='round'
            color={TAIL}
            opacity={tailWideOp}
          >
            <BlurMask blur={6} style='normal' />
          </Path>
          <Path
            path={tailMid}
            style='stroke'
            strokeWidth={5}
            strokeCap='round'
            color={TAIL}
            opacity={tailMidOp}
          >
            <BlurMask blur={3} style='normal' />
          </Path>
          <Path
            path={tailCore}
            style='stroke'
            strokeWidth={2}
            strokeCap='round'
            color={TAIL_HOT}
            opacity={tailCoreOp}
          >
            <BlurMask blur={1} style='normal' />
          </Path>
          <Group transform={bT}>
            <Circle c={vec(0, 0)} r={11} opacity={comaOp}>
              <RadialGradient
                c={vec(0, 0)}
                r={11}
                colors={[TAIL_HOT, TAIL, TAIL_CLR]}
                positions={[0, 0.45, 1]}
              />
            </Circle>
            <Circle c={vec(0, 0)} r={3} opacity={bOp}>
              <RadialGradient
                c={vec(0, 0)}
                r={3}
                colors={[STAR_HOT, TAIL_HOT, TAIL_CLR]}
                positions={[0, 0.5, 1]}
              />
            </Circle>
          </Group>

          {/* C — orbits A 1½ slow turns, then slips away */}
          <Group transform={cT}>
            <Circle c={vec(0, 0)} r={4.4} opacity={cOp}>
              <RadialGradient
                c={vec(0, 0)}
                r={4.4}
                colors={[STAR_HOT, INK, INK_CLR]}
                positions={[0, 0.5, 1]}
              />
            </Circle>
          </Group>

          {/* A — soft gold halo → gold core → white pip (+ close-up diffraction) */}
          <Group transform={aT}>
            <Circle c={vec(0, 0)} r={22} opacity={aHaloOp}>
              <RadialGradient c={vec(0, 0)} r={22} colors={[HALO, HALO_CLR]} positions={[0, 1]} />
            </Circle>
            <Circle c={vec(0, 0)} r={9} opacity={aGlowOp}>
              <RadialGradient
                c={vec(0, 0)}
                r={9}
                colors={[HALO_HOT, HALO, HALO_CLR]}
                positions={[0, 0.5, 1]}
              />
            </Circle>
            <Path
              path={spikePath}
              style='stroke'
              strokeWidth={1}
              strokeCap='round'
              color={STAR_HOT}
              opacity={aSpikeOp}
            >
              <BlurMask blur={1.2} style='normal' />
            </Path>
            <Circle c={vec(0, 0)} r={3.4} opacity={aCoreOp}>
              <RadialGradient
                c={vec(0, 0)}
                r={3.4}
                colors={[STAR_HOT, INK, INK_CLR]}
                positions={[0, 0.45, 1]}
              />
            </Circle>
          </Group>

          {/* D — the one: a COOL silver-white star (paired with gold A, not a twin) */}
          <Group transform={dT}>
            <Circle c={vec(0, 0)} r={22} opacity={dHaloOp}>
              <RadialGradient c={vec(0, 0)} r={22} colors={[COOL, COOL_CLR]} positions={[0, 1]} />
            </Circle>
            <Circle c={vec(0, 0)} r={9} opacity={dGlowOp}>
              <RadialGradient
                c={vec(0, 0)}
                r={9}
                colors={[COOL_HOT, COOL, COOL_CLR]}
                positions={[0, 0.5, 1]}
              />
            </Circle>
            <Path
              path={spikePath}
              style='stroke'
              strokeWidth={1}
              strokeCap='round'
              color={COOL_HOT}
              opacity={dSpikeOp}
            >
              <BlurMask blur={1.2} style='normal' />
            </Path>
            <Circle c={vec(0, 0)} r={3.4} opacity={dCoreOp}>
              <RadialGradient
                c={vec(0, 0)}
                r={3.4}
                colors={[STAR_HOT, COOL, COOL_CLR]}
                positions={[0, 0.45, 1]}
              />
            </Circle>
          </Group>
        </Group>
      </Canvas>

      <View style={S.captionWrap} pointerEvents='none'>
        {acts.slice(0, 4).map((line, i) => (
          <Animated.Text key={line} style={[S.caption, caps[i]]}>
            {line}
          </Animated.Text>
        ))}
      </View>

      <Animated.Text style={[S.cta, ctaStyle]} pointerEvents='none'>
        {continueLabel}
      </Animated.Text>

      {/* exit ground — fades in on tap UNDER the moon, so the moon survives the
          fade and morphs to the onboarding mark. */}
      <Animated.View
        pointerEvents='none'
        style={[StyleSheet.absoluteFill, { backgroundColor: BG }, exitStyle]}
      />

      {/* 月相 — bloom + brand crescent; the outro lands here and hands off. */}
      <Animated.View
        pointerEvents='none'
        style={[S.moonBox, { left: (width - MOON_BASE) / 2 }, moonStyle]}
      >
        <Animated.View pointerEvents='none' style={[S.bloom, bloomStyle]}>
          <Svg width={MOON_BASE * 2.6} height={MOON_BASE * 2.6}>
            <SvgDefs>
              <SvgRadial id='moonbloom' cx='50%' cy='50%' r='50%'>
                <SvgStop offset='0' stopColor={HALO_HOT} stopOpacity='0.55' />
                <SvgStop offset='0.45' stopColor={HALO} stopOpacity='0.12' />
                <SvgStop offset='1' stopColor={HALO} stopOpacity='0' />
              </SvgRadial>
            </SvgDefs>
            <SvgCircle
              cx={MOON_BASE * 1.3}
              cy={MOON_BASE * 1.3}
              r={MOON_BASE * 1.3}
              fill='url(#moonbloom)'
            />
          </Svg>
        </Animated.View>
        <KindredMoon size={MOON_BASE} />
      </Animated.View>
    </View>
  )
}

const S = StyleSheet.create({
  moonBox: {
    position: 'absolute',
    top: 0,
    width: MOON_BASE,
    height: MOON_BASE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloom: {
    position: 'absolute',
    width: MOON_BASE * 2.6,
    height: MOON_BASE * 2.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionWrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: '72%',
    alignItems: 'center',
  },
  caption: {
    position: 'absolute',
    color: INK,
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  cta: {
    position: 'absolute',
    bottom: 44,
    alignSelf: 'center',
    color: 'rgba(244,243,239,0.6)',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
})
