/**
 * IntroThread — the Yuel (缘) intro, re-staged thread-first (ADR-0024 / director's
 * treatment 2026-06-10), then clarified to read as THREE relationships (2026-06).
 *
 * The articulated stick-figure rig chased realism (joints / grounded gait) and
 * fell into the uncanny valley — adding anatomy invited a standard the symbol
 * can't meet, so it read MORE fake. The fix is the opposite: MORE abstraction +
 * better timing. Here the PROTAGONIST is the thread (缘 = the line between two
 * people), and people are simple ink dots — a curve has no "wrong anatomy", so
 * it's fully controllable and believable.
 *
 * CLARITY PASS (2026-06: "没看出来是 A 和 B、C、D 分别交往得出的三段感情"): the
 * first thread cut reused ONE partner dot that entered/exited three times at the
 * same spot, so it read as a single on-off person, not three relationships — and
 * so was HARDER to parse than the old stick figures. Now there are THREE distinct
 * others (B / C / D), each at its own station, and the ones whose act has passed
 * LINGER as faint ghosts. So by the final beat you literally see four dots — you,
 * two faded loves behind you, and the one, lit and tied close. The parable's
 * meaning ("you, then some you couldn't hold, then the one who stays") is now
 * spatial, not temporal.
 *
 * The four-beat parable (captions supplied by the host):
 *   0 you, alone            — a dot breathing, a short unspent thread-tail
 *   1 B — the reach that misses — a thread reaches toward B and falls short; B
 *                                  lingers, faint, upper-right
 *   2 C — the tie that loosens  — the thread ties to C, then C drifts away and
 *                                  fades to a ghost, lower-right
 *   3 D — the one who stays     — the thread holds; D settles close and lit
 * then a persistent "tap to begin" resolves to onboarding (the host owns the tap).
 *
 * One master progress drives everything via worklet-derived sub-phases, so the
 * choreography lives in one place and stays tempo-scalable. Skia + reanimated,
 * mirroring InkCenterpiece's value→Skia pattern. NOTE: hand-feel (timing, arc
 * shapes, the four stations) wants on-device tuning — the constants below are the
 * score, not gospel.
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

// ── stations — fractions of (width, height). The four dots sit at FOUR distinct
// places so they read as four people, not one blinking on and off. Faded loves
// stay where their act left them (the ghost spots).
const YOU = { x: 0.38, y: 0.4 }
// B — reached for, missed: drifts in from the right wing to a far upper-right
// station and stays there, faint.
const B = { fromX: 1.2, fromY: 0.2, x: 0.74, y: 0.24 }
// C — known, then let go: enters low, ties close, then drifts off to a faint
// lower-right ghost.
const C = { fromX: 1.2, fromY: 0.66, x: 0.58, y: 0.56, ghostX: 0.86, ghostY: 0.64 }
// D — the one who stays: enters at your height and settles close, lit.
const D = { fromX: 1.2, fromY: 0.4, x: 0.55, y: 0.42 }
const GHOST_OP = 0.16 // a past love, still faintly there

const DOT_R = 4.5

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
/** An eased S-curve thread from (sx,sy) to (ex,ey), bowed by `sag` on the
 *  perpendicular so a 2-D line still reads as a hand-drawn ink stroke. */
