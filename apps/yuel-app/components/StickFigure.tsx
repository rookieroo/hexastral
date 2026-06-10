/**
 * StickFigure — the Kindred (Yuel) mascot, drawn as ink brush strokes.
 *
 * Used only by the onboarding intro parable. This is an ARTICULATED rig: rather
 * than swapping a discrete pose's SVG in one frame (which read as stiff/robotic),
 * the figure is a small skeleton of joint angles held in shared values. A `pose`
 * change retargets those angles and they TWEEN to the new pose (spring presets
 * from `@zhop/hexastral-tokens/motion`), so stand → talk → reach → hug flow
 * smoothly instead of snapping.
 *
 * Anatomy (all in a 40-wide × 80-tall viewBox, centred on x=20):
 *   - Torso: one tapered `brushStroke` neck→hip, with a nib at the hip.
 *   - Arms / legs: TWO segments each (upper+fore / thigh+shin) with a real
 *     elbow / knee, solved by forward kinematics in a worklet — bent joints are
 *     what make the walk and the reach read as natural rather than as a compass.
 *   - Head: a big round chibi ellipse (the heaviest ink).
 * Each limb's `d` is recomputed every frame on the UI thread (useAnimatedProps),
 * so the joints can be driven continuously — by a tween (pose change), by the
 * distance-driven gait (`gaitPhaseSv` while walking), or by a gesture wobble.
 *
 * Joint angles are authored facing RIGHT (+x points the way the figure faces);
 * `facing='L'` mirrors every x-component via `dir`, so one authored frame serves
 * both directions. Poses: stand / walk / lookL / lookR / talk / reach / hug, plus
 * `sitBack` — the backs-to-viewer seated mass (gazing at the moon), which is a
 * separate silhouette the rig CROSS-FADES to (the skeleton can't kinematically
 * fold into a blob), with a small settle.
 *
 * `seed` applies a deterministic per-figure jitter so a pair never holds a pose
 * identically or as a pure mirror. Default ink is ivory (the app is dark-only).
 */

import { ricePaper } from '@zhop/hexastral-tokens'
import { spring } from '@zhop/hexastral-tokens/motion'
import { useEffect, useMemo } from 'react'
import Animated, {
  type DerivedValue,
  Easing,
  type SharedValue,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { Circle, Ellipse, G, Path, Svg } from 'react-native-svg'

const AnimatedPath = Animated.createAnimatedComponent(Path)
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse)
const AnimatedG = Animated.createAnimatedComponent(G)

export type Pose =
  | 'stand'
  | 'walk'
  | 'lookL'
  | 'lookR'
  | 'talk'
  | 'reach'
  | 'hug'
  | 'sit'
  | 'sitBack'

/** Default rendered figure size (box width in px; the box is size × size*2). */
export const FIGURE_SIZE = 64

/** Feet baseline measured from the top of the rendered figure box (y≈70 of the 80-unit viewBox). */
export const FEET_Y = (70 / 80) * FIGURE_SIZE * 2

/** Seated-base baseline for `sitBack` (the rounded base rests at y≈67, above the standing feet). */
export const SIT_BACK_Y = (67 / 80) * FIGURE_SIZE * 2

/* ── Skeleton constants (viewBox units) ─────────────────────────────────── */
const SHOULDER_Y = 29
const HIP_Y = 48
const NECK_Y = 25
const HEAD_CY = 15
const ARM_UP = 9.5 // upper arm length
const ARM_LO = 8.5 // forearm length
const LEG_UP = 11 // thigh length
const LEG_LO = 11 // shin length (hip 48 + 22 → foot at feetY 70 when straight)

export interface StickFigureProps {
  pose: Pose
  size?: number
  facing?: 'L' | 'R'
  /** Stroke + fill colour. Defaults to ivory (dark-mode). */
  stroke?: string
  /** Distance-driven gait phase 0..1 (see useGroundedGait) — swings the limbs while walking. */
  gaitPhaseSv?: DerivedValue<number> | SharedValue<number>
  /** Shared 0..1 looping clock for idle gesture wobble (so talk arms aren't frozen). */
  breath?: SharedValue<number>
  /** Per-figure phase offset (0..1) so figures don't gesture in unison. */
  breathPhase?: number
  /** Per-figure variation seed — perturbs angles/reach so a pair isn't identical/mirrored. */
  seed?: number
}

