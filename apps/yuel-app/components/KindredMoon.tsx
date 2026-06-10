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
 */

import { MoonPhaseLoader, SKIN_CINNABAR_INK } from '@zhop/core-ui/motion'
import { useSharedValue } from 'react-native-reanimated'

export interface KindredMoonProps {
  size?: number
}

export function KindredMoon({ size = 64 }: KindredMoonProps) {
  // Static at 0.25 — same right-lit crescent the intro's focal moon settles
  // on right before this anchor takes over. Created locally per instance so
  // each render gets its own shared value (cheap; no animation drives it).
  const phase = useSharedValue(0.25)
  return <MoonPhaseLoader size={size} phase={phase} skin={SKIN_CINNABAR_INK} />
}
