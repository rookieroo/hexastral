/**
 * Motion tokens — duration, easing, and curve constants shared across all
 * HexAstral apps and the web.
 *
 * Consume directly in Reanimated v4 worklets:
 *
 *   import { motion } from '@zhop/hexastral-tokens/motion'
 *   const opacity = useSharedValue(0)
 *   opacity.value = withSpring(1, motion.easing.spring)
 *
 * Or in CSS / framer-motion (web):
 *
 *   transition: opacity 260ms cubic-bezier(0.2, 0, 0, 1)
 */

/** Standardized durations, in milliseconds. */
export const duration = {
  instant: 100, // toggle highlights, hover-out
  fast: 180, // tap response, ripples
  normal: 260, // page transitions, modal open
  slow: 400, // hero reveals, splash dismiss
  lazy: 600, // ambient ink-wash crossfades
} as const

export type MotionDurationKey = keyof typeof duration

/**
 * Reanimated v4 spring config presets.
 *
 * - `spring`: default page-level motion. Slight overshoot for a tactile feel.
 * - `snap`: toggles, taps, switches. Critically damped — no overshoot.
 * - `flow`: hero element reveals. Slow, gentle, no bounce.
 */
export const spring = {
  spring: { damping: 18, stiffness: 220, mass: 1 },
  snap: { damping: 26, stiffness: 380, mass: 0.8 },
  flow: { damping: 14, stiffness: 120, mass: 1 },
} as const

export type SpringKey = keyof typeof spring

/** CSS cubic-bezier curves for web parity. */
export const curve = {
  /** Material standard — fast-out, slow-in. Use for most transitions. */
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  /** Decelerate-only — entrance animations. */
  decel: 'cubic-bezier(0, 0, 0, 1)',
  /** Accelerate-only — exit animations. */
  accel: 'cubic-bezier(0.4, 0, 1, 1)',
  /** Quick snap — for state toggles where a hard edge is desirable. */
  snap: 'cubic-bezier(0.4, 0, 0.6, 1)',
} as const

export type CurveKey = keyof typeof curve

/**
 * Stagger constants for child-reveal animations.
 *
 * Use when a parent reveals N children sequentially:
 *   children.map((c, i) => withDelay(i * stagger.normal, withSpring(...)))
 */
export const stagger = {
  tight: 40,
  normal: 80,
  loose: 140,
} as const

export const motion = {
  duration,
  spring,
  curve,
  stagger,
} as const
