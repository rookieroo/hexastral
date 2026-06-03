/**
 * KindredMoon — the brand moon anchor in 朱砂 (cinnabar).
 *
 * Thin wrapper over core-ui's V15Moon that pins Kindred's cinnabar logo skin
 * (LOGO_CINNABAR_V15), so every static brand moon — home anchor, HomeSplash,
 * empty / error states, onboarding crowns — reads as the same red moon as the
 * intro's cinnabar phase-moon, instead of the grey 水墨月 default. Centralised
 * here so the HomeSplash → home-anchor magic-move stays one consistent skin.
 */

import { V15Moon, type V15MoonProps } from '@zhop/core-ui/motion'
import { LOGO_CINNABAR_V15 } from '@zhop/hexastral-tokens/moon'

export function KindredMoon(props: Omit<V15MoonProps, 'skin'>) {
  return <V15Moon skin={LOGO_CINNABAR_V15} {...props} />
}