/**
 * Filled tapered brush stroke between two points. Width goes w1 → (belly) → w2.
 * Pure math, marked worklet so it can run on the UI thread inside useAnimatedProps.
 */
function brushStroke(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  w1: number,
  w2: number
): string {
  'worklet'
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const px = -dy / len
  const py = dx / len
  const h1 = w1 / 2
  const h2 = w2 / 2
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const hb = ((h1 + h2) / 2) * 1.28 // belly a touch fatter than the ends
  const aLx = x1 + px * h1
  const aLy = y1 + py * h1
  const bLx = x2 + px * h2
  const bLy = y2 + py * h2
  const bRx = x2 - px * h2
  const bRy = y2 - py * h2
  const aRx = x1 - px * h1
  const aRy = y1 - py * h1
  const mLx = mx + px * hb
  const mLy = my + py * hb
  const mRx = mx - px * hb
  const mRy = my - py * hb
  // Round inline — nested worklet helpers are not in closure when brushStroke
  // runs on the UI thread from useAnimatedProps (Reanimated v4).
  const rnd = (n: number) => Math.round(n * 100) / 100
  return `M${rnd(aLx)} ${rnd(aLy)} Q${rnd(mLx)} ${rnd(mLy)} ${rnd(bLx)} ${rnd(bLy)} L${rnd(bRx)} ${rnd(bRy)} Q${rnd(mRx)} ${rnd(mRy)} ${rnd(aRx)} ${rnd(aRy)} Z`
}

/**
 * Two-segment limb (upper + fore) solved from a shoulder/hip origin by forward
 * kinematics. `a1` is the upper-segment angle from straight-down (+x scaled by
 * `dir`); `a2` is the ABSOLUTE fore-segment angle (caller adds the joint bend).
 * Returns both tapered strokes concatenated into one path `d`.
 */
function limb(
  ox: number,
  oy: number,
  a1: number,
  len1: number,
  a2: number,
  len2: number,
  w0: number,
  w1: number,
  w2: number,
  dir: number
): string {
  'worklet'
  const ex = ox + dir * len1 * Math.sin(a1)
  const ey = oy + len1 * Math.cos(a1)
  const hx = ex + dir * len2 * Math.sin(a2)
  const hy = ey + len2 * Math.cos(a2)
  return `${brushStroke(ox, oy, ex, ey, w0, w1)} ${brushStroke(ex, ey, hx, hy, w1, w2)}`
}

/** Deterministic per-figure jitter in [-0.5, 0.5], stable for a (seed, n) pair. */
function jig(seed: number, n: number): number {
  const x = Math.sin(seed * 49.17 + n * 12.9898) * 43758.5453
  return x - Math.floor(x) - 0.5
}

/* ── Pose target table ──────────────────────────────────────────────────────
 * Joint angles in radians, authored facing RIGHT (+x = facing). 0 = straight
 * down. Arm/leg "1" tends left at rest, "2" tends right; reach/hug send both
 * toward the partner (+, the facing side). `el`/`kn` are joint BENDS added to
 * the upper-segment angle to get the fore-segment angle. `lean` = torso-top dx
 * toward facing. Tunable on device — the choreography only depends on the names. */
interface PoseTarget {
  lean: number
  headDx: number
  headDy: number
  a1: number
  e1: number // arm 1 shoulder, elbow bend
  a2: number
  e2: number // arm 2
  h1: number
  k1: number // leg 1 hip, knee bend
  h2: number
  k2: number // leg 2
}

