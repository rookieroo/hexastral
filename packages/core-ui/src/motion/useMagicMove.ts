/**
 * useMagicMove — the "one element, multiple positions" pattern.
 *
 * Verified in /spike/flip-magic. Replaces the FLIP-clone approach (which
 * always jitters at the swap point) with a single-element model: the visual
 * is rendered ONCE, absolutely positioned, and its translate animates
 * between layout slots measured at trigger time.
 *
 * Each slot is just an empty View whose layout reserves the space — the
 * actual visual (moon, icon, anything) lives separately at the top of the
 * parent and is moved via this hook's animated style.
 *
 * Usage
 *
 *   const phoneRef = useAnimatedRef<View>()
 *   const splashSlotRef = useAnimatedRef<View>()
 *   const heroSlotRef = useAnimatedRef<View>()
 *
 *   const magic = useMagicMove({ phoneRef })
 *
 *   // Initial position
 *   useEffect(() => { magic.snapTo(splashSlotRef) }, [])
 *
 *   return (
 *     <View ref={phoneRef}>
 *       <View ref={splashSlotRef} style={{ width: 150, height: 150 }} />
 *       <View ref={heroSlotRef} style={{ width: 150, height: 150 }} />
 *
 *       <Animated.View style={[ABSOLUTE, magic.moonStyle]}>
 *         <V15Moon size={150} />
 *       </Animated.View>
 *
 *       <Pressable onPress={() => magic.moveTo(heroSlotRef)}>...</Pressable>
 *     </View>
 *   )
 */

import { useCallback, useMemo } from 'react'
import type { View } from 'react-native'
import {
  type AnimatedRef,
  Easing,
  type EasingFunction,
  type EasingFunctionFactory,
  measure,
  runOnJS,
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

const DEFAULT_DURATION = 580 // HTML POC magic-move duration
const DEFAULT_EASING = Easing.bezier(0.4, 0, 0.2, 1)

/** Easing accepted by Reanimated withTiming (raw fn or factory like Easing.bezier()). */
export type MagicEasing = EasingFunction | EasingFunctionFactory

export type UseMagicMoveOptions = {
  /**
   * Common ancestor whose coords magic-move uses for translate. Usually the
   * phone container or screen root.
   */
  phoneRef: AnimatedRef<View>
  /** Animation duration in ms. Default 580ms. */
  duration?: number
  /** Custom easing. Default Material standard (0.4, 0, 0.2, 1). */
  easing?: MagicEasing
}

// Note: deliberately NOT writing an explicit return-type annotation —
// useAnimatedStyle returns a deeply-typed style object whose inferred type
// satisfies <Animated.View style=>'s prop. Annotating it as
// `ReturnType<typeof useAnimatedStyle>` widens it back to DefaultStyle and
// breaks consumer type-checking.

/**
 * Hook that gives you `{ moonStyle, moveTo, snapTo }` for the
 * single-element-multi-slot magic-move pattern.
 */
export function useMagicMove({
  phoneRef,
  duration = DEFAULT_DURATION,
  easing = DEFAULT_EASING,
}: UseMagicMoveOptions) {
  const x = useSharedValue(0)
  const y = useSharedValue(0)

  const moonStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }))

  const moveTo = useCallback(
    (slotRef: AnimatedRef<View>) => {
      runOnUI(() => {
        'worklet'
        const p = measure(phoneRef)
        const s = measure(slotRef)
        if (!p || !s) {
          runOnJS(console.warn)('[useMagicMove] measure failed', {
            phone: !!p,
            slot: !!s,
          })
          return
        }
        x.value = withTiming(s.pageX - p.pageX, { duration, easing })
        y.value = withTiming(s.pageY - p.pageY, { duration, easing })
      })()
    },
    [phoneRef, duration, easing, x, y]
  )

  const snapTo = useCallback(
    (slotRef: AnimatedRef<View>) => {
      runOnUI(() => {
        'worklet'
        const p = measure(phoneRef)
        const s = measure(slotRef)
        if (!p || !s) {
          runOnJS(console.warn)('[useMagicMove] snap measure failed', {
            phone: !!p,
            slot: !!s,
          })
          return
        }
        x.value = s.pageX - p.pageX
        y.value = s.pageY - p.pageY
      })()
    },
    [phoneRef, x, y]
  )

  return useMemo(() => ({ x, y, moonStyle, moveTo, snapTo }), [x, y, moonStyle, moveTo, snapTo])
}
