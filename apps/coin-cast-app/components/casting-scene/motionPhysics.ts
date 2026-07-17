import type { MotionFrame, MotionVector } from '@/lib/motion-cast'

import { GRAVITY_Y, MOTION_ANGULAR_GAIN, MOTION_LINEAR_GAIN } from './constants'

export interface MotionPhysicsDrive {
  gravity: MotionVector | null
  inertialAcceleration: MotionVector | null
  angularVelocityDelta: MotionVector | null
}

export function motionFrameToPhysicsDrive(
  frame: MotionFrame,
  dtSeconds: number
): MotionPhysicsDrive {
  const linear = frame.acceleration
  const inertialAcceleration = linear
    ? {
        x: -linear.x * MOTION_LINEAR_GAIN,
        y: -linear.z * MOTION_LINEAR_GAIN,
        z: linear.y * MOTION_LINEAR_GAIN,
      }
    : null

  const gravitySource = linear
    ? {
        x: frame.accelerationIncludingGravity.x - linear.x,
        y: frame.accelerationIncludingGravity.y - linear.y,
        z: frame.accelerationIncludingGravity.z - linear.z,
      }
    : frame.accelerationIncludingGravity
  const gravityMagnitude = Math.hypot(gravitySource.x, gravitySource.y, gravitySource.z)
  const gravity =
    gravityMagnitude > 1
      ? {
          x: (gravitySource.x * Math.abs(GRAVITY_Y)) / gravityMagnitude,
          y: (gravitySource.z * Math.abs(GRAVITY_Y)) / gravityMagnitude,
          z: (-gravitySource.y * Math.abs(GRAVITY_Y)) / gravityMagnitude,
        }
      : null

  const rotationRate = frame.rotationRate
  const degToRad = Math.PI / 180
  const angularVelocityDelta = rotationRate
    ? {
        x: rotationRate.beta * degToRad * dtSeconds * MOTION_ANGULAR_GAIN,
        y: rotationRate.alpha * degToRad * dtSeconds * MOTION_ANGULAR_GAIN,
        z: -rotationRate.gamma * degToRad * dtSeconds * MOTION_ANGULAR_GAIN,
      }
    : null

  return { gravity, inertialAcceleration, angularVelocityDelta }
}

export function drainMotionFramesThrough(
  queue: MotionFrame[],
  simulationTimeMs: number
): MotionFrame[] {
  const drained: MotionFrame[] = []
  while (queue[0] && queue[0].t <= simulationTimeMs) {
    const frame = queue.shift()
    if (frame) drained.push(frame)
  }
  return drained
}
