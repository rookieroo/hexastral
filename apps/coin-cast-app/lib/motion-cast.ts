import type { DeviceMotionMeasurement } from 'expo-sensors'

import type { CastLineRecord, YaoResult } from '@/lib/casting-types'

export interface MotionVector {
  x: number
  y: number
  z: number
}

export interface MotionRotation {
  alpha: number
  beta: number
  gamma: number
}

export interface MotionFrame {
  /** Native sensor time relative to this cast session, in milliseconds. */
  t: number
  intervalMs: number
  acceleration: MotionVector | null
  accelerationIncludingGravity: MotionVector
  rotation: MotionRotation
  rotationRate: MotionRotation | null
  orientation: number
  clamped: boolean
}

export type MotionQualityReason =
  | 'too_short'
  | 'too_few_samples'
  | 'too_little_motion'
  | 'too_few_direction_changes'

export interface MotionQuality {
  sufficient: boolean
  reasons: MotionQualityReason[]
  durationMs: number
  sampleCount: number
  linearEnergy: number
  angularEnergy: number
  directionChanges: number
  clampedSampleCount: number
}

export interface MotionSession {
  schemaVersion: 1
  startedAt: number
  frames: MotionFrame[]
  quality: MotionQuality
  digest: string
}

export const MOTION_UPDATE_INTERVAL_MS = 16
export const MOTION_MIN_DURATION_MS = 1_800
export const MOTION_MIN_SAMPLE_COUNT = 40
export const MOTION_MIN_LINEAR_ENERGY = 4
export const MOTION_MIN_DIRECTION_CHANGES = 3

const MAX_LINEAR_ACCELERATION = 80
const MAX_GRAVITY_ACCELERATION = 100
const MAX_ROTATION_RATE = 1_440
const DIRECTION_CHANGE_COSINE = 0.65

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0
}

function clampSymmetric(value: number, maxAbs: number): { value: number; clamped: boolean } {
  const finite = finiteOrZero(value)
  const valueClamped = Math.max(-maxAbs, Math.min(maxAbs, finite))
  return { value: valueClamped, clamped: !Number.isFinite(value) || valueClamped !== value }
}

function sanitizeVector(
  value: MotionVector,
  maxAbs: number
): { value: MotionVector; clamped: boolean } {
  const x = clampSymmetric(value.x, maxAbs)
  const y = clampSymmetric(value.y, maxAbs)
  const z = clampSymmetric(value.z, maxAbs)
  return {
    value: { x: x.value, y: y.value, z: z.value },
    clamped: x.clamped || y.clamped || z.clamped,
  }
}

function sanitizeRotation(
  value: MotionRotation,
  maxAbs: number
): { value: MotionRotation; clamped: boolean } {
  const alpha = clampSymmetric(value.alpha, maxAbs)
  const beta = clampSymmetric(value.beta, maxAbs)
  const gamma = clampSymmetric(value.gamma, maxAbs)
  return {
    value: { alpha: alpha.value, beta: beta.value, gamma: gamma.value },
    clamped: alpha.clamped || beta.clamped || gamma.clamped,
  }
}

function nativeTimestampSeconds(measurement: DeviceMotionMeasurement): number {
  return (
    measurement.acceleration?.timestamp ??
    measurement.accelerationIncludingGravity.timestamp ??
    measurement.rotationRate?.timestamp ??
    measurement.rotation.timestamp
  )
}

export function motionFrameFromMeasurement(
  measurement: DeviceMotionMeasurement,
  sessionStartTimestampSeconds: number
): MotionFrame {
  const acceleration = measurement.acceleration
    ? sanitizeVector(measurement.acceleration, MAX_LINEAR_ACCELERATION)
    : null
  const gravity = sanitizeVector(measurement.accelerationIncludingGravity, MAX_GRAVITY_ACCELERATION)
  const rotation = sanitizeRotation(measurement.rotation, Math.PI * 4)
  const rotationRate = measurement.rotationRate
    ? sanitizeRotation(measurement.rotationRate, MAX_ROTATION_RATE)
    : null
  const nativeTimestamp = nativeTimestampSeconds(measurement)

  return {
    t: Math.max(0, (nativeTimestamp - sessionStartTimestampSeconds) * 1_000),
    intervalMs: Math.max(1, finiteOrZero(measurement.interval)),
    acceleration: acceleration?.value ?? null,
    accelerationIncludingGravity: gravity.value,
    rotation: rotation.value,
    rotationRate: rotationRate?.value ?? null,
    orientation: finiteOrZero(measurement.orientation),
    clamped:
      (acceleration?.clamped ?? false) ||
      gravity.clamped ||
      rotation.clamped ||
      (rotationRate?.clamped ?? false),
  }
}

function magnitude(vector: MotionVector): number {
  return Math.hypot(vector.x, vector.y, vector.z)
}

function yaoTotalFromCoins(coins: [2 | 3, 2 | 3, 2 | 3]): YaoResult['total'] {
  const total = coins[0] + coins[1] + coins[2]
  if (total === 6 || total === 7 || total === 8 || total === 9) return total
  throw new Error(`Invalid three-coin total: ${total}`)
}

function dot(a: MotionVector, b: MotionVector): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

function normalized(vector: MotionVector): MotionVector | null {
  const length = magnitude(vector)
  if (length < 0.2) return null
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length }
}

