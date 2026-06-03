/**
 * StickFigure — the Kindred mascot, drawn as ink brush strokes.
 *
 * Used by the onboarding intro animation. Each limb is a filled, tapered
 * `<Path>` (a `brushStroke` lozenge — thin at the ends, a slight belly in the
 * middle) rather than a uniform SVG stroke, so it reads as a real ink stroke
 * with 笔锋. Small "nib" dots at the heavy joints fake the pooled ink where a
 * brush presses down.
 *
 * Proportions are deliberately chibi / Q — a big round head on a short, chunky
 * body — so the figures read as cute rather than clinical.
 *
 * Poses are discrete (`stand`/`walk`/`lookL`/`lookR`/`talk`/`hug`/`sit`/
 * `sitBack`). For `walk`, an optional `phase` (0..1, driven by `useGroundedGait`)
 * swings the legs and arms and lifts the forward foot. `sit` hugs the knees
 * (抱膝, side view); `sitBack` is the back view — facing away (toward the moon),
 * a rounded seated back with the legs hidden in front.
 *
 * `seed` applies a small deterministic per-figure jitter (head tilt, arm reach,
 * leg stance) so two figures sharing a pose never look identical or perfectly
 * mirrored — pairs get a touch of individual difference.
 *
 * Coordinates live in a 40-wide, 80-tall box centered at x=20; feet at y≈70.
 * Default stroke is light (the app is dark-only); callers tint via `stroke`.
 */

import { ricePaper } from '@zhop/hexastral-tokens'
import { useState } from 'react'
import {
  type DerivedValue,
  runOnJS,
  type SharedValue,
  useAnimatedReaction,
  useDerivedValue,
} from 'react-native-reanimated'
import { Circle, Ellipse, Path, Svg } from 'react-native-svg'

export type Pose = 'stand' | 'walk' | 'lookL' | 'lookR' | 'talk' | 'hug' | 'sit' | 'sitBack'

/** Default rendered figure size (box width in px; the box is size × size*2). */
export const FIGURE_SIZE = 64

/** Feet baseline measured from the top of the rendered figure box (y≈70 of the 80-unit viewBox). */
export const FEET_Y = (70 / 80) * FIGURE_SIZE * 2

/** Seated-base baseline for `sitBack` (the rounded base rests at y≈67, above the standing feet). */
export const SIT_BACK_Y = (67 / 80) * FIGURE_SIZE * 2

export interface StickFigureProps {
  pose: Pose
  size?: number
  facing?: 'L' | 'R'
  /** Stroke + fill colour. Defaults to ivory (dark-mode). Tab bar passes gold/muted. */
  stroke?: string
  /** Gait phase 0..1 — only used by the `walk` pose (see useGroundedGait). */
  phase?: number
  /** Per-figure variation seed — perturbs angles/reach so a pair isn't identical/mirrored. */
  seed?: number
}

/**
 * Filled tapered brush stroke between two points. Width goes w1 → (belly) → w2.
 * Returns an SVG path `d`. Pure math — safe to call every render.
 */
function brushStroke(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  w1: number,
  w2: number
): string {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  // Unit perpendicular.
  const px = -dy / len
  const py = dx / len
  const h1 = w1 / 2
  const h2 = w2 / 2
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const hb = ((h1 + h2) / 2) * 1.28 // belly a touch fatter than the ends
  // Left side start/end, right side start/end, belly controls.
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
  return `M${r(aLx)} ${r(aLy)} Q${r(mLx)} ${r(mLy)} ${r(bLx)} ${r(bLy)} L${r(bRx)} ${r(bRy)} Q${r(mRx)} ${r(mRy)} ${r(aRx)} ${r(aRy)} Z`
}

/** Round to 2dp to keep path strings short + stable. */
function r(n: number): number {
  return Math.round(n * 100) / 100
}

