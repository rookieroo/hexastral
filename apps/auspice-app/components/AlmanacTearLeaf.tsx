/**
 * Top-hinge tear-off — peels the upper leaf upward to reveal today.
 * Auto-plays once; no reverse (torn pages are not kept).
 */

import * as Haptics from 'expo-haptics'
import { type ReactNode, useEffect, useRef } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

const TEAR_MS = 720

function hapticTick() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
}

export function AlmanacTearLeaf({
  play,
  onFinished,
  topLeaf,
  bottomLeaf,
}: {
  play: boolean
  onFinished: () => void
  topLeaf: ReactNode
  bottomLeaf: ReactNode
}) {
  const { height } = useWindowDimensions()
  const pageH = Math.max(height * 0.7, 480)
  const progress = useSharedValue(0)
  const started = useRef(false)
  const finishedRef = useRef(false)

  useEffect(() => {
    if (!play) {
      started.current = false
      finishedRef.current = false
      progress.value = 0
      return
    }
    if (started.current) return
    started.current = true
    finishedRef.current = false
    progress.value = 0
    const done = () => {
      if (finishedRef.current) return
      finishedRef.current = true
      hapticTick()
      onFinished()
    }
    progress.value = withTiming(
      1,
      { duration: TEAR_MS, easing: Easing.inOut(Easing.cubic) },
      (ok) => {
        if (ok) runOnJS(done)()
      }
    )
  }, [play, progress, onFinished])

  const topStyle = useAnimatedStyle(() => {
    const p = progress.value
    const lift = interpolate(p, [0, 1], [0, -pageH * 1.05], Extrapolation.CLAMP)
    const rotateX = interpolate(p, [0, 1], [0, 62], Extrapolation.CLAMP)
    const opacity = interpolate(p, [0, 0.75, 1], [1, 0.85, 0.2], Extrapolation.CLAMP)
    return {
      opacity,
      transform: [{ perspective: 1200 }, { translateY: lift }, { rotateX: `${rotateX}deg` }],
      zIndex: 2,
    }
  })

  const shadeStyle = useAnimatedStyle(() => {
    const p = progress.value
    return {
      opacity: interpolate(p, [0, 0.4, 1], [0, 0.18, 0.08], Extrapolation.CLAMP),
    }
  })

  return (
    <View style={styles.root}>
      <View style={styles.layer} pointerEvents={play ? 'none' : 'auto'}>
        {bottomLeaf}
      </View>
      {play ? (
        <Animated.View style={[styles.overlay, topStyle]} pointerEvents='none'>
          {topLeaf}
          <Animated.View style={[StyleSheet.absoluteFill, shadeStyle, styles.shade]} />
        </Animated.View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  layer: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  shade: {
    backgroundColor: '#1a120c',
  },
})
