/**
 * Dev-only synthetic accelerometer samples for WebGL toss testing.
 * Expo Accelerometer uses device axes in roughly “g” scale; real shakes mix
 * slow gravity bias with faster wrist motion and irregular bursts — we mimic
 * that envelope so `shakeDriveRef` behaves like on-device data (variable |a|).
 */
export function sampleDevSyntheticAccel(
  tSec: number,
  opts?: { intensity?: number }
): { x: number; y: number; z: number; mag: number } {
  const intensity = opts?.intensity ?? 1
  // Slow tilt / reorientation of the phone vs gravity
  const gx = 0.22 * Math.sin(tSec * 0.52)
  const gy = -0.38 * Math.cos(tSec * 0.41)
  const gz = 0.48 * Math.sin(tSec * 0.47)

  const phase = tSec * 0.73
  const wobble = Math.sin(tSec * 2.05 + 0.7 * Math.sin(tSec * 0.31))
  const s1 = Math.sin(tSec * 12.8 + phase + wobble)
  const s2 = Math.sin(tSec * 9.1 + phase * 1.1)
  const s3 = Math.cos(tSec * 11.3 + wobble * 1.2)

  const burst = 0.42 + 0.58 * Math.abs(Math.sin(tSec * 2.9)) ** 1.6
  const punch = 1 + 0.55 * Math.max(0, Math.sin(tSec * 5.1)) ** 2
  const ritualWarmup = 0.5 + 0.5 * Math.min(1, tSec / 3.4)
  const motionAmp = intensity * burst * punch * ritualWarmup

  const x = gx + s1 * 1.05 * motionAmp
  const y = gy + s2 * 0.72 * motionAmp
  const z = gz + s3 * 1.12 * motionAmp
  const mag = Math.sqrt(x * x + y * y + z * z)
  return { x, y, z, mag }
}