/** Deterministic per-figure jitter in [-0.5, 0.5], stable for a (seed, n) pair. */
function jig(seed: number, n: number): number {
  const x = Math.sin(seed * 49.17 + n * 12.9898) * 43758.5453
  return x - Math.floor(x) - 0.5
}

interface Stroke {
  d: string
  /** Nib dot at the heavy end, if any: [x, y, radius]. */
  nib?: [number, number, number]
}

function buildStrokes(pose: Pose, facing: 'L' | 'R', phase: number, seed: number): Stroke[] {
  const dir = facing === 'R' ? 1 : -1
  const out: Stroke[] = []

  if (pose === 'sitBack') {
    // Back view, seated, facing away (up toward the moon). A rounded seated
    // mass — narrow at the shoulders, wide at the base — with the legs hidden
    // in front. `seed` skews the base + a faint arm so a pair differs.
    const shoulderY = 40
    const baseY = 66
    const bw = 9 + jig(seed, 1) * 1.4 // shoulder width
    const baseW = 14 + jig(seed, 2) * 2 // seated base width
    out.push({ d: brushStroke(20, shoulderY, 20, baseY, bw, baseW), nib: [20, baseY, baseW / 2] })
    // A faint arm resting at one side (side varies with seed) — breaks symmetry.
    const armDir = jig(seed, 3) > 0 ? 1 : -1
    out.push({
      d: brushStroke(20 + armDir * 3, shoulderY + 3, 20 + armDir * 7, baseY - 6, 2.4, 1.6),
    })
    return out
  }

  if (pose === 'sit') {
    // Knees-hugged sit (抱膝), side view facing `dir`.
    const hipY = 58
    const neckY = 40
    const kneeX = 20 + dir * 8
    const kneeY = 52
    const footX = 20 + dir * 10
    const footY = 68
    out.push({ d: brushStroke(20 - dir * 2, neckY, 20, hipY, 3.6, 4.0), nib: [20, hipY, 2.0] })
    out.push({ d: brushStroke(20, hipY, kneeX, kneeY, 3.2, 2.2) })
    out.push({ d: brushStroke(kneeX, kneeY, footX, footY, 2.2, 1.6) })
    out.push({ d: brushStroke(20 - dir * 1, neckY + 6, kneeX + dir * 1, kneeY + 2, 2.4, 1.4) })
    return out
  }

  // ── Standing family (stand / walk / look* / talk / hug) — chibi proportions ──
  const neckY = 25
  const hipY = 48
  const feetY = 70
  const armY = neckY + 4
  // Torso — short + chunky.
  out.push({ d: brushStroke(20, neckY, 20, hipY, 4.6, 4.0), nib: [20, hipY, 2.2] })

  // Arms — stubby, with a little seeded asymmetry so a pair differs.
  const aJL = jig(seed, 4) * 2
  const aJR = jig(seed, 5) * 2
  if (pose === 'hug') {
    out.push({ d: brushStroke(20, armY + 2, 20 + dir * 12, neckY + 1 + aJL, 3.0, 1.6) })
    out.push({ d: brushStroke(20, armY + 2, 20 + dir * 12, neckY + 9 + aJR, 3.0, 1.6) })
  } else if (pose === 'walk') {
    const sw = Math.sin(phase * Math.PI * 2)
    out.push({ d: brushStroke(20, armY, 13 - sw * 5, hipY - 3, 2.9, 1.5) })
    out.push({ d: brushStroke(20, armY, 27 + sw * 5, hipY - 3, 2.9, 1.5) })
  } else if (pose === 'talk') {
    // One arm gestures up (the seeded side) — livelier than two symmetric arms.
    const up = jig(seed, 6) > 0 ? 1 : -1
    out.push({ d: brushStroke(20, armY, 20 + up * 11, neckY - 1 + aJL, 2.9, 1.5) })
    out.push({ d: brushStroke(20, armY, 20 - up * 9, hipY - 4 + aJR, 2.9, 1.5) })
  } else {
    out.push({ d: brushStroke(20, armY, 12 + aJL, hipY - 3, 2.9, 1.5) })
    out.push({ d: brushStroke(20, armY, 28 + aJR, hipY - 3, 2.9, 1.5) })
  }

  // Legs — short + chunky.
  if (pose === 'walk') {
    const sw = Math.sin(phase * Math.PI * 2)
    const stride = 6.5
    const lift = 4
    const ax = 20 + sw * stride
    const ay = feetY - Math.max(0, sw) * lift
    const bx = 20 - sw * stride
    const by = feetY - Math.max(0, -sw) * lift
    out.push({ d: brushStroke(20, hipY, ax, ay, 3.4, 1.8) })
    out.push({ d: brushStroke(20, hipY, bx, by, 3.4, 1.8) })
  } else {
    const spread = 4.5
    const lJ = jig(seed, 7) * 1.6
    const rJ = jig(seed, 8) * 1.6
    out.push({ d: brushStroke(20, hipY, 20 - spread + lJ, feetY, 3.4, 1.8) })
    out.push({ d: brushStroke(20, hipY, 20 + spread + rJ, feetY, 3.4, 1.8) })
  }

  return out
}

