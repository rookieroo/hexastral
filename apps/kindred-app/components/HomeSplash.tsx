/**
 * HomeSplash — a V15Moon logo flourish on cold launch.
 *
 * The matrix anchor (V15Moon, ADR-0018 rule 7) holds centered for a beat, then
 * translates UP + shrinks to LAND on the home header's V15Moon anchor (same
 * brand glyph, just bigger). The dark cover fades during the move; once the
 * splash moon overlaps the resting home anchor, it briefly cross-fades out so
 * you don't see two moons. That's the magic-move feel — same logo, smaller,
 * exactly where the home shows it.
 *
 * Gated by `consumeSplashDecision()` so it plays once per cold launch, never
 * right after onboarding (the exits call `suppressNextSplash()`).
 */

import { V15Moon } from '@zhop/core-ui/motion'
import { ricePaper } from '@zhop/hexastral-tokens'
import { kindredDark } from '@zhop/hexastral-tokens/kindred'
import { useEffect } from 'react'
import { StyleSheet, Text, useWindowDimensions } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'

const SPLASH_MOON = 132
const HOME_MOON = 56
// Header anchor distance from the top of the safe-area screen, roughly:
// SafeArea + ··· header row + small margin + half the moon height.
const HOME_MOON_TOP = 60 + HOME_MOON / 2
const HOLD = 700
const MOVE = 620
const CROSSFADE = 220

export function HomeSplash({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion()
  const { height } = useWindowDimensions()
  const moonTy = useSharedValue(0)
  const moonScale = useSharedValue(1)
  const moonOp = useSharedValue(1)
  const bgOp = useSharedValue(1)

  useEffect(() => {
    if (reduced) {
      runOnJS(onDone)()
      return
    }
    // Distance from screen center to the home anchor.
    const targetY = -(height / 2 - HOME_MOON_TOP)
    moonTy.value = withDelay(
      HOLD,
      withTiming(targetY, { duration: MOVE, easing: Easing.inOut(Easing.cubic) })
    )
    moonScale.value = withDelay(
      HOLD,
      withTiming(HOME_MOON / SPLASH_MOON, {
        duration: MOVE,
        easing: Easing.inOut(Easing.cubic),
      })
    )
    // Dark cover lifts halfway through the move (~bg starts lifting once the
    // moon is on its way) so the home reveals underneath.
    bgOp.value = withDelay(
      HOLD + MOVE * 0.4,
      withTiming(0, { duration: MOVE * 0.6, easing: Easing.in(Easing.quad) })
    )
    // After the moon has landed on the anchor, cross-fade the splash moon out
    // so we don't see two stacked moons. The home anchor is already painted
    // underneath; this hand-off is invisible.
    moonOp.value = withDelay(
      HOLD + MOVE,
      withTiming(0, { duration: CROSSFADE }, (finished) => {
        if (finished) runOnJS(onDone)()
      })
    )
  }, [moonTy, moonScale, moonOp, bgOp, onDone, reduced, height])

  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOp.value }))
  const moonStyle = useAnimatedStyle(() => ({
    opacity: moonOp.value,
    transform: [{ translateY: moonTy.value }, { scale: moonScale.value }],
  }))

  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, styles.bg, bgStyle]} pointerEvents='none' />
      <Animated.View style={[styles.center, moonStyle]} pointerEvents='none'>
        <V15Moon size={SPLASH_MOON} />
        <Text style={styles.word}>Kindred</Text>
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
    gap: 16,
  },
  word: {
    fontSize: 13,
    letterSpacing: 4,
    textTransform: 'uppercase',
    color: ricePaper.ivory,
  },
})