export function evaluateMotionQuality(frames: MotionFrame[]): MotionQuality {
  const durationMs = frames.at(-1)?.t ?? 0
  let linearEnergy = 0
  let angularEnergy = 0
  let directionChanges = 0
  let previousDirection: MotionVector | null = null

  for (let index = 0; index < frames.length; index++) {
    const frame = frames[index]
    if (!frame) continue
    const previousT = frames[index - 1]?.t ?? frame.t
    const dtSeconds = Math.max(0, Math.min(0.25, (frame.t - previousT) / 1_000))
    const acceleration = frame.acceleration
    if (acceleration) {
      const accelMagnitude = magnitude(acceleration)
      linearEnergy += accelMagnitude * accelMagnitude * dtSeconds
      const direction = normalized(acceleration)
      if (
        direction &&
        previousDirection &&
        dot(direction, previousDirection) < DIRECTION_CHANGE_COSINE
      ) {
        directionChanges += 1
      }
      if (direction) previousDirection = direction
    }
    if (frame.rotationRate) {
      const rateMagnitude = Math.hypot(
        frame.rotationRate.alpha,
        frame.rotationRate.beta,
        frame.rotationRate.gamma
      )
      angularEnergy += rateMagnitude * rateMagnitude * dtSeconds
    }
  }

  const reasons: MotionQualityReason[] = []
  if (durationMs < MOTION_MIN_DURATION_MS) reasons.push('too_short')
  if (frames.length < MOTION_MIN_SAMPLE_COUNT) reasons.push('too_few_samples')
  if (linearEnergy < MOTION_MIN_LINEAR_ENERGY) reasons.push('too_little_motion')
  if (directionChanges < MOTION_MIN_DIRECTION_CHANGES) {
    reasons.push('too_few_direction_changes')
  }

  return {
    sufficient: reasons.length === 0,
    reasons,
    durationMs,
    sampleCount: frames.length,
    linearEnergy,
    angularEnergy,
    directionChanges,
    clampedSampleCount: frames.filter((frame) => frame.clamped).length,
  }
}

function quantize(value: number): string {
  return finiteOrZero(value).toFixed(4)
}

export function canonicalizeMotionFrames(frames: MotionFrame[]): string {
  return frames
    .map((frame) => {
      const a = frame.acceleration
      const r = frame.rotationRate
      return [
        quantize(frame.t),
        quantize(frame.intervalMs),
        a ? `${quantize(a.x)},${quantize(a.y)},${quantize(a.z)}` : 'null',
        [
          quantize(frame.accelerationIncludingGravity.x),
          quantize(frame.accelerationIncludingGravity.y),
          quantize(frame.accelerationIncludingGravity.z),
        ].join(','),
        [
          quantize(frame.rotation.alpha),
          quantize(frame.rotation.beta),
          quantize(frame.rotation.gamma),
        ].join(','),
        r ? `${quantize(r.alpha)},${quantize(r.beta)},${quantize(r.gamma)}` : 'null',
        String(frame.orientation),
        frame.clamped ? '1' : '0',
      ].join('|')
    })
    .join(';')
}

export async function digestMotionFrames(frames: MotionFrame[]): Promise<string> {
  const Crypto = await import('expo-crypto')
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `yaul_motion_v1|${canonicalizeMotionFrames(frames)}`
  )
}

export async function createMotionSession(
  startedAt: number,
  frames: MotionFrame[]
): Promise<MotionSession> {
  const frozenFrames = frames.map((frame) => ({
    ...frame,
    acceleration: frame.acceleration ? { ...frame.acceleration } : null,
    accelerationIncludingGravity: { ...frame.accelerationIncludingGravity },
    rotation: { ...frame.rotation },
    rotationRate: frame.rotationRate ? { ...frame.rotationRate } : null,
  }))
  return {
    schemaVersion: 1,
    startedAt,
    frames: frozenFrames,
    quality: evaluateMotionQuality(frozenFrames),
    digest: await digestMotionFrames(frozenFrames),
  }
}

export async function aggregateCastDigests(records: CastLineRecord[]): Promise<string> {
  const Crypto = await import('expo-crypto')
  const material = records
    .map((record, index) => `${index + 1}:${record.source}:${record.digest}`)
    .join('|')
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `yaul_cast_v1|${material}`)
}

export function buildCastEntropyMetadata(
  records: CastLineRecord[],
  aggregateDigest: string
): string {
  const sourceCode = records.map((record) => (record.source === 'motion' ? 'm' : 'd')).join('')
  return `coincast_v1_${sourceCode}_${aggregateDigest}`
}

export async function createDigitalAssistResult(): Promise<CastLineRecord> {
  const Crypto = await import('expo-crypto')
  const bytes = await Crypto.getRandomBytesAsync(3)
  const coins: [2 | 3, 2 | 3, 2 | 3] = [
    (bytes[0] ?? 0) < 128 ? 2 : 3,
    (bytes[1] ?? 0) < 128 ? 2 : 3,
    (bytes[2] ?? 0) < 128 ? 2 : 3,
  ]
  const result: YaoResult = {
    coins,
    total: yaoTotalFromCoins(coins),
  }
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `yaul_assist_v1|${Array.from(bytes).join(',')}`
  )
  return { result, source: 'digital_assist', digest }
}
