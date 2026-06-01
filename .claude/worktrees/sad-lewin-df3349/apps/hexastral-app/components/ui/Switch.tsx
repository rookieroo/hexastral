/**
 * Custom cross-platform Switch — Ink Brutalism aesthetic
 *
 * Implementation: **react-native-reanimated** (UI-thread springs).
 * - Controlled `value` only: `onPress` calls `onValueChange(!value)`; thumb/overlay
 *   follow `value` via `useLayoutEffect` → `withSpring` / `withTiming` on shared values.
 * - Avoids RN `Animated` overlap races and optimistic/timer rollback issues.
 * - `onValueChangeRef` on outer wrapper keeps callbacks fresh under `SwitchInner` memo.
 */

import { memo, useLayoutEffect, useRef, type MutableRefObject } from 'react'
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useTheme } from '@/lib/theme'
import { hapticLight } from '@/lib/ux/haptics'

const TRACK_WIDTH = 51
const TRACK_HEIGHT = 31
const THUMB_SIZE = 27
const THUMB_MARGIN = 2
const THUMB_OFF = THUMB_MARGIN
const THUMB_ON = TRACK_WIDTH - THUMB_SIZE - THUMB_MARGIN

/** Tuned to approximate the old RN Animated spring (friction 9, tension 90). */
const THUMB_SPRING = {
  damping: 16,
  stiffness: 200,
  mass: 0.35,
} as const

const OVERLAY_TIMING_MS = 160

interface SwitchProps {
  value: boolean
  onValueChange: (value: boolean) => void
  disabled?: boolean
  style?: ViewStyle
  /** Expand touch target (compact rows). Default 10. */
  hitSlop?: number
}

interface SwitchInnerProps {
  value: boolean
  disabled?: boolean
  style?: ViewStyle
  offColor: string
  onColor: string
  onValueChangeRef: MutableRefObject<(v: boolean) => void>
  hitSlop: number
}

const SwitchInner = memo(
  function SwitchInner({
    value,
    disabled,
    style,
    offColor,
    onColor,
    onValueChangeRef,
    hitSlop,
  }: SwitchInnerProps) {
    const thumbX = useSharedValue(value ? THUMB_ON : THUMB_OFF)
    const trackOnOpacity = useSharedValue(value ? 1 : 0)

    const valueRef = useRef(value)
    valueRef.current = value

    useLayoutEffect(() => {
      thumbX.value = withSpring(value ? THUMB_ON : THUMB_OFF, THUMB_SPRING)
      trackOnOpacity.value = withTiming(value ? 1 : 0, { duration: OVERLAY_TIMING_MS })
      // thumbX / trackOnOpacity are stable shared value refs — only `value` should re-drive motion
      // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values intentionally omitted
    }, [value])

    const thumbStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: thumbX.value }],
    }))

    const overlayStyle = useAnimatedStyle(() => ({
      opacity: trackOnOpacity.value,
    }))

    return (
      <Pressable
        onPress={() => {
          if (disabled) return
          hapticLight()
          onValueChangeRef.current(!valueRef.current)
        }}
        accessibilityRole='switch'
        accessibilityState={{ checked: value, disabled }}
        style={[styles.pressable, style]}
        hitSlop={hitSlop}
      >
        <View style={[styles.track, { backgroundColor: offColor, opacity: disabled ? 0.5 : 1 }]}>
          <Animated.View
            style={[styles.trackOverlay, { backgroundColor: onColor }, overlayStyle]}
          />
          <Animated.View style={[styles.thumb, thumbStyle]} />
        </View>
      </Pressable>
    )
  },
  (prev, next) =>
    prev.value === next.value &&
    prev.disabled === next.disabled &&
    prev.offColor === next.offColor &&
    prev.onColor === next.onColor &&
    prev.hitSlop === next.hitSlop,
)

export const Switch = memo(function Switch({
  value,
  onValueChange,
  disabled,
  style,
  hitSlop = 10,
}: SwitchProps) {
  const { colors, isDark } = useTheme()
  const offColor = isDark ? '#52525B' : '#A1A1AA'
  const onColor = colors.accent
  const onValueChangeRef = useRef(onValueChange)
  onValueChangeRef.current = onValueChange

  return (
    <SwitchInner
      value={value}
      disabled={disabled}
      style={style}
      offColor={offColor}
      onColor={onColor}
      onValueChangeRef={onValueChangeRef}
      hitSlop={hitSlop}
    />
  )
})

const styles = StyleSheet.create({
  pressable: {
    justifyContent: 'center',
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
  },
  trackOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    top: THUMB_MARGIN,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2.5,
    elevation: 4,
  },
})
