/**
 * IntroThread — the Yuel (缘) intro, re-conceived as TWO STARS and the gravity
 * between them (2026-06). The red-thread (红线) framing was East-Asian-specific —
 * a Western user reads nothing into a red line — so the metaphor is now pure,
 * universal physics that lives in the starfield: attraction, repulsion, orbit.
 *
 * The four beats (captions supplied by the host):
 *   0 you, alone           — a warm star breathing among the cosmos
 *   1 the pull that misses  — a star curves IN toward you, grazes close, then its
 *                             momentum slings it past and away
 *   2 the flare that repels — a star nears, FLARES bright, and is flung off (a clash)
 *   3 the one who stays     — a star decelerates and settles into a stable ORBIT
 *                             around you: a binary pair, bound, both lit
 * then a 定格 holds the two-of-you in orbit before the host fades on.
 *
 * The orbit IS the bond — bound stars orbit each other forever, legible to anyone,
 * no cultural key required. One master progress drives everything via worklet
 * sub-phases. Skia + reanimated. Hand-feel (timings, orbit radius, the flare)
 * wants on-device tuning — the constants below are the score, not gospel.
 */

import { Canvas, Circle, Group, vec } from '@shopify/react-native-skia'
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
import { GalaxyBand, StarField } from '@/components/IntroScene'
import { KindredMoon } from '@/components/KindredMoon'

const BG = kindredDark.bg
const INK = '#f4f3ef' // pale starlight — neutral stars (people)
const HALO = kindredDark.accent // warm gold — you + the one
const FLARE = '#fff7e8' // hot white-gold — the clash that repels

// The story plays, then the resolved frame FREEZES (定格) — a held beat before
// the host fades on. The user can tap to skip the whole thing at any time.
const STORY_DURATION = 12000
const FREEZE_HOLD = 3200

// Beat boundaries on the master progress [0,1].
const A1 = 0.24
const A2 = 0.5
const A3 = 0.74

// — You: the fixed warm star the others move around.
const YOU = { x: 0.4, y: 0.43 }
// B — pulled in, slings past: enters upper-right, curves toward you, exits lower-left.
const B = { fromX: 1.25, fromY: 0.16, toX: -0.28, toY: 0.66 }
// C — nears, flares, flung away: enters lower-right, recoils to upper-right.
const C = { fromX: 1.22, fromY: 0.8, flungX: 1.32, flungY: 0.3 }
// D — the one: enters from the left, settles into orbit around you.
const D = { fromX: -0.32, fromY: 0.46 }

const GHOST_OP = 0.14 // a distant, faded star (a past encounter)
const DOT_R = 4.5

// — worklet helpers —
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
/** Quadratic bezier on one axis — S → C → E (C bows the path). */
function qbez(t: number, s: number, c: number, e: number): number {
  'worklet'
  const u = 1 - t
  return u * u * s + 2 * u * t * c + t * t * e
}
/** A bell 0→1→0 over [0,1] — fade-in-then-out for a transient star. */
function bell(x: number): number {
  'worklet'
  return smooth(clamp01(x / 0.5)) * (1 - smooth(clamp01((x - 0.5) / 0.5)))
}

export interface IntroThreadProps {
  /** Four parable captions (alone / the miss / the flare / the orbit). */
  acts: string[]
  /** Persistent "tap to begin" hint. */
  continueLabel: string
  /** Fires once when the timeline + freeze complete (the host also advances on tap). */
  onDone: () => void
}

