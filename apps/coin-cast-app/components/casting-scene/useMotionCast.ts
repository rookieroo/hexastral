import { DeviceMotion, type DeviceMotionMeasurement } from 'expo-sensors'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'

import {
  createMotionSession,
  MOTION_UPDATE_INTERVAL_MS,
  type MotionFrame,
  type MotionSession,
  motionFrameFromMeasurement,
} from '@/lib/motion-cast'

export type MotionCaptureStatus =
  | 'idle'
  | 'checking'
  | 'collecting'
  | 'unavailable'
  | 'permission_denied'
  | 'interrupted'
  | 'error'

export type MotionCaptureStartResult =
  | { ok: true }
  | {
      ok: false
      reason: Exclude<MotionCaptureStatus, 'idle' | 'checking' | 'collecting'>
    }

function measurementTimestamp(measurement: DeviceMotionMeasurement): number {
  return (
    measurement.acceleration?.timestamp ??
    measurement.accelerationIncludingGravity.timestamp ??
    measurement.rotationRate?.timestamp ??
    measurement.rotation.timestamp
  )
}

export function useMotionCast() {
  const [status, setStatus] = useState<MotionCaptureStatus>('idle')
  const framesRef = useRef<MotionFrame[]>([])
  const frameQueueRef = useRef<MotionFrame[]>([])
  const startedAtRef = useRef(0)
  const nativeStartRef = useRef<number | null>(null)
  const subscriptionRef = useRef<{ remove: () => void } | null>(null)

  const stopSubscription = useCallback(() => {
    subscriptionRef.current?.remove()
    subscriptionRef.current = null
  }, [])

  const cancelCapture = useCallback(
    (nextStatus: MotionCaptureStatus = 'idle') => {
      stopSubscription()
      framesRef.current = []
      frameQueueRef.current = []
      nativeStartRef.current = null
      setStatus(nextStatus)
    },
    [stopSubscription]
  )

  const appendMeasurement = useCallback((measurement: DeviceMotionMeasurement) => {
    const nativeTimestamp = measurementTimestamp(measurement)
    if (!Number.isFinite(nativeTimestamp)) return
    if (nativeStartRef.current === null) nativeStartRef.current = nativeTimestamp
    const frame = motionFrameFromMeasurement(measurement, nativeStartRef.current)
    framesRef.current.push(frame)
    frameQueueRef.current.push(frame)
  }, [])

  const startCapture = useCallback(async (): Promise<MotionCaptureStartResult> => {
    stopSubscription()
    framesRef.current = []
    frameQueueRef.current = []
    nativeStartRef.current = null
    startedAtRef.current = Date.now()
    setStatus('checking')

    try {
      const available = await DeviceMotion.isAvailableAsync()
      if (!available) {
        setStatus('unavailable')
        return { ok: false, reason: 'unavailable' }
      }

      const permission = await DeviceMotion.requestPermissionsAsync()
      if (!permission.granted) {
        setStatus('permission_denied')
        return { ok: false, reason: 'permission_denied' }
      }

      DeviceMotion.setUpdateInterval(MOTION_UPDATE_INTERVAL_MS)
      subscriptionRef.current = DeviceMotion.addListener(appendMeasurement)
      setStatus('collecting')
      return { ok: true }
    } catch (err) {
      console.warn('[motion-cast] start failed', err)
      setStatus('error')
      return { ok: false, reason: 'error' }
    }
  }, [appendMeasurement, stopSubscription])

  const finishCapture = useCallback(async (): Promise<MotionSession> => {
    stopSubscription()
    const frames = framesRef.current
    framesRef.current = []
    nativeStartRef.current = null
    setStatus('idle')
    return createMotionSession(startedAtRef.current, frames)
  }, [stopSubscription])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' && subscriptionRef.current) {
        cancelCapture('interrupted')
      }
    })
    return () => {
      subscription.remove()
      stopSubscription()
    }
  }, [cancelCapture, stopSubscription])

  return {
    status,
    frameQueueRef,
    startCapture,
    finishCapture,
    cancelCapture,
  }
}