const POSE: Record<Exclude<Pose, 'sit' | 'sitBack'>, PoseTarget> = {
  // Arms splayed slightly out + forward, soft elbows; a relaxed stance.
  stand: {
    lean: 0,
    headDx: 0,
    headDy: 0,
    a1: -0.24,
    e1: 0.16,
    a2: 0.24,
    e2: 0.16,
    h1: -0.13,
    k1: 0.05,
    h2: 0.13,
    k2: 0.05,
  },
  // Walk targets are centred; the gait overlay (gaitPhaseSv) supplies the swing.
  walk: {
    lean: 0.8,
    headDx: 0,
    headDy: 0,
    a1: -0.08,
    e1: 0.22,
    a2: 0.08,
    e2: 0.22,
    h1: 0,
    k1: 0.12,
    h2: 0,
    k2: 0.12,
  },
  lookL: {
    lean: 0,
    headDx: 1.6,
    headDy: -0.4,
    a1: -0.2,
    e1: 0.16,
    a2: 0.2,
    e2: 0.16,
    h1: -0.13,
    k1: 0.05,
    h2: 0.13,
    k2: 0.05,
  },
  lookR: {
    lean: 0,
    headDx: 1.6,
    headDy: -0.4,
    a1: -0.2,
    e1: 0.16,
    a2: 0.2,
    e2: 0.16,
    h1: -0.13,
    k1: 0.05,
    h2: 0.13,
    k2: 0.05,
  },
  // One arm raised + bent (a gesture); the other relaxed. A wobble is added live.
  talk: {
    lean: 0.6,
    headDx: 0.4,
    headDy: 0,
    a1: -0.18,
    e1: 0.18,
    a2: 0.62,
    e2: 0.95,
    h1: -0.12,
    k1: 0.05,
    h2: 0.12,
    k2: 0.05,
  },
  // Both arms extended toward the partner, nearly straight — a reach that hangs.
  reach: {
    lean: 3.6,
    headDx: 0.8,
    headDy: 0,
    a1: 1.14,
    e1: 0.14,
    a2: 1.36,
    e2: 0.1,
    h1: 0.2,
    k1: 0.08,
    h2: -0.06,
    k2: 0.04,
  },
  // Both arms forward and bent to wrap; lean into the embrace, feet together.
  hug: {
    lean: 4.6,
    headDx: 0.6,
    headDy: 0.4,
    a1: 1.16,
    e1: 0.96,
    a2: 1.0,
    e2: 1.12,
    h1: 0.05,
    k1: 0.06,
    h2: -0.05,
    k2: 0.06,
  },
}

function targetFor(pose: Pose, seed: number): PoseTarget {
  // sit/sitBack fade to the seated mass; keep the skeleton in a gentle stand
  // underneath so the cross-fade has something coherent to fade FROM.
  const base = pose === 'sit' || pose === 'sitBack' ? POSE.stand : POSE[pose]
  // A little seeded asymmetry on the arms/legs so a pair never matches exactly.
  return {
    ...base,
    a1: base.a1 + jig(seed, 1) * 0.12,
    a2: base.a2 + jig(seed, 2) * 0.12,
    h1: base.h1 + jig(seed, 3) * 0.08,
    h2: base.h2 + jig(seed, 4) * 0.08,
    headDx: base.headDx + jig(seed, 5) * 0.8,
  }
}

const SPRING_FOR: Record<Pose, { damping: number; stiffness: number; mass: number }> = {
  stand: spring.spring,
  walk: spring.spring,
  lookL: spring.snap,
  lookR: spring.snap,
  talk: spring.spring,
  reach: spring.flow,
  hug: spring.flow,
  sit: spring.flow,
  sitBack: spring.flow,
}

/* ── The rig — joint shared values that tween on pose change ─────────────── */

