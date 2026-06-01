import { useCallback, useRef } from 'react'

import type { AccelSample } from '@/lib/casting-entropy'

const DEFAULT_CAPACITY = 56

/** Rolling accelerometer buffer for shake entropy fingerprints. */
export function useSensorEntropy(capacity: number = DEFAULT_CAPACITY) {
  const buf = useRef<AccelSample[]>([])

  const pushSample = useCallback(
    (x: number, y: number, z: number) => {
      const arr = buf.current
      arr.push({ x, y, z, t: Date.now() })
      if (arr.length > capacity) {
        arr.splice(0, arr.length - capacity)
      }
    },
    [capacity]
  )

  const snapshot = useCallback(() => [...buf.current], [])

  const clear = useCallback(() => {
    buf.current = []
  }, [])

  return { pushSample, snapshot, clear }
}
