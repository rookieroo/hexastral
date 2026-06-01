/**
 * SplashScreen — fate-app launch overlay.
 *
 * Renders the HEXASTRAL 水墨月 logo + wordmark on a paper field for ~1500ms,
 * then fades out over 500ms to reveal the underlying tab stack. Same visual
 * language as `motion-poc-fate-flow.html` #splash; uses the production
 * <V15Moon> from @zhop/core-ui/motion.
 *
 * Mounted unconditionally at root layout; self-dismisses and reports back
 * via onDismissed so the parent can short-circuit rendering after.
 */

import { V15Moon } from '@zhop/core-ui/motion'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'

const SPLASH_HOLD_MS = 1500
const SPLASH_FADE_MS = 500

export type SplashScreenProps = {
  /** Called once the splash has fully faded out. */
  onDismissed?: () => void
}

export function SplashScreen({ onDismissed }: SplashScreenProps) {
  const opacity = useSharedValue(1)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    // Brief hold → fade out → unmount
    opacity.value = withDelay(
      SPLASH_HOLD_MS,
      withTiming(0, { duration: SPLASH_FADE_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) {
          runOnJS(setHidden)(true)
          if (onDismissed) runOnJS(onDismissed)()
        }
      })
    )
  }, [opacity, onDismissed])

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  if (hidden) return null

  return (
    <Animated.View style={[styles.root, fadeStyle]} pointerEvents={hidden ? 'none' : 'auto'}>
      <View style={styles.center}>
        <V15Moon size={150} />
        <Text style={styles.wm}>
          HEXASTRAL <Text style={styles.wmCn}>命</Text>
        </Text>
        <Text style={styles.wms}>LIFELONG BIRTH CHART</Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#EAE3D2', // matches HTML POC #splash paper
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  center: {
    alignItems: 'center',
  },
  wm: {
    color: '#2a241a',
    fontSize: 20,
    letterSpacing: 6,
    marginTop: 24,
    fontFamily: 'Songti SC',
  },
  wmCn: {
    color: '#9B2226',
    fontSize: 20,
    marginLeft: 6,
  },
  wms: {
    color: '#9b8c66',
    fontSize: 9,
    letterSpacing: 5,
    marginTop: 7,
    textTransform: 'uppercase',
  },
})