function usePoseRig(pose: Pose, seed: number) {
  const t0 = useMemo(() => targetFor('stand', seed), [seed])
  const lean = useSharedValue(t0.lean)
  const headDx = useSharedValue(t0.headDx)
  const headDy = useSharedValue(t0.headDy)
  const a1 = useSharedValue(t0.a1)
  const e1 = useSharedValue(t0.e1)
  const a2 = useSharedValue(t0.a2)
  const e2 = useSharedValue(t0.e2)
  const h1 = useSharedValue(t0.h1)
  const k1 = useSharedValue(t0.k1)
  const h2 = useSharedValue(t0.h2)
  const k2 = useSharedValue(t0.k2)
  // walk = strength of the gait overlay; gesture = talk-arm wobble; seat = sit
  // cross-fade (0 standing → 1 seated mass).
  const walk = useSharedValue(0)
  const gesture = useSharedValue(0)
  const seat = useSharedValue(0)

  useEffect(() => {
    const t = targetFor(pose, seed)
    const cfg = SPRING_FOR[pose]
    lean.value = withSpring(t.lean, cfg)
    headDx.value = withSpring(t.headDx, cfg)
    headDy.value = withSpring(t.headDy, cfg)
    a1.value = withSpring(t.a1, cfg)
    e1.value = withSpring(t.e1, cfg)
    a2.value = withSpring(t.a2, cfg)
    e2.value = withSpring(t.e2, cfg)
    h1.value = withSpring(t.h1, cfg)
    k1.value = withSpring(t.k1, cfg)
    h2.value = withSpring(t.h2, cfg)
    k2.value = withSpring(t.k2, cfg)
    walk.value = withTiming(pose === 'walk' ? 1 : 0, {
      duration: 360,
      easing: Easing.inOut(Easing.quad),
    })
    gesture.value = withTiming(pose === 'talk' ? 1 : 0, { duration: 320 })
    seat.value = withTiming(pose === 'sit' || pose === 'sitBack' ? 1 : 0, {
      duration: 460,
      easing: Easing.inOut(Easing.quad),
    })
  }, [pose, seed])

  return { lean, headDx, headDy, a1, e1, a2, e2, h1, k1, h2, k2, walk, gesture, seat }
}

/* ── Component ──────────────────────────────────────────────────────────── */