export function IntroThread({ acts, continueLabel, onDone }: IntroThreadProps) {
  const { width, height } = useWindowDimensions()
  const reduced = useReducedMotion()

  // "You" — fixed, the warm star the others move around.
  const yx = width * YOU.x
  const yy = height * YOU.y
  const orbitR = Math.min(width, height) * 0.15

  const p = useSharedValue(0)
  useEffect(() => {
    if (reduced) {
      onDone()
      return
    }
    let holdTimer: ReturnType<typeof setTimeout> | null = null
    // 定格: once the story reaches its final frame, HOLD it for a beat before the
    // host advances — the frame stays at p=1; only the breath + star twinkle live on.
    const startFreeze = () => {
      holdTimer = setTimeout(onDone, FREEZE_HOLD)
    }
    p.value = withTiming(1, { duration: STORY_DURATION, easing: Easing.linear }, (done) => {
      if (done) runOnJS(startFreeze)()
    })
    return () => {
      if (holdTimer) clearTimeout(holdTimer)
    }
  }, [reduced, onDone, p])

  // Breath — a slow, independent pulse on "you" + the one.
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

  // One frame worklet positions all three encounter-stars + the clash flare, so
  // the gravity choreography lives in ONE place and the nodes just read it.
  const frame = useDerivedValue(() => {
    const pv = p.value
    const w = width
    const h = height

    // — B: attraction that misses — a curve bowed toward you, then gone —
    let bx = B.fromX * w
    let by = B.fromY * h
    let bop = 0
    if (pv >= A1 && pv < A2) {
      const a = seg(pv, A1, A2)
      // Bow toward you but the control is OFFSET from your star by a clear gap —
      // B passes to the SIDE, never through you (not your kind; it passes by).
      bx = qbez(a, B.fromX * w, yx + w * 0.13, B.toX * w)
      by = qbez(a, B.fromY * h, yy - h * 0.05, B.toY * h)
      bop = 0.95 * bell(a)
    } else if (pv >= A2) {
      bx = B.toX * w
      by = B.toY * h
      bop = GHOST_OP
    }

    // — C: repulsion — pulled in, FLARE at the clash, flung away —
    let cx = C.fromX * w
    let cy = C.fromY * h
    let cop = 0
    let cflare = 0
    if (pv >= A2 && pv < A3) {
      const a = seg(pv, A2, A3)
      const nearX = lerp(yx, C.fromX * w, 0.34)
      const nearY = lerp(yy, C.fromY * h, 0.34)
      if (a < 0.5) {
        const came = smooth(a / 0.5)
        cx = lerp(C.fromX * w, nearX, came)
        cy = lerp(C.fromY * h, nearY, came)
        cop = 0.9 * came
      } else {
        const gone = smooth((a - 0.5) / 0.5)
        cx = lerp(nearX, C.flungX * w, gone)
        cy = lerp(nearY, C.flungY * h, gone)
        cop = lerp(0.95, GHOST_OP, gone)
      }
      const f = 1 - Math.abs(a - 0.5) / 0.12
      cflare = f > 0 ? smooth(f) : 0
    } else if (pv >= A3) {
      cx = C.flungX * w
      cy = C.flungY * h
      cop = GHOST_OP
    }

    // — D: the one — approach, then a stable orbit around you —
    let dx = D.fromX * w
    let dy = D.fromY * h
    let dop = 0
    if (pv >= A3) {
      const a = seg(pv, A3, 1)
      if (a < 0.4) {
        const came = smooth(a / 0.4)
        dx = lerp(D.fromX * w, yx + orbitR, came)
        dy = lerp(D.fromY * h, yy, came)
        dop = came
      } else {
        const angle = ((a - 0.4) / 0.6) * 1.7 * Math.PI
        dx = yx + orbitR * Math.cos(angle)
        dy = yy + orbitR * Math.sin(angle)
        dop = 1
      }
    }

    return { bx, by, bop, cx, cy, cop, cflare, dx, dy, dop }
  })

  const bCx = useDerivedValue(() => frame.value.bx)
  const bCy = useDerivedValue(() => frame.value.by)
  const bOp = useDerivedValue(() => frame.value.bop)
  const cCx = useDerivedValue(() => frame.value.cx)
  const cCy = useDerivedValue(() => frame.value.cy)
  const cOp = useDerivedValue(() => frame.value.cop)
  const cFlareR = useDerivedValue(() => 6 + frame.value.cflare * 26)
  const cFlareOp = useDerivedValue(() => frame.value.cflare * 0.7)
  const dCx = useDerivedValue(() => frame.value.dx)
  const dCy = useDerivedValue(() => frame.value.dy)
  const dOp = useDerivedValue(() => frame.value.dop)

  const youHaloR = useDerivedValue(() => 16 + breath.value * 5)
  const youHaloOp = useDerivedValue(() => 0.12 + breath.value * 0.1)
  // The one (D) warms like you do once it settles — gold breath, mirroring yours.
  const dHaloR = useDerivedValue(() => 13 + breath.value * 4)
  const dHaloOp = useDerivedValue(() => frame.value.dop * (0.14 + breath.value * 0.08))

  // Stars start faintly lit (visible from frame 0) and brighten as the story
  // resolves — the cosmos "comes up" toward the 定格. Galaxy follows.
  const bright = useDerivedValue(() => smooth(clamp01(p.value)))
  // Brand moon — breathing, fades in over the first beat; the cosmic anchor +
  // the hand-off point into pair-input's moon entrance.
  const moonStyle = useAnimatedStyle(() => ({
    opacity: (0.5 + breath.value * 0.22) * smooth(clamp01(p.value / 0.12)),
  }))

  // — Camera (运镜): a gentle dolly-in across the story + a slow orbital rotation
  // on the final beat, scaling/rotating around YOU. The far starfield stays put,
  // so the foreground sliding over it reads as depth (cheap parallax).
  const camTransform = useDerivedValue(() => [
    { scale: lerp(1, 1.14, smooth(clamp01(p.value))) },
    { rotate: 0.1 * smooth(seg(p.value, A3, 1)) },
  ])

  // captions — one visible at a time, cross-faded by the timeline.
  const cap0 = useAnimatedStyle(() => ({ opacity: bell(seg(p.value, 0, A1)) }))
  const cap1 = useAnimatedStyle(() => ({ opacity: bell(seg(p.value, A1, A2)) }))
  const cap2 = useAnimatedStyle(() => ({ opacity: bell(seg(p.value, A2, A3)) }))
  const cap3 = useAnimatedStyle(() => ({
    opacity: smooth(clamp01(seg(p.value, A3, 1) / 0.25)),
  }))
  const caps = [cap0, cap1, cap2, cap3]

  const ctaStyle = useAnimatedStyle(() => ({ opacity: 0.45 + 0.2 * breath.value }))

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* 星空 — visible from the first frame, brightening toward the 定格. */}
      <StarField width={width} height={height} brightSv={bright} />
      <GalaxyBand width={width} height={height} brightSv={bright} />
      {/* 月相 logo — the brand anchor + the hand-off point into onboarding's moon. */}
      <Animated.View style={[S.moon, moonStyle]} pointerEvents='none'>
        <KindredMoon size={76} />
      </Animated.View>
      {/* the stars, on a TRANSPARENT canvas so the starfield shows through. The
          camera Group scales/rotates the whole foreground around YOU (运镜). */}
      <Canvas style={StyleSheet.absoluteFill}>
        <Group transform={camTransform} origin={vec(yx, yy)}>
          {/* B — a pale star pulled past */}
          <Circle cx={bCx} cy={bCy} r={DOT_R} color={INK} opacity={bOp} />
          {/* C — the clash: a hot flare + the star flung away */}
          <Circle cx={cCx} cy={cCy} r={cFlareR} color={FLARE} opacity={cFlareOp} />
          <Circle cx={cCx} cy={cCy} r={DOT_R} color={INK} opacity={cOp} />
          {/* you — a warm star, breathing */}
          <Group>
            <Circle cx={yx} cy={yy} r={youHaloR} color={HALO} opacity={youHaloOp} />
            <Circle cx={yx} cy={yy} r={DOT_R} color={INK} />
          </Group>
          {/* D — the one: warm-haloed, settled into orbit */}
          <Circle cx={dCx} cy={dCy} r={dHaloR} color={HALO} opacity={dHaloOp} />
          <Circle cx={dCx} cy={dCy} r={DOT_R} color={INK} opacity={dOp} />
        </Group>
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
  moon: {
    position: 'absolute',
    top: '12%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captionWrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: '70%',
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
