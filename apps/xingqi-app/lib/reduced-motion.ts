/**
 * Sync read of iOS/Android "Reduce Motion" — updated on app mount + setting changes.
 * Used to skip shared-element flights (instant nav is enough).
 */

import { useEffect } from 'react'
import { AccessibilityInfo } from 'react-native'

let reducedMotion = false

export function getReducedMotion(): boolean {
  return reducedMotion
}

/** Mount once in root layout. */
export function ReducedMotionMount(): null {
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      reducedMotion = v
    })
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      reducedMotion = v
    })
    return () => sub.remove()
  }, [])
  return null
}
