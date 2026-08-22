/**
 * SharedElementFlight — app-root Modal that flies the tapped polaroid to the
 * report photo mount, then hands off in one frame (no dissolve crossfade).
 *
 * The report keeps the destination photo hidden until morph completes; clearing
 * the bus reveals it at the same rect while this Modal unmounts — one continuous
 * image, not fade-out + fade-in.
 */

import { useCallback, useEffect, useState } from 'react'
import { Modal, View } from 'react-native'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import { LocalPhoto } from '@/components/LocalPhoto'
import { getReducedMotion } from '@/lib/reduced-motion'
import {
  clearFlight,
  readFlight,
  subscribeFlight,
  type SharedElementSource,
} from '@/lib/shared-element-flight'

const FLIGHT_MS = 560
/** Wait for result load + plate measure before giving up (covers fetch + pager settle). */
const TARGET_GRACE_MS = 1200

type TargetRect = { x: number; y: number; w: number; h: number }

export function SharedElementFlight() {
  const [source, setSource] = useState<SharedElementSource | null>(null)
  const [target, setTarget] = useState<TargetRect | null>(null)
  // Position (screen coords from the view's 0,0 origin) + size, driven directly.
  const tx = useSharedValue(0)
  const ty = useSharedValue(0)
  const tw = useSharedValue(0)
  const th = useSharedValue(0)

  const finishFlight = useCallback(() => {
    setSource(null)
    setTarget(null)
    clearFlight()
  }, [])

  useEffect(() => {
    const unsub = subscribeFlight(() => {
      const { source: s, target: t } = readFlight()
      setSource(s)
      setTarget(t)
    })
    return unsub
  }, [])

  // Snap to source size/position and become visible the moment a source arrives.
  useEffect(() => {
    if (!source) return
    if (getReducedMotion()) {
      clearFlight()
      setSource(null)
      setTarget(null)
      return
    }
    tx.value = source.rect.x
    ty.value = source.rect.y
    tw.value = source.rect.w
    th.value = source.rect.h
  }, [source, tx, ty, tw, th])

  // Morph to measured mount, then hand off — destination photo snaps visible same frame.
  useEffect(() => {
    if (!source || !target) return
    tx.value = withTiming(target.x, { duration: FLIGHT_MS })
    ty.value = withTiming(target.y, { duration: FLIGHT_MS })
    tw.value = withTiming(target.w, { duration: FLIGHT_MS })
    th.value = withTiming(target.h, { duration: FLIGHT_MS }, (finished) => {
      if (finished) runOnJS(finishFlight)()
    })
  }, [source, target, tx, ty, tw, th, finishFlight])

  // If the report never registers a target (missing snapshot, measure failure),
  // cancel — do not fly to a heuristic zone with no photo underneath.
  useEffect(() => {
    if (!source || target) return
    const grace = setTimeout(() => {
      if (readFlight().source) clearFlight()
    }, TARGET_GRACE_MS)
    return () => clearTimeout(grace)
  }, [source, target])

  const src = source
  const srcW = src?.rect.w ?? 0
  const srcH = src?.rect.h ?? 0

  const style = useAnimatedStyle(() => ({
    width: Math.max(1, tw.value),
    height: Math.max(1, th.value),
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }))

  if (!src || srcW <= 0 || srcH <= 0) return null
  if (!src.uri) return null

  return (
    <Modal transparent visible animationType='none'>
      <View style={{ flex: 1 }} pointerEvents='none'>
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 999,
            },
            style,
          ]}
        >
          <LocalPhoto uri={src.uri} style={{ width: '100%', height: '100%' }} />
        </Animated.View>
      </View>
    </Modal>
  )
}