function makeThread(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  sag: number,
  quiver: number
): SkPath {
  'worklet'
  const path = Skia.Path.Make()
  const dx = ex - sx
  const dy = ey - sy
  const len = Math.max(1, Math.hypot(dx, dy))
  // perpendicular unit — the bow direction
  const nx = -dy / len
  const ny = dx / len
  const m1x = lerp(sx, ex, 0.33) + nx * sag + quiver
  const m1y = lerp(sy, ey, 0.33) + ny * sag
  const m2x = lerp(sx, ex, 0.66) - nx * sag + quiver
  const m2y = lerp(sy, ey, 0.66) - ny * sag
  path.moveTo(sx, sy)
  path.cubicTo(m1x, m1y, m2x, m2y, ex, ey)
  return path
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

  // "You" — fixed, the constant the parable returns to. The others come and go.
  const yx = width * YOU.x
  const yy = height * YOU.y

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

  // Breath — a slow, independent pulse on "you".
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

  // ── one frame worklet drives the whole scene ───────────────────────────────
  // Returns every dot's position+opacity AND the active thread path, so the
  // station math lives in ONE place and the <Circle>/<Path> nodes just read it.
  const frame = useDerivedValue(() => {
    const pv = p.value
    const w = width
    const h = height
    const sx = yx
    const sy = yy

    // — B: reached for in act1, then a lingering ghost upper-right —
    let bx = B.fromX * w
    let by = B.fromY * h
    let bop = 0
    if (pv >= A1 && pv < A2) {
      const a = seg(pv, A1, A2)
      const came = smooth(Math.min(1, a / 0.6))
      bx = lerp(B.fromX * w, B.x * w, came)
      by = lerp(B.fromY * h, B.y * h, came)
      const appear = 0.9 * smooth(Math.min(1, a / 0.5))
      bop = lerp(appear, GHOST_OP, smooth(Math.max(0, (a - 0.62) / 0.38)))
    } else if (pv >= A2) {
      bx = B.x * w
      by = B.y * h
      bop = GHOST_OP
    }

    // — C: ties close in act2, then drifts to a ghost lower-right —
    let cx = C.fromX * w
    let cy = C.fromY * h
    let cop = 0
    if (pv >= A2 && pv < A3) {
      const a = seg(pv, A2, A3)
      if (a < 0.5) {
        const came = smooth(Math.min(1, a / 0.42))
        cx = lerp(C.fromX * w, C.x * w, came)
        cy = lerp(C.fromY * h, C.y * h, came)
        cop = 0.9 * came
      } else {
        const gone = smooth(Math.max(0, (a - 0.5) / 0.5))
        cx = lerp(C.x * w, C.ghostX * w, gone)
        cy = lerp(C.y * h, C.ghostY * h, gone)
        cop = lerp(0.9, GHOST_OP, gone)
      }
    } else if (pv >= A3) {
      cx = C.ghostX * w
      cy = C.ghostY * h
      cop = GHOST_OP
    }

    // — D: enters in act3, settles close, stays lit —
    let dx = D.fromX * w
    let dy = D.fromY * h
    let dop = 0
    if (pv >= A3) {
      const a = seg(pv, A3, 1)
      const came = smooth(Math.min(1, a / 0.45))
      dx = lerp(D.fromX * w, D.x * w, came)
      dy = lerp(D.fromY * h, D.y * h, came)
      dop = came
    }

    // — the active thread — from you toward whoever this beat belongs to —
    let ex = sx
    let ey = sy
    let top = 0
    let sag = 0
    let quiver = 0
    let wide = false
    if (pv < A1) {
      // unspent tail — a short stroke drifting from "you", drawing on.
      const a = seg(pv, 0, A1)
      const len = 42 * smooth(a)
      ex = sx + len
      ey = sy + 4
      sag = 8 * Math.sin(a * 6)
      top = 0.45 * smooth(a)
    } else if (pv < A2) {
      // reach toward B — but never gets there (reach < 1), and recoils.
      const a = seg(pv, A1, A2)
      const reach = 0.82 * bell(a)
      ex = lerp(sx, bx, reach)
      ey = lerp(sy, by, reach)
      sag = 22 * bell(a)
      quiver = 5 * bell(a) * Math.sin(a * 30)
      top = 0.7 * smooth(Math.min(1, a / 0.18))
    } else if (pv < A3) {
      // tie to C, then loosen + fade as C drifts off.
      const a = seg(pv, A2, A3)
      const connect = smooth(Math.min(1, a / 0.42))
      const release = smooth(Math.max(0, (a - 0.55) / 0.45))
      ex = lerp(sx, cx, connect)
      ey = lerp(sy, cy, connect)
      sag = 16 * (1 - connect) + 12 * release
      quiver = 3 * (1 - connect) * Math.sin(a * 22)
      top = 0.7 * (1 - 0.85 * release)
    } else {
      // hold to D — a calm taut line that settles.
      const a = seg(pv, A3, 1)
      const reach = smooth(Math.min(1, a / 0.45))
      ex = lerp(sx, dx, reach)
      ey = lerp(sy, dy, reach)
      sag = 10 - 6 * smooth(Math.min(1, a / 0.6))
      top = 0.8 * reach
      wide = true
    }

    return {
      path: makeThread(sx, sy, ex, ey, sag, quiver),
      threadOp: top,
      threadW: wide ? 2.4 : 1.8,
      bx,
      by,
      bop,
      cx,
      cy,
      cop,
      dx,
      dy,
      dop,
    }
  })

  // Derive the Skia node inputs from the single frame value.
  const threadPath = useDerivedValue<SkPath>(() => frame.value.path)
  const threadOp = useDerivedValue(() => frame.value.threadOp)
  const threadW = useDerivedValue(() => frame.value.threadW)
  const bCx = useDerivedValue(() => frame.value.bx)
  const bCy = useDerivedValue(() => frame.value.by)
  const bOp = useDerivedValue(() => frame.value.bop)
  const cCx = useDerivedValue(() => frame.value.cx)
  const cCy = useDerivedValue(() => frame.value.cy)
  const cOp = useDerivedValue(() => frame.value.cop)
  const dCx = useDerivedValue(() => frame.value.dx)
  const dCy = useDerivedValue(() => frame.value.dy)
  const dOp = useDerivedValue(() => frame.value.dop)

  const youHaloR = useDerivedValue(() => 16 + breath.value * 5)
  const youHaloOp = useDerivedValue(() => 0.1 + breath.value * 0.08)

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
          <Circle cx={yx} cy={yy} r={DOT_R} color={INK} />
        </Group>
        {/* the three others — B & C linger as ghosts; D stays lit */}
        <Circle cx={bCx} cy={bCy} r={DOT_R} color={INK} opacity={bOp} />
        <Circle cx={cCx} cy={cCy} r={DOT_R} color={INK} opacity={cOp} />
        <Circle cx={dCx} cy={dCy} r={DOT_R} color={INK} opacity={dOp} />
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
