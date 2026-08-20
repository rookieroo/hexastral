/**
 * Polaroid poses: spread 0 = tight deck, 1 = three-up fan.
 * ritual 0–1 plays after the fan: lift, extra air, flatten rotation.
 */

import type { CapturePart } from '@/lib/reading-draft'

export type SlotPose = {
  left: number
  top: number
  rotateDeg: number
  scale: number
  z: number
}

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

export const POLAROID_FAN_W = 320
/** SSOT: home-ui-mock.html polaroid ~108×136; slightly larger for touch. */
export const POLAROID_CARD_W = 110
export const POLAROID_CARD_H = 138
export const POLAROID_STACK_H = 218
/** Fan spread — ease-in-out cubic in OffsetPhotoStack. */
export const POLAROID_FAN_MS = 520
/** Ritual lift — overlaps fan tail for rhythm. */
export const POLAROID_RITUAL_MS = 680
/** Start ritual while fan is still easing (overlap, not serial wait). */
export const POLAROID_RITUAL_OVERLAP_MS = 240
/** Home → embedded capture: fan done + ritual ~mid-flight. */
export const POLAROID_CAPTURE_ENTER_MS =
  POLAROID_FAN_MS + Math.round(POLAROID_RITUAL_MS * 0.42)
/** Brief settle after capture mount, then Face selection animates. */
export const POLAROID_FACE_FOCUS_MS = 320
/** Active slot scale / lift — matches stack ease. */
export const POLAROID_SELECT_MS = 300

export function polaroidPoses(
  spread: number,
  boxW: number,
  cardW: number,
  ritual = 0
): Record<CapturePart, SlotPose> {
  'worklet'
  const e = smoothstep(spread)
  const r = smoothstep(ritual)
  const cx = (boxW - cardW) / 2
  const fanLeft = 6
  const fanRight = Math.max(6, boxW - cardW - 6)
  const fanTop = lerp(14, 26, e)
  const ritualLift = r * -14
  const fanScale = lerp(0.98, 1, e) + r * 0.02
  return {
    palm_l: {
      left: lerp(cx - 7, fanLeft, e) + r * -12,
      top: lerp(18, fanTop, e) + ritualLift,
      rotateDeg: lerp(-5.5, -6.5, e) * (1 - r * 0.45),
      scale: lerp(0.97, fanScale, e),
      z: 1,
    },
    palm_r: {
      left: lerp(cx + 8, fanRight, e) + r * 12,
      top: lerp(14, fanTop, e) + ritualLift,
      rotateDeg: lerp(4.8, 6.2, e) * (1 - r * 0.45),
      scale: lerp(0.985, fanScale, e),
      z: 2,
    },
    face: {
      left: lerp(cx, cx, e),
      top: lerp(6, fanTop, e) + ritualLift,
      rotateDeg: lerp(-1.2, -1.4, e) * (1 - r * 0.5),
      scale: lerp(1, fanScale, e),
      z: 3,
    },
  }
}

export const WHEEL_ROW_GAP = 228

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
