/**
 * DayPageTurn — camera over keyed day pages.
 *
 * Each civil day is absolutely positioned at civilIndex(iso) * width.
 * The camera shared value is the visible civil index (float while dragging).
 * On commit we animate the camera, then tell the parent — no progress snap,
 * so the on-screen page instance is not remounted.
 */

import { SWIPE_TO_ME } from '@zhop/satellite-ui'
import * as Haptics from 'expo-haptics'
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

const COMMIT_RATIO = 0.12
const EXIT_MS = 240
const TEAR_MS = 520
const ACTIVE_X = 12
const NEXT_DIST = 24
const NEXT_VEL = -280
const PREV_DIST = 24
const PREV_VEL = 280
const FAIL_Y: [number, number] = [-72, 72]

function hapticTick() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
}

function softHaptic() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
}

/** UTC civil day serial — stable across timezones for YYYY-MM-DD keys. */
export function civilIndex(iso: string): number {
  const y = Number(iso.slice(0, 4))
  const m = Number(iso.slice(5, 7))
  const d = Number(iso.slice(8, 10))
  if (!y || !m || !d) return 0
  return Math.round(Date.UTC(y, m - 1, d) / 86400000)
}

function CameraPage({
  pageIdx,
  camera,
  pageW,
  children,
  interactive,
}: {
  pageIdx: number
  camera: SharedValue<number>
  pageW: SharedValue<number>
  children: ReactNode
  interactive: boolean
}) {
  const style = useAnimatedStyle(() => {
    const w = Math.max(pageW.value, 1)
    return {
      transform: [{ translateX: (pageIdx - camera.value) * w }],
    }
  })
  return (
    <Animated.View
      pointerEvents={interactive ? 'box-none' : 'none'}
      style={[styles.page, style]}
      collapsable={false}
    >
      {children}
    </Animated.View>
  )
}

