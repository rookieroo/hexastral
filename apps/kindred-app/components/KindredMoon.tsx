/**
 * KindredMoon — the brand moon anchor.
 *
 * Renders the SAME cinnabar phase-moon that the intro outro lands on
 * (`MoonPhaseLoader` + `SKIN_CINNABAR_INK` at phase 0.25, the right-lit
 * crescent), held STATIC. The earlier implementation wrapped `V15Moon` with
 * a `LOGO_CINNABAR_V15` radial — a rim-lit sphere whose lit edge competed
 * with the body and left the home anchor reading as "纯朱砂色月相" with no
 * phase distinction, breaking continuity with the intro.
 *
 * Using the same component as the intro guarantees the brand mark is
 * literally pixel-identical to where the intro hands off, so home anchor /
 * splash / empty / onboarding crown all share one cinnabar crescent.
 *
 * Size-adaptive ink (2026-06: "首页左上角的Logo和进场Logo不符"): the inkTerm
 * displacement is sized in canvas px (≈±7.5px tongues at full strength) and the
 * paper grain reads as speckle — at the 30px home anchor that's a quarter of the
 * disc, so the small mark looked far MORE irregular than the 132px splash and
 * read as a different glyph. We now scale `inkStrength` down with size and drop
 * the grain (`clean`) below 64px, so the small anchor is a calm crescent that
 * matches the entrance splash instead of a blotch. Large sizes (splash / empty /
 * paywall hero, 96–132) keep the full water-ink character unchanged.
 */

import { MoonPhaseLoader, SKIN_CINNABAR_INK } from '@zhop/core-ui/motion'
import { useSharedValue } from 'react-native-reanimated'

export interface KindredMoonProps {
  size?: number
}

/** ±tongue size is fixed in px, so shrink it (and the speckle) with the disc. */
function inkStrengthForSize(size: number): number {
  // Ramp 0.35 (30px anchor) → 1.0 (≥96px hero); clamped at both ends.
  const s = 0.35 + (size - 30) * ((1 - 0.35) / (96 - 30))
  return Math.max(0.35, Math.min(1, s))
}

export function KindredMoon({ size = 64 }: KindredMoonProps) {
  // Static at 0.25 — same right-lit crescent the intro's focal moon settles
  // on right before this anchor takes over. Created locally per instance so
  // each render gets its own shared value (cheap; no animation drives it).
  const phase = useSharedValue(0.25)
  return (
    <MoonPhaseLoader
      size={size}
      phase={phase}
      skin={SKIN_CINNABAR_INK}
      // Below ~64px the paper grain is pure speckle — drop it so the small
      // anchor stays a clean crescent. The inkTerm edge (scaled) stays.
      clean={size < 64}
      inkStrength={inkStrengthForSize(size)}
    />
  )
}
