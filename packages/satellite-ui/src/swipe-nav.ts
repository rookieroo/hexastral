/**
 * Shared no-bottom-tab navigation contract (ADR-0018).
 *
 * The matrix replaces the bottom tab bar with a left-swipe-to-Me gesture on each
 * app's home screen. These are the tuning constants + the commit thresholds,
 * kept identical across MingPan / cycle / feng / yuan so the gesture feels the
 * same everywhere and the muscle-memory carries between apps.
 *
 * Intentionally pure data — no `react-native-gesture-handler` / `react-native-reanimated`
 * import — so this package takes no heavy native peer deps. Each app wires its own
 * `Gesture.Pan()` from these values (see the reference impl in
 * `apps/ming-pan-app/app/(tabs)/index.tsx`).
 */
export const SWIPE_TO_ME: {
  /** `Gesture.Pan().activeOffsetX` — horizontal slop before the pan activates (keeps vertical scroll free). */
  activeOffsetX: [number, number]
  /** `Gesture.Pan().failOffsetY` — vertical travel that cancels the swipe (finger committed to scrolling). */
  failOffsetY: [number, number]
  /** `onEnd` worklet commits when `translationX` is below this (i.e. a leftward swipe past 56px). */
  commitDx: number
  /** ...and `|translationY|` stays under this (mostly-horizontal). */
  maxDy: number
  /** ms the user must dwell on home before a swipe-discoverability hint should fade in. */
  hintDelayMs: number
} = {
  activeOffsetX: [-24, 24],
  failOffsetY: [-28, 28],
  commitDx: -56,
  maxDy: 80,
  hintDelayMs: 3000,
}