export function DayPageTurn({
  dayKey,
  prevDayKey,
  nextDayKey,
  onSwipeDay,
  enabled = true,
  canSwipePrev = true,
  autoPlay = false,
  autoTopLeaf,
  onAutoFinished,
  underNext,
  underPrev,
  children,
  accessibilityLabel,
  daySwipeHint,
}: {
  dayKey: string
  prevDayKey?: string
  nextDayKey?: string
  onSwipeDay?: (delta: -1 | 1) => void
  enabled?: boolean
  canSwipePrev?: boolean
  autoPlay?: boolean
  autoTopLeaf?: ReactNode
  onAutoFinished?: () => void
  underNext?: ReactNode
  underPrev?: ReactNode
  children: ReactNode
  accessibilityLabel?: string
  daySwipeHint?: string
}) {
  const { width: windowW } = useWindowDimensions()
  const pageW = useSharedValue(Math.max(windowW, 1))
  const [layoutW, setLayoutW] = useState(Math.max(windowW, 1))
  const { maxDy } = SWIPE_TO_ME

  const camera = useSharedValue(civilIndex(dayKey))
  const startCam = useSharedValue(civilIndex(dayKey))
  const busy = useSharedValue(0)
  const canPrevSV = useSharedValue(canSwipePrev ? 1 : 0)
  const autoSV = useSharedValue(autoPlay ? 1 : 0)

  const pendingDelta = useRef<-1 | 1 | null>(null)
  const autoStarted = useRef(false)
  const autoFinished = useRef(false)
  const [pressLocked, setPressLocked] = useState(false)

  const onRootLayout = useCallback(
    (w: number) => {
      if (pressLocked) return
      if (w > 1 && Math.abs(w - layoutW) > 2) {
        pageW.value = w
        setLayoutW(w)
      }
    },
    [pageW, pressLocked, layoutW]
  )

  useEffect(() => {
    canPrevSV.value = canSwipePrev ? 1 : 0
  }, [canSwipePrev, canPrevSV])

  useEffect(() => {
    autoSV.value = autoPlay ? 1 : 0
  }, [autoPlay, autoSV])

  // Gesture commits already parked the camera. Only snap on external jumps
  // (今日 / deep link). Always drop busy so the next pan can start.
  useLayoutEffect(() => {
    const idx = civilIndex(dayKey)
    busy.value = 0
    setPressLocked(false)
    if (pendingDelta.current != null) {
      pendingDelta.current = null
      return
    }
    camera.value = idx
  }, [dayKey, camera, busy])

  const lockPress = useCallback(() => setPressLocked(true), [])
  const unlockPress = useCallback(() => setPressLocked(false), [])

  useEffect(() => {
    if (!autoPlay) {
      autoStarted.current = false
      autoFinished.current = false
      return
    }
    if (autoStarted.current) return
    autoStarted.current = true
    autoFinished.current = false
    busy.value = 1
    const origin = civilIndex(dayKey)
    camera.value = origin
    const done = () => {
      if (autoFinished.current) return
      autoFinished.current = true
      busy.value = 0
      camera.value = origin
      hapticTick()
      onAutoFinished?.()
    }
    camera.value = withTiming(origin + 1, { duration: TEAR_MS, easing: Easing.inOut(Easing.cubic) }, (ok) => {
      if (ok) runOnJS(done)()
    })
  }, [autoPlay, camera, busy, dayKey, onAutoFinished])

  const commit = useCallback(
    (delta: -1 | 1) => {
      busy.value = 0
      setPressLocked(false)
      if (!onSwipeDay) return
      pendingDelta.current = delta
      hapticTick()
      onSwipeDay(delta)
    },
    [onSwipeDay, busy]
  )

  const a11ySwipe = useCallback(
    (delta: -1 | 1) => {
      if (!onSwipeDay || autoPlay) return
      if (delta < 0 && !canSwipePrev) {
        softHaptic()
        return
      }
      if (pendingDelta.current != null) return
      pendingDelta.current = delta
      busy.value = 1
      camera.value = civilIndex(dayKey) + delta
      hapticTick()
      onSwipeDay(delta)
    },
    [onSwipeDay, busy, canSwipePrev, autoPlay, camera, dayKey]
  )

  const gesture = Gesture.Pan()
    .enabled(Boolean(enabled && onSwipeDay && !autoPlay))
    .activeOffsetX([-ACTIVE_X, ACTIVE_X])
    .failOffsetY(FAIL_Y)
    .maxPointers(1)
    .onStart(() => {
      'worklet'
      startCam.value = camera.value
      runOnJS(lockPress)()
    })
    .onUpdate((e) => {
      'worklet'
      if (busy.value || autoSV.value) return
      if (Math.abs(e.translationY) >= maxDy) return
      const w = Math.max(pageW.value, 1)
      let cam = startCam.value - e.translationX / w
      if (cam < startCam.value && !canPrevSV.value) {
        const back = startCam.value - cam
        cam = startCam.value - interpolate(back, [0, 0.35], [0, 0.08], Extrapolation.CLAMP)
      }
      camera.value = cam
    })
    .onEnd((e) => {
      'worklet'
      if (busy.value || autoSV.value) return
      const origin = startCam.value
      if (Math.abs(e.translationY) >= maxDy) {
        camera.value = withSpring(origin, { damping: 26, stiffness: 280 })
        runOnJS(unlockPress)()
        return
      }
      const w = Math.max(pageW.value, 1)
      const threshold = w * COMMIT_RATIO
      const dx = e.translationX
      const vx = e.velocityX
      const goNext = dx < -threshold || (dx < -NEXT_DIST && vx < NEXT_VEL)
      const goPrev = dx > threshold || (dx > PREV_DIST && vx > PREV_VEL)

      if (!goNext && !goPrev) {
        camera.value = withSpring(origin, { damping: 26, stiffness: 280 })
        runOnJS(unlockPress)()
        return
      }
      if (goPrev && !canPrevSV.value) {
        camera.value = withSpring(origin, { damping: 26, stiffness: 280 })
        runOnJS(softHaptic)()
        runOnJS(unlockPress)()
        return
      }
      const delta: -1 | 1 = goNext ? 1 : -1
      const target = origin + delta
      busy.value = 1
      camera.value = withTiming(
        target,
        { duration: EXIT_MS, easing: Easing.out(Easing.cubic) },
        (done) => {
          busy.value = 0
          if (done) runOnJS(commit)(delta)
          else runOnJS(unlockPress)()
        }
      )
    })
    .onFinalize((_e, success) => {
      'worklet'
      if (!success && busy.value === 0) {
        runOnJS(unlockPress)()
      }
    })

  const showAutoOverlay = autoPlay && Boolean(autoTopLeaf)
  const curIdx = civilIndex(dayKey)
  const prevIdx = prevDayKey ? civilIndex(prevDayKey) : null
  const nextIdx = nextDayKey ? civilIndex(nextDayKey) : null

  const autoLeafStyle = useAnimatedStyle(() => {
    const w = Math.max(pageW.value, 1)
    return { transform: [{ translateX: (curIdx - camera.value) * w }] }
  })

  const pageContent = (
    <View
      style={styles.clip}
      onLayout={(e) => onRootLayout(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={daySwipeHint}
      accessibilityActions={
        onSwipeDay
          ? [
              { name: 'decrement', label: 'Previous day' },
              { name: 'increment', label: 'Next day' },
            ]
          : undefined
      }
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'decrement') a11ySwipe(-1)
        else if (e.nativeEvent.actionName === 'increment') a11ySwipe(1)
      }}
    >
      {showAutoOverlay ? (
        <>
          <View style={styles.fill} pointerEvents='none'>
            {children}
          </View>
          <Animated.View style={[styles.overlay, autoLeafStyle]} pointerEvents='none'>
            {autoTopLeaf}
          </Animated.View>
        </>
      ) : (
        <>
          {prevIdx != null && underPrev && prevDayKey && prevDayKey !== dayKey ? (
            <CameraPage
              key={prevDayKey}
              pageIdx={prevIdx}
              camera={camera}
              pageW={pageW}
              interactive={false}
            >
              {underPrev}
            </CameraPage>
          ) : null}
          <CameraPage key={dayKey} pageIdx={curIdx} camera={camera} pageW={pageW} interactive>
            {children}
          </CameraPage>
          {nextIdx != null &&
          underNext &&
          nextDayKey &&
          nextDayKey !== dayKey &&
          nextDayKey !== prevDayKey ? (
            <CameraPage
              key={nextDayKey}
              pageIdx={nextIdx}
              camera={camera}
              pageW={pageW}
              interactive={false}
            >
              {underNext}
            </CameraPage>
          ) : null}
        </>
      )}
    </View>
  )

  if (!onSwipeDay || !enabled || autoPlay) return pageContent

  return <GestureDetector gesture={gesture}>{pageContent}</GestureDetector>
}

const styles = StyleSheet.create({
  clip: {
    flex: 1,
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
  },
  page: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
})
