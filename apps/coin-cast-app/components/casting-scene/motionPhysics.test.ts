import { describe, expect, it } from 'bun:test'

import type { MotionFrame } from '@/lib/motion-cast'

import { drainMotionFramesThrough, motionFrameToPhysicsDrive } from './motionPhysics'

function frame(t: number, x: number): MotionFrame {
  return {
    t,
    intervalMs: 20,
    acceleration: { x, y: 0, z: 0 },
    accelerationIncludingGravity: { x, y: 0, z: -9.80665 },
    rotation: { alpha: 0, beta: 0, gamma: 0 },
    rotationRate: { alpha: x * 10, beta: 0, gamma: 0 },
    orientation: 0,
    clamped: false,
  }
}

describe('motion physics mapping', () => {
  it('preserves frame ordering across different render chunk sizes', () => {
    const fixture = [frame(10, 1), frame(30, -2), frame(50, 3), frame(70, -4)]
    const fineQueue = fixture.map((item) => ({ ...item }))
    const coarseQueue = fixture.map((item) => ({ ...item }))
    const fine = [16, 32, 48, 64, 80].flatMap((time) => drainMotionFramesThrough(fineQueue, time))
    const coarse = drainMotionFramesThrough(coarseQueue, 80)

    expect(fine.map((item) => item.t)).toEqual(coarse.map((item) => item.t))
    expect(fineQueue).toHaveLength(0)
    expect(coarseQueue).toHaveLength(0)
  })

  it('maps distinct real motion fixtures to distinct physical drives', () => {
    const left = motionFrameToPhysicsDrive(frame(20, -4), 0.02)
    const right = motionFrameToPhysicsDrive(frame(20, 5), 0.02)

    expect(left.inertialAcceleration?.x).not.toBe(right.inertialAcceleration?.x)
    expect(left.angularVelocityDelta?.y).not.toBe(right.angularVelocityDelta?.y)
  })
})