export function StickFigure({
  pose,
  size = 64,
  facing = 'R',
  stroke = ricePaper.ivory,
  phase = 0,
  seed = 0,
}: StickFigureProps) {
  const sitLean = pose === 'sit' ? (facing === 'R' ? -2 : 2) : 0
  // Head tilt: explicit for look poses, a seated lean for sit, plus a touch of
  // seeded tilt everywhere so a pair never holds its head identically.
  const baseDx = pose === 'lookL' ? -2 : pose === 'lookR' ? 2 : sitLean
  const headDx = baseDx + jig(seed, 9) * 1.6
  const headCy = (pose === 'sit' ? 32 : pose === 'sitBack' ? 30 : 15) + jig(seed, 10) * 1
  // Big, nearly-round chibi head.
  const headRx = 9.5
  const headRy = 9.0
  const strokes = buildStrokes(pose, facing, phase, seed)

  return (
    <Svg width={size} height={size * 2} viewBox='0 0 40 80'>
      {/* Head — big + round (chibi). */}
      <Ellipse cx={20 + headDx} cy={headCy} rx={headRx} ry={headRy} fill={stroke} />
      {strokes.map((s, i) => (
        <Path key={i} d={s.d} fill={stroke} />
      ))}
      {strokes.map((s, i) =>
        s.nib ? (
          <Circle key={`n${i}`} cx={s.nib[0]} cy={s.nib[1]} r={s.nib[2]} fill={stroke} />
        ) : null
      )}
    </Svg>
  )
}

/**
 * useGroundedGait — distance-driven gait phase.
 *
 * Converts a figure's horizontal shared-value position into a 0..1 gait
 * phase: one full cycle per `stridePx` of travel. Because the phase is a
 * function of distance (not time), the legs are kinematically tied to the
 * ground — when the figure decelerates the stride slows with it, and when it
 * stops the feet stop. No foot-sliding.
 *
 * Returns the phase twice:
 *   - `phase` (React state) — drives the JS-thread SVG limb geometry
 *   - `phaseSv` (derived value) — for UI-thread effects (body bob) in the
 *     caller's animated styles
 *
 * The JS-thread state only updates while the figure is actually moving
 * (reactions fire on value change), so idle figures cost nothing.
 */
export function useGroundedGait(
  xSv: SharedValue<number>,
  stridePx = FIGURE_SIZE
): { phase: number; phaseSv: DerivedValue<number> } {
  const [phase, setPhase] = useState(0)

  const phaseSv = useDerivedValue(() => {
    // Proper positive modulo — x can be negative (figures start off-screen left).
    const m = ((xSv.value % stridePx) + stridePx) % stridePx
    return m / stridePx
  })

  useAnimatedReaction(
    () => phaseSv.value,
    (p) => runOnJS(setPhase)(p)
  )

  return { phase, phaseSv }
}
