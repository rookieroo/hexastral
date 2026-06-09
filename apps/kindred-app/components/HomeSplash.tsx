/**
 * HomeSplash — a V15Moon logo flourish on cold launch.
 *
 * The brand moon (ADR-0018 rule 7) holds centered for a beat, then translates +
 * shrinks to LAND on the home's top-left brand moon (same glyph, smaller, exactly
 * where the home shows it). The dark cover fades during the move; once the splash
 * moon overlaps the resting anchor it cross-fades out so you don't see two moons.
 *
 * 2026-06: the home brand moved to the TOP-LEFT (was center-top), and the old
 * target ignored the safe-area inset, so the moon landed high. The landing is now
 * computed from the real insets + the top-bar padding (matches app/(reading)/
 * index.tsx). The "Kindred" wordmark is the home's own inline mark (revealed as
 * the cover lifts), so the splash flies the moon alone — no stacked wordmark to
 * mis-place. Gated by `consumeSplashDecision()` (once per cold launch).
 */

import { kindredDark, kindredSpacing } from '@zhop/hexastral-tokens/kindred'
import { useEffect } from 'react'
import { StyleSheet, useWindowDimensions } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { KindredMoon } from '@/components/KindredMoon'

const SPLASH_MOON = 132
// Matches the home top-left brand moon (app/(reading)/index.tsx topBar).
const HOME_MOON = 30
const HOLD = 700
const MOVE = 620
const CROSSFADE = 220

export function HomeSplash({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion()
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const tx = useSharedValue(0)
  const ty = useSharedValue(0)
  const scale = useSharedValue(1)
  const moonOp = useSharedValue(1)
  const bgOp = useSharedValue(1)

  useEffect(() => {
    if (reduced) {
      runOnJS(onDone)()
      return
    }
    const move = { duration: MOVE, easing: Easing.inOut(Easing.cubic) }
    // Resting center of the home's top-left brand moon: inside the SafeAreaView,
    // the top bar pads by screenH (left) and sm (top). The splash moon starts
    // centered, so translate its center from screen-center to that rest point.
    const restCx = insets.left + kindredSpacing.screenH + HOME_MOON / 2
    const restCy = insets.top + kindredSpacing.sm + HOME_MOON / 2
    tx.value = withDelay(HOLD, withTiming(restCx - width / 2, move))
    ty.value = withDelay(HOLD, withTiming(restCy - height / 2, move))
    scale.value = withDelay(HOLD, withTiming(HOME_MOON / SPLASH_MOON, move))
    // Dark cover lifts partway through the move so the home reveals underneath.
    bgOp.value = withDelay(
      HOLD + MOVE * 0.4,
      withTiming(0, { duration: MOVE * 0.6, easing: Easing.in(Easing.quad) })
    )
    // After the moon lands on the anchor, cross-fade the splash moon out (the home
    // anchor is painted underneath; the hand-off is invisible).
    moonOp.value = withDelay(
      HOLD + MOVE,
      withTiming(0, { duration: CROSSFADE }, (finished) => {
        if (finished) runOnJS(onDone)()
      })
    )
  }, [tx, ty, scale, moonOp, bgOp, onDone, reduced, width, height, insets.left, insets.top])

  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOp.value }))
  const moonStyle = useAnimatedStyle(() => ({
    opacity: moonOp.value,
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }))

  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, styles.bg, bgStyle]} pointerEvents='none' />
      <Animated.View style={[styles.center, moonStyle]} pointerEvents='none'>
        <KindredMoon size={SPLASH_MOON} />
      </Animated.View>
    </>
  )
}

const styles = StyleSheet.create({
  bg: {
    backgroundColor: kindredDark.bg,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
