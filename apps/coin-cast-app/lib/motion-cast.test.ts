import { describe, expect, it } from 'bun:test'
import type { DeviceMotionMeasurement } from 'expo-sensors'

import type { CastLineRecord, CastSource } from './casting-types'
import {
  buildCastEntropyMetadata,
  canonicalizeMotionFrames,
  evaluateMotionQuality,
  type MotionFrame,
  motionFrameFromMeasurement,
} from './motion-cast'

function createFrames(acceleration: number, count = 100, intervalMs = 20): MotionFrame[] {
  return Array.from({ length: count }, (_, index) => ({
    t: index * intervalMs,
    intervalMs,
    acceleration: { x: index % 2 === 0 ? acceleration : -acceleration, y: 0, z: 0 },
    accelerationIncludingGravity: {
      x: index % 2 === 0 ? acceleration : -acceleration,
      y: 0,
      z: -9.80665,
    },
    rotation: { alpha: 0, beta: 0, gamma: 0 },
    rotationRate: { alpha: index, beta: 0, gamma: 0 },
    orientation: 0,
    clamped: false,
  }))
}

function createRecord(source: CastSource, digest: string): CastLineRecord {
  return {
    result: { coins: [2, 3, 3], total: 8 },
    source,
    digest,
  }
}

describe('motion-cast', () => {
  it('preserves actual duration, strength, and angular differences', () => {
    const gentle = evaluateMotionQuality(createFrames(2))
    const strong = evaluateMotionQuality(createFrames(5))
    const longer = evaluateMotionQuality(createFrames(2, 150))

    expect(strong.linearEnergy).toBeGreaterThan(gentle.linearEnergy)
    expect(longer.durationMs).toBeGreaterThan(gentle.durationMs)
    expect(gentle.angularEnergy).toBeGreaterThan(0)
  })

  it('accepts a complete directional shake and rejects insufficient motion', () => {
    const complete = evaluateMotionQuality(createFrames(3))
    const incomplete = evaluateMotionQuality(createFrames(0.05, 20))

    expect(complete.sufficient).toBe(true)
    expect(incomplete.sufficient).toBe(false)
    expect(incomplete.reasons).toContain('too_short')
    expect(incomplete.reasons).toContain('too_few_samples')
    expect(incomplete.reasons).toContain('too_little_motion')
  })

  it('safely clamps non-finite and explosive sensor values', () => {
    const measurement: DeviceMotionMeasurement = {
      acceleration: { x: Number.NaN, y: 1_000, z: 2, timestamp: 11 },
      accelerationIncludingGravity: { x: 0, y: 0, z: -9.8, timestamp: 11 },
      rotation: { alpha: 0, beta: 0, gamma: 0, timestamp: 11 },
      rotationRate: { alpha: Number.POSITIVE_INFINITY, beta: 0, gamma: 0, timestamp: 11 },
      interval: 16,
      orientation: 0,
    }
    const frame = motionFrameFromMeasurement(measurement, 10)

    expect(frame.clamped).toBe(true)
    expect(frame.acceleration?.x).toBe(0)
    expect(frame.acceleration?.y).toBe(80)
    expect(frame.rotationRate?.alpha).toBe(0)
  })

  it('creates stable canonical SHA-256 input for the same sequence', () => {
    const frames = createFrames(3)
    const clone = createFrames(3)

    expect(canonicalizeMotionFrames(frames)).toBe(canonicalizeMotionFrames(clone))
    expect(canonicalizeMotionFrames(frames)).not.toBe(canonicalizeMotionFrames(createFrames(4)))
  })

  it('keeps six line sources and aggregate digest within the API entropy limit', () => {
    const records = Array.from({ length: 6 }, (_, index) =>
      createRecord(index === 2 ? 'digital_assist' : 'motion', String(index).repeat(64))
    )
    const metadata = buildCastEntropyMetadata(records, 'a'.repeat(64))

    expect(metadata).toBe(`coincast_v1_mmdmmm_${'a'.repeat(64)}`)
    expect(metadata.length).toBeLessThanOrEqual(256)
  })
})
