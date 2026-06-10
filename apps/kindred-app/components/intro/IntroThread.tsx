/**
 * IntroThread — the Yuel (缘) intro, re-staged thread-first (ADR-0024 / director's
 * treatment 2026-06-10).
 *
 * The articulated stick-figure rig chased realism (joints / grounded gait) and
 * fell into the uncanny valley — adding anatomy invited a standard the symbol
 * can't meet, so it read MORE fake. The fix is the opposite: MORE abstraction +
 * better timing. Here the PROTAGONIST is the thread (缘 = the line between two
 * people), and people are simple ink dots — a curve has no "wrong anatomy", so
 * it's fully controllable and believable. Pip-and-Posy craft: simple shapes,
 * eased arcs, generous HOLDS, emotion through minimalism.
 *
 * The four-beat parable (kept from the original, captions supplied by the host):
 *   0 you, alone           — a dot breathing, a short unspent thread-tail
 *   1 the reach that misses — a thread reaches toward another and falls short
 *   2 the tie that loosens  — the thread connects, then the other drifts away
 *   3 the one who stays     — the thread holds; the two settle close, calm
 * then a persistent "tap to begin" resolves to onboarding (the host owns the tap).
 *
 * One master progress drives everything via worklet-derived sub-phases, so the
 * choreography lives in one place and stays tempo-scalable. Skia + reanimated,
 * mirroring InkCenterpiece's value→Skia pattern. NOTE: hand-feel (timing, arc
 * shapes) wants on-device tuning — the constants below are the score, not gospel.
 */

import { Canvas, Circle, Fill, Group, Path, Skia, type SkPath } from '@shopify/react-native-skia'
import { kindredDark } from '@zhop/hexastral-tokens/kindred'
import { useEffect } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

const BG = kindredDark.bg
const INK = '#f4f3ef' // pale ink — the soul dots + the thread
const HALO = kindredDark.accent // warm gold breath around "you"

const DURATION = 15000

// Act boundaries on the master progress [0,1]. Act 3 (the one who stays) gets the
// longest stretch — it's the emotional payoff and wants the longest HOLD.
const A1 = 0.22
const A2 = 0.48
const A3 = 0.74

// ── worklet helpers ──────────────────────────────────────────────────────────
function clamp01(x: number): number {
  'worklet'
  return x < 0 ? 0 : x > 1 ? 1 : x
}
function seg(p: number, a: number, b: number): number {
  'worklet'
  return clamp01((p - a) / (b - a))
}
function smooth(x: number): number {
  'worklet'
  return x * x * (3 - 2 * x)
}
function lerp(a: number, b: number, t: number): number {
  'worklet'
  return a + (b - a) * t
}
/** A bell 0→1→0 over [0,1] — a fade-in-then-out for a transient figure. */
function bell(x: number): number {
  'worklet'
  return smooth(clamp01(x / 0.55)) * (1 - smooth(clamp01((x - 0.55) / 0.45)))
}

export interface IntroThreadProps {
  /** Four parable captions (arrival / near-miss / parts / stays). */
  acts: string[]
  /** Persistent "tap to begin" hint. */
  continueLabel: string
  /** Fires once when the timeline completes (the host also advances on tap). */
  onDone: () => void
}

