/**
 * Polaroid poses: spread 0 = stacked deck, 1 = fanned (face on top).
 * Shared by the home wheel and capture studio.
 */

import type { CapturePart } from '@/lib/reading-draft'

export type SlotPose = { left: number; top: number; rotateDeg: number; z: number }

function clamp(n: number, a: number, b: number): number {
  'worklet'
  return Math.max(a, Math.min(b, n))
}

function lerp(a: number, b: number, t: number): number {
  'worklet'
  return a + (b - a) * t
}

function smoothstep(t: number): number {
  'worklet'
  const x = clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}

/** Matches docs/apps/xingqi/home-ui-mock.html (FAN_W / CARD_W). */
export const POLAROID_FAN_W = 300
export const POLAROID_CARD_W = 108
export const POLAROID_CARD_H = 136
export const POLAROID_STACK_H = 188

export function polaroidPoses(
  spread: number,
  boxW: number,
  cardW: number
): Record<CapturePart, SlotPose> {
  'worklet'
  const e = smoothstep(spread)
  const cx = (boxW - cardW) / 2
  return {
    palm_l: {
      left: lerp(cx - 7, 8, e),
      top: lerp(18, 32, e),
      rotateDeg: lerp(-2.5, -9, e),
      z: 1,
    },
    palm_r: {
      left: lerp(cx + 7, Math.max(8, boxW - cardW - 8), e),
      top: lerp(22, 38, e),
      rotateDeg: lerp(2.5, 9, e),
      z: 1,
    },
    face: {
      left: cx,
      top: lerp(8, 0, e),
      rotateDeg: lerp(-0.4, -1.4, e),
      z: 3,
    },
  }
}

export const WHEEL_ROW_GAP = 228

/** iOS-wheel: 1 at center, 0 one slot away. */
export function wheelSpread(distance: number): number {
  'worklet'
  return clamp(1 - Math.abs(distance), 0, 1)
}

export function wheelRowScale(distance: number): number {
  'worklet'
  const fall = Math.min(2.2, Math.abs(distance))
  return 1 - 0.22 * fall
}

export function wheelRowOpacity(distance: number): number {
  'worklet'
  const fall = Math.min(2.2, Math.abs(distance))
  return Math.max(0.18, 1 - 0.38 * fall)
}
