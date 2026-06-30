/**
 * FengHomeSplash — the intro→home logo hand-off.
 *
 * Yuel's HomeSplash idea: when the home mounts straight off the cold-open, a 墨
 * night cover holds the 風 mark centered (matching where intro left it), then
 * flies it up to the home header's brand spot while the cover fades — so the
 * logo appears continuous across the route change rather than cutting. Pure
 * reanimated transforms (no Skia). Honors reduce-motion (skips to done).
 */

import { useEffect } from 'react'
import { useWindowDimensions, View } from 'react-native'
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
import { FENG_PALETTE, spacing } from '@/lib/theme'
import { FengMark } from './FengMark'

const MARK_SIZE = 44
const MARK_W = MARK_SIZE * (765 / 717)

export function FengHomeSplash({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const reduceMotion = useReducedMotion()

  const progress = useSharedValue(0)
  const cover = useSharedValue(1)

  // center → header brand spot (top-left), matching the home header mark.
  const dx = spacing.xl + MARK_W / 2 - width / 2
  const dy = insets.top + spacing.sm + MARK_SIZE / 2 - height / 2

  useEffect(() => {
    if (reduceMotion) {
      onDone()
      return
    }
    progress.value = withDelay(
      280,
      withTiming(1, { duration: 660, easing: Easing.inOut(Easing.quad) })
    )
    cover.value = withDelay(
      640,
      withTiming(0, { duration: 320, easing: Easing.out(Easing.quad) }, (done) => {
        if (done) runOnJS(onDone)()
      })
    )
  }, [progress, cover, reduceMotion, onDone])

  const markStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: progress.value * dx },
      { translateY: progress.value * dy },
      { scale: 1.36 - 0.36 * progress.value },
    ],
  }))
  const coverStyle = useAnimatedStyle(() => ({ opacity: cover.value }))

  return (
    <Animated.View
      pointerEvents='none'
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        },
        coverStyle,
      ]}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: FENG_PALETTE.night,
        }}
      />
      <Animated.View style={markStyle}>
        <FengMark size={MARK_SIZE} />
      </Animated.View>
    </Animated.View>
  )
}