export function StickFigure({
  pose,
  size = FIGURE_SIZE,
  facing = 'R',
  stroke = ricePaper.ivory,
  gaitPhaseSv,
  breath,
  breathPhase = 0,
  seed = 0,
}: StickFigureProps) {
  const dir = facing === 'R' ? 1 : -1
  const rig = usePoseRig(pose, seed)
  const { lean, headDx, headDy, a1, e1, a2, e2, h1, k1, h2, k2, walk, gesture, seat } = rig

  // Live read-outs (default to constants when the optional drivers are absent).
  const gaitZero = useSharedValue(0)
  const breathZero = useSharedValue(0)
  const gait = gaitPhaseSv ?? gaitZero
  const br = breath ?? breathZero

  // Standing skeleton fades out / seated mass fades in via `seat`.
  const standG = useAnimatedProps(() => ({ opacity: 1 - seat.value }))
  const seatG = useAnimatedProps(() => ({ opacity: seat.value }))

  // ── Limb paths (forward kinematics on the UI thread) ──
  const armA = useAnimatedProps(() => {
    const sw = Math.sin(gait.value * Math.PI * 2)
    const ang = a1.value + walk.value * -0.42 * sw
    const el = e1.value + walk.value * 0.18
    return { d: limb(20, SHOULDER_Y, ang, ARM_UP, ang + el, ARM_LO, 2.9, 2.35, 1.5, dir) }
  })
  const armB = useAnimatedProps(() => {
    const sw = Math.sin(gait.value * Math.PI * 2)
    // Gesture wobble lifts/drops the raised forearm during talk.
    const wob = gesture.value * Math.sin((br.value + breathPhase) * Math.PI * 2 * 2) * 0.2
    const ang = a2.value + walk.value * 0.42 * sw
    const el = e2.value + walk.value * 0.18 + wob
    return { d: limb(20, SHOULDER_Y, ang, ARM_UP, ang + el, ARM_LO, 2.9, 2.35, 1.5, dir) }
  })
  const legA = useAnimatedProps(() => {
    const sw = Math.sin(gait.value * Math.PI * 2)
    const ang = h1.value + walk.value * 0.5 * sw
    // The forward-swinging leg flexes its knee + the foot lifts.
    const kn = k1.value + walk.value * Math.max(0, sw) * 0.7
    return { d: limb(20, HIP_Y, ang, LEG_UP, ang + kn, LEG_LO, 3.4, 2.6, 1.7, dir) }
  })
  const legB = useAnimatedProps(() => {
    const sw = Math.sin(gait.value * Math.PI * 2)
    const ang = h2.value - walk.value * 0.5 * sw
    const kn = k2.value + walk.value * Math.max(0, -sw) * 0.7
    return { d: limb(20, HIP_Y, ang, LEG_UP, ang + kn, LEG_LO, 3.4, 2.6, 1.7, dir) }
  })
  const torso = useAnimatedProps(() => ({
    d: brushStroke(20 + dir * lean.value, NECK_Y, 20, HIP_Y, 4.6, 4.0),
  }))
  const head = useAnimatedProps(() => ({
    cx: 20 + dir * headDx.value,
    cy: HEAD_CY + headDy.value,
  }))

  // ── Seated mass (sitBack) — a separate silhouette, built once from `seed`.
  // Narrow shoulders → wide rounded base, legs hidden in front; a faint resting
  // arm breaks symmetry. Crossfades in; does not need to articulate.
  const seated = useMemo(() => {
    const shoulderY = 40
    const baseY = 66
    const bw = 9 + jig(seed, 6) * 1.4
    const baseW = 14 + jig(seed, 7) * 2
    const armDir = jig(seed, 8) > 0 ? 1 : -1
    return {
      body: brushStroke(20, shoulderY, 20, baseY, bw, baseW),
      arm: brushStroke(20 + armDir * 3, shoulderY + 3, 20 + armDir * 7, baseY - 6, 2.4, 1.6),
      baseNib: [20, baseY, baseW / 2] as [number, number, number],
      headCy: 30 + jig(seed, 9) * 1,
    }
  }, [seed])

  return (
    <Svg width={size} height={size * 2} viewBox='0 0 40 80'>
      {/* Standing skeleton — fades out as the figure sits. Draw order back→front:
          far leg, near leg, torso (+ hip nib), far arm, head, near arm (over). */}
      <AnimatedG animatedProps={standG}>
        <AnimatedPath animatedProps={legB} fill={stroke} fillOpacity={0.82} />
        <AnimatedPath animatedProps={legA} fill={stroke} fillOpacity={0.82} />
        <AnimatedPath animatedProps={torso} fill={stroke} fillOpacity={1} />
        <Circle cx={20} cy={HIP_Y} r={2.2} fill={stroke} />
        <AnimatedPath animatedProps={armA} fill={stroke} fillOpacity={0.82} />
        <AnimatedEllipse rx={9.5} ry={9.0} fill={stroke} animatedProps={head} />
        <AnimatedPath animatedProps={armB} fill={stroke} fillOpacity={0.82} />
      </AnimatedG>

      {/* Seated mass (backs to the viewer) — crossfades in for sit / sitBack. */}
      <AnimatedG animatedProps={seatG}>
        <Path d={seated.body} fill={stroke} fillOpacity={1} />
        <Circle cx={seated.baseNib[0]} cy={seated.baseNib[1]} r={seated.baseNib[2]} fill={stroke} />
        <Path d={seated.arm} fill={stroke} fillOpacity={0.82} />
        <Ellipse cx={20} cy={seated.headCy} rx={9.5} ry={9.0} fill={stroke} />
      </AnimatedG>
    </Svg>
  )
}

/**
 * useGroundedGait — distance-driven gait phase.
 *
 * Converts a figure's horizontal shared-value position into a 0..1 gait phase:
 * one full cycle per `stridePx` of travel. Because the phase is a function of
 * distance (not time), the limbs are kinematically tied to the ground — when the
 * figure decelerates the stride slows with it, and when it stops the feet stop.
 * No foot-sliding. The returned derived value feeds StickFigure's `gaitPhaseSv`
 * (limb swing) and the caller's body-bob style — all on the UI thread.
 */
export function useGroundedGait(
  xSv: SharedValue<number>,
  stridePx = FIGURE_SIZE
): DerivedValue<number> {
  return useDerivedValue(() => {
    // Proper positive modulo — x can be negative (figures start off-screen left).
    const m = ((xSv.value % stridePx) + stridePx) % stridePx
    return m / stridePx
  })
}
