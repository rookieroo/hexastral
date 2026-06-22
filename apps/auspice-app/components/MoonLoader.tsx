/**
 * MoonLoader — Yuun's brand loading spinner: the shared Skia moon-phase loader in
 * the 苍墨 ink skin. The almanac is lunar, so the turning moon is the natural
 * "working" motif (the cinnabar twin is Yuel's loader). Replaces the generic
 * ActivityIndicator across the app — one motion language, locked to the ink brand.
 */
import { AutoMoonPhaseLoader } from '@zhop/core-ui/motion'
import { SKIN_INK } from '@zhop/hexastral-tokens/moon'

export function MoonLoader({ size = 56 }: { size?: number }) {
  return <AutoMoonPhaseLoader size={size} skin={SKIN_INK} />
}
