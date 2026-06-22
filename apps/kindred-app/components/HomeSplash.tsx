/**
 * HomeSplash — the Yuel knot logo hand-off on cold launch.
 *
 * ONE motion, no embellishment: the brand knot (YuelMark / 同心结) is already
 * on-screen and centered (continuing the native splash), holds for a still beat,
 * then travels + shrinks to LAND on the home's top-left brand mark — the SAME
 * YuelMark glyph, exactly where the home shows it. The dark cover lifts during the
 * move; once the knot overlaps the resting anchor it cross-fades out so you don't
 * see two marks: a shared-element hand-off into the home logo.
 *
 * No bounce / scale-overshoot / fade-in (founder 2026-06: "做神奇动画就不该再叠加多余
 * 的 bounce"): the hand-off IS the animation, so nothing is stacked on top of it.
 * The knot starts fully opaque at scale 1 so it does NOT blink at the native-splash
 * → JS-splash seam (both show the same centered knot on the same dark ground).
 *
 * The home brand mark is the YuelMark knot (the logo + app icon, commit eee8329),
 * so the splash flies the knot → identical knot. The cinnabar moon lives on as the
 * onboarding intro + empty-state hero, not the cold-launch logo.
 *
 * Landing is computed from the real safe-area insets + the top-bar padding
 * (matches app/(reading)/index.tsx topBar: screenH left, sm top, vertical mark height 26).
 * The "Yuel" wordmark is the home's own inline text (revealed as the cover lifts),
 * so the splash flies the knot alone. Gated by `consumeSplashDecision()` (once per
 * cold launch); honours reduced-motion.
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
import { YuelMark } from '@/components/YuelMark'

// The whole suite is the VERTICAL seal, so the splash flies the vertical YuelMark
// (size = its HEIGHT / long axis). MARK_RATIO = short ÷ long (the mark's width ÷ height).
const MARK_RATIO = 563 / 1229
const SPLASH_MARK = 200
// Matches the home top-left brand mark HEIGHT (app/(reading)/index.tsx topBar YuelMark).
const HOME_MARK = 26
const HOLD = 520
const MOVE = 640
const CROSSFADE = 200

export function HomeSplash({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion()
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const tx = useSharedValue(0)
  const ty = useSharedValue(0)
  const scale = useSharedValue(1)
  const markOp = useSharedValue(1)
  const bgOp = useSharedValue(1)

  useEffect(() => {
    if (reduced) {
      runOnJS(onDone)()
      return
    }
    const move = { duration: MOVE, easing: Easing.inOut(Easing.cubic) }
    const target = HOME_MARK / SPLASH_MARK
    // Resting rect of the home's top-left vertical YuelMark: inside the SafeAreaView
    // the top bar pads by screenH (left) + sm (top); the mark sits at that corner at
    // HOME_MARK height (× MARK_RATIO wide). Translate the splash knot's CENTER to the
    // home mark's center — same aspect ratio, so the uniform scale lands it aligned.
    const restCx = insets.left + kindredSpacing.screenH + (HOME_MARK * MARK_RATIO) / 2
    const restCy = insets.top + kindredSpacing.sm + HOME_MARK / 2

    // Single motion: after a still beat, the centered knot flies to the home logo
    // (shrink + cover lift), then cross-fades onto the resting anchor.
    tx.value = withDelay(HOLD, withTiming(restCx - width / 2, move))
    ty.value = withDelay(HOLD, withTiming(restCy - height / 2, move))
    scale.value = withDelay(HOLD, withTiming(target, move))
    bgOp.value = withDelay(
      HOLD + MOVE * 0.4,
      withTiming(0, { duration: MOVE * 0.6, easing: Easing.in(Easing.quad) })
    )
    markOp.value = withDelay(
      HOLD + MOVE,
      withTiming(0, { duration: CROSSFADE }, (finished) => {
        if (finished) runOnJS(onDone)()
      })
    )
  }, [tx, ty, scale, markOp, bgOp, onDone, reduced, width, height, insets.left, insets.top])

  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOp.value }))
  const markStyle = useAnimatedStyle(() => ({
    opacity: markOp.value,
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }))

  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, styles.bg, bgStyle]} pointerEvents='none' />
      <Animated.View style={[styles.center, markStyle]} pointerEvents='none'>
        <YuelMark vertical size={SPLASH_MARK} color={kindredDark.seal} />
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