export function IntroThread({ acts, continueLabel, onDone }: IntroThreadProps) {
  const { width, height } = useWindowDimensions()
  const reduced = useReducedMotion()

  // "You" — fixed, the constant the parable returns to. The partner moves.
  const yx = width * 0.4
  const yy = height * 0.5

  const p = useSharedValue(0)
  useEffect(() => {
    if (reduced) {
      onDone()
      return
    }
    p.value = withTiming(1, { duration: DURATION, easing: Easing.linear }, (done) => {
      if (done) runOnJS(onDone)()
    })
  }, [reduced, onDone, p])

  // Breath — a slow, independent pulse on "you" + a tiny bob on the dots.
  const breath = useSharedValue(0)
  useEffect(() => {
    breath.value = withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) })
    const id = setInterval(() => {
      breath.value = withTiming(breath.value < 0.5 ? 1 : 0, {
        duration: 2600,
        easing: Easing.inOut(Easing.sin),
      })
    }, 2600)
    return () => clearInterval(id)
  }, [breath])

  // ── partner position + presence ──────────────────────────────────────────
  // One dot makes three approaches: misses (act1), ties-then-leaves (act2),
  // stays (act3). Off-screen right is the wing it enters/exits from.
  const off = width * 1.18
  const partner = useDerivedValue(() => {
    const pv = p.value
    if (pv < A1) return { x: off, y: yy, op: 0 }
    if (pv < A2) {
      const a = seg(pv, A1, A2)
      const reachX = width * 0.66 // stays a GAP from you — the near-miss
      const x =
        a < 0.6 ? lerp(off, reachX, smooth(a / 0.6)) : lerp(reachX, off, smooth((a - 0.6) / 0.4))
      return { x, y: yy, op: bell(a) }
    }
    if (pv < A3) {
      const a = seg(pv, A2, A3)
      const tieX = width * 0.56 // closer — the thread connects
      const x =
        a < 0.62 ? lerp(off, tieX, smooth(a / 0.62)) : lerp(tieX, off, smooth((a - 0.62) / 0.38))
      return { x, y: yy, op: bell(a) }
    }
    const a = seg(pv, A3, 1)
    const stayX = width * 0.52 // close, and stays
    return {
      x: lerp(off, stayX, smooth(Math.min(1, a / 0.45))),
      y: yy,
      op: smooth(Math.min(1, a / 0.45)),
    }
  })

  const partnerCx = useDerivedValue(() => partner.value.x)
  const partnerCy = useDerivedValue(() => partner.value.y)
  const partnerOp = useDerivedValue(() => partner.value.op)

  const youHaloR = useDerivedValue(() => 16 + breath.value * 5)
  const youHaloOp = useDerivedValue(() => 0.1 + breath.value * 0.08)

  // ── the thread ────────────────────────────────────────────────────────────
  // A cubic from "you" toward the partner. In act1 the far end FALLS SHORT of the
  // partner (the miss) and sags; from act2 it CONNECTS; in act3 it goes calm — a
  // gentle taut S between two close dots. A faint trailing tail in act0 (unspent).
  const threadPath = useDerivedValue<SkPath>(() => {
    const pv = p.value
    const path = Skia.Path.Make()
    const sx = yx
    const sy = yy

    if (pv < A1) {
      // unspent tail — a short stroke drifting from "you", drawing on.
      const a = seg(pv, 0, A1)
      const len = 36 * smooth(a)
      path.moveTo(sx, sy)
      path.cubicTo(sx + len * 0.5, sy - 10, sx + len, sy + 6 * Math.sin(a * 6), sx + len, sy + 2)
      return path
    }

    const tx = partner.value.x
    // How far along to the partner the thread actually reaches: act1 short (miss),
    // act2/3 full (connect). Quiver while reaching, calm once held.
    let reach = 1
    let sag = 0
    let quiver = 0
    if (pv < A2) {
      const a = seg(pv, A1, A2)
      reach = 0.78 * bell(a) // never gets there, recoils
      sag = 26 * bell(a)
      quiver = 5 * bell(a) * Math.sin(a * 30)
    } else if (pv < A3) {
      const a = seg(pv, A2, A3)
      reach = bell(a) > 0 ? 1 : 0
      sag = 14 * (1 - smooth(Math.min(1, a / 0.5))) // settles, then loosens as partner leaves
      quiver = 3 * bell(a) * Math.sin(a * 22)
    } else {
      const a = seg(pv, A3, 1)
      reach = smooth(Math.min(1, a / 0.45))
      sag = 10 - 6 * smooth(Math.min(1, a / 0.6)) // eases to a calm taut line
    }

    const ex = lerp(sx, tx, reach)
    const midx = (sx + ex) / 2
    const c1x = lerp(sx, midx, 0.5)
    const c2x = lerp(midx, ex, 0.5)
    path.moveTo(sx, sy)
    path.cubicTo(c1x, sy + sag + quiver, c2x, sy - sag + quiver, ex, sy)
    return path
  })
  const threadOp = useDerivedValue(() => {
    const pv = p.value
    if (pv < A1) return 0.5 * smooth(seg(pv, 0, A1))
    return 0.7
  })
  const threadW = useDerivedValue(() => (p.value >= A3 ? 2.4 : 1.8))

  // ── captions (RN overlay, one visible at a time; cross-faded by the timeline) ─
  const cap0 = useAnimatedStyle(() => ({ opacity: bell(seg(p.value, 0, A1)) }))
  const cap1 = useAnimatedStyle(() => ({ opacity: bell(seg(p.value, A1, A2)) }))
  const cap2 = useAnimatedStyle(() => ({ opacity: bell(seg(p.value, A2, A3)) }))
  // The final caption fades IN and holds (it carries the resolve into the CTA).
  const cap3 = useAnimatedStyle(() => ({
    opacity: smooth(Math.min(1, seg(p.value, A3, 1) / 0.25)),
  }))
  const caps = [cap0, cap1, cap2, cap3]

  const ctaStyle = useAnimatedStyle(() => ({ opacity: 0.45 + 0.2 * breath.value }))

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Fill color={BG} />
        {/* the thread — the hero */}
        <Path
          path={threadPath}
          style='stroke'
          strokeWidth={threadW}
          strokeCap='round'
          color={INK}
          opacity={threadOp}
        />
        {/* you — breathing halo + soul dot */}
        <Group>
          <Circle cx={yx} cy={yy} r={youHaloR} color={HALO} opacity={youHaloOp} />
          <Circle cx={yx} cy={yy} r={4.5} color={INK} />
        </Group>
        {/* the other — a soul dot that comes and goes, then stays */}
        <Circle cx={partnerCx} cy={partnerCy} r={4.5} color={INK} opacity={partnerOp} />
      </Canvas>

      {/* captions — stacked, cross-faded by the timeline */}
      <View style={S.captionWrap} pointerEvents='none'>
        {acts.slice(0, 4).map((line, i) => (
          <Animated.Text key={line} style={[S.caption, caps[i]]}>
            {line}
          </Animated.Text>
        ))}
      </View>

      {/* persistent skip hint (the host's Pressable does the actual advancing) */}
      <Animated.Text style={[S.cta, ctaStyle]} pointerEvents='none'>
        {continueLabel}
      </Animated.Text>
    </View>
  )
}

const S = StyleSheet.create({
  captionWrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: '64%',
    alignItems: 'center',
  },
  caption: {
    position: 'absolute',
    color: INK,
    fontSize: 18,
    lineHeight: 26,
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
