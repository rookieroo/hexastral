/**
 * StickFigure — the Kindred mascot, drawn as ink brush strokes.
 *
 * Used by the onboarding intro animation. Each limb is a
 * filled, tapered `<Path>` (a `brushStroke` lozenge — thin at the ends, a
 * slight belly in the middle) rather than a uniform SVG stroke, so it reads
 * as a real ink stroke with 笔锋. Small "nib" dots at the heavy joints fake
 * the pooled ink where a brush presses down.
 *
 * Poses are discrete (`stand`/`walk`/`lookL`/`lookR`/`talk`/`hug`/`sit`). For
 * `walk`, an optional `phase` (0..1, driven by `useGroundedGait`) swings the
 * legs and arms and lifts the forward foot — a continuous gait tied to the
 * distance actually travelled, so feet plant instead of sliding. Everything
 * else is static geometry. `sit` is cross-legged (盘腿), not feet-on-a-ledge.
 *
 * Coordinates live in a 40-wide, 80-tall box centered at x=20; feet at y≈76.
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

export type Pose = 'stand' | 'walk' | 'lookL' | 'lookR' | 'talk' | 'hug' | 'sit'

/** Default rendered figure size (box width in px; the box is size × size*2). */
export const FIGURE_SIZE = 64

/** Feet baseline measured from the top of the rendered figure box (y≈76 of the 80-unit viewBox). */
export const FEET_Y = (76 / 80) * FIGURE_SIZE * 2

export interface StickFigureProps {
  pose: Pose
  size?: number
  facing?: 'L' | 'R'
  /** Stroke + fill colour. Defaults to ivory (dark-mode). Tab bar passes gold/muted. */
  stroke?: string
  /** Gait phase 0..1 — only used by the `walk` pose (see useGroundedGait). */
  phase?: number
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

interface Stroke {
  d: string
  /** Nib dot at the heavy end, if any: [x, y, radius]. */
  nib?: [number, number, number]
}

function buildStrokes(pose: Pose, facing: 'L' | 'R', phase: number): Stroke[] {
  const dir = facing === 'R' ? 1 : -1
  const out: Stroke[] = []

  if (pose === 'sit') {
    const hipY = 58
    const neckY = 38
    // Torso.
    out.push({ d: brushStroke(20, neckY, 20, hipY, 3.2, 3.6), nib: [20, neckY, 1.7] })
    // Cross-legged (盘腿): two thighs out to the knees, two shins crossing in front.
    out.push({ d: brushStroke(20, hipY, 20 - 9, 67, 2.8, 1.8) })
    out.push({ d: brushStroke(20, hipY, 20 + 9, 67, 2.8, 1.8) })
    out.push({ d: brushStroke(20 - 9, 67, 20 + 7, 72, 1.9, 1.3) })
    out.push({ d: brushStroke(20 + 9, 67, 20 - 7, 72, 1.9, 1.3) })
    // Arms rest on knees.
    out.push({ d: brushStroke(20, neckY + 5, 20 - 9, 66, 2.2, 1.3) })
    out.push({ d: brushStroke(20, neckY + 5, 20 + 9, 66, 2.2, 1.3) })
    return out
  }

  const neckY = 26
  const hipY = 56
  // Torso.
  out.push({ d: brushStroke(20, neckY, 20, hipY, 3.4, 3.0), nib: [20, hipY, 1.8] })

  // Arms.
  if (pose === 'hug') {
    out.push({ d: brushStroke(20, neckY + 6, 20 + dir * 12, neckY + 2, 2.4, 1.3) })
    out.push({ d: brushStroke(20, neckY + 6, 20 + dir * 12, neckY + 10, 2.4, 1.3) })
  } else if (pose === 'walk') {
    const sw = Math.sin(phase * Math.PI * 2)
    // Arms counter-swing the legs.
    out.push({ d: brushStroke(20, neckY + 4, 14 - sw * 5, hipY - 4, 2.3, 1.2) })
    out.push({ d: brushStroke(20, neckY + 4, 26 + sw * 5, hipY - 4, 2.3, 1.2) })
  } else {
    out.push({ d: brushStroke(20, neckY + 4, 13, hipY - 4, 2.3, 1.2) })
    out.push({ d: brushStroke(20, neckY + 4, 27, hipY - 4, 2.3, 1.2) })
  }

  // Legs.
  if (pose === 'walk') {
    const sw = Math.sin(phase * Math.PI * 2)
    const stride = 7
    const lift = 4
    // Leg A leads with +sw, leg B with -sw; the forward-swinging foot lifts.
    const ax = 20 + sw * stride
    const ay = 76 - Math.max(0, sw) * lift
    const bx = 20 - sw * stride
    const by = 76 - Math.max(0, -sw) * lift
    out.push({ d: brushStroke(20, hipY, ax, ay, 2.7, 1.4) })
    out.push({ d: brushStroke(20, hipY, bx, by, 2.7, 1.4) })
  } else {
    const spread = 5
    out.push({ d: brushStroke(20, hipY, 20 - spread, 76, 2.7, 1.4) })
    out.push({ d: brushStroke(20, hipY, 20 + spread, 76, 2.7, 1.4) })
  }

  return out
}

export function StickFigure({
  pose,
  size = 64,
  facing = 'R',
  stroke = ricePaper.ivory,
  phase = 0,
}: StickFigureProps) {
  const headDx = pose === 'lookL' ? -1.5 : pose === 'lookR' ? 1.5 : 0
  const headCy = pose === 'sit' ? 30 : 18
  // Slightly squashed, off-round head — less "regular".
  const headRx = 5.6
  const headRy = 5.1
  const strokes = buildStrokes(pose, facing, phase)

  return (
    <Svg width={size} height={size * 2} viewBox='0 0 40 80'>
      {/* Head — filled, faintly oval (less "regular" than a perfect circle). */}
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
