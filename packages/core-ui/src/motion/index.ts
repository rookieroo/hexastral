/**
 * Motion helpers built on Reanimated v4 worklets, themed against
 * `@zhop/hexastral-tokens/motion` presets.
 *
 * Re-export the raw tokens too so consumers don't double-import.
 */

// Re-export moon tokens for convenience (consumed by MoonPhaseLoader + V15Moon).
export type {
  LogoMoonSkin,
  MoonFaceSkin,
  MoonStop,
  MoonSurface,
} from '@zhop/hexastral-tokens/moon'
export {
  ALL_MOON_SKINS,
  DEFAULT_MOON_SKIN,
  DEFAULT_SHADOW_STOPS,
  LOGO_DEFAULT_V15,
  LOGO_MOON_R,
  MOON_CX,
  MOON_CY,
  MOON_R,
  MOON_SKINS_BY_ID,
  MOON_VIEWBOX,
  PHASE_DUR,
  PHASE_DUR_MINI,
  phaseToCx,
  SHADOW_R,
  SKIN_BRONZE,
  SKIN_CINNABAR,
  SKIN_JADE,
  SKIN_MOON_WHITE,
  SKIN_RICE_PAPER,
  SKIN_SILVER,
  SWEEP,
} from '@zhop/hexastral-tokens/moon'
export type { CurveKey, MotionDurationKey, SpringKey } from '@zhop/hexastral-tokens/motion'
export { curve, duration, motion, spring, stagger } from '@zhop/hexastral-tokens/motion'
export type { InkBloomMaskProps, InkWipeRevealProps } from './InkWipeReveal'
export { InkBloomMask, InkWipeReveal } from './InkWipeReveal'
export type {
  AutoMoonPhaseLoaderProps,
  MoonPhaseLoaderProps,
} from './MoonPhaseLoader'
export {
  AutoMoonPhaseLoader,
  MoonPhaseLoader,
  useMoonPhase,
} from './MoonPhaseLoader'
export type { SealStampProps } from './SealStamp'
export { SealStamp } from './SealStamp'
export type { UnsealRevealProps } from './UnsealReveal'
export { UnsealReveal } from './UnsealReveal'
export type {
  MagicEasing,
  UseMagicMoveOptions,
} from './useMagicMove'
export { useMagicMove } from './useMagicMove'
export { usePressScale } from './usePressScale'
export { useShimmer } from './useShimmer'
export type { V15MoonProps } from './V15Moon'
export { V15Moon } from './V15Moon'
