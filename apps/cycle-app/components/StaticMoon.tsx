/**
 * StaticMoon — the 月相 for the watch/widget tiers, driven by the 阴历 (农历) day.
 * Wraps the shared Skia `MoonPhaseLoader`; on mount it animates the shadow from
 * 新月 up to TODAY's phase, then holds — a subtle moon-simulation entrance (and
 * the proven render path: an animated SharedValue, same as ming-pan-app's
 * loaders) that ends at the accurate current phase. `skinId` selects the face.
 *
 * cycle-app ships `@shopify/react-native-skia` (run `bun install` + an iOS
 * rebuild — `expo prebuild` / pod install — for the native module).
 */

import { MoonPhaseLoader } from '@zhop/core-ui/motion'
import { MOON_SKINS_BY_ID, SKIN_SILVER } from '@zhop/hexastral-tokens/moon'
import { useEffect } from 'react'
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated'
import type { MoonSkinId } from '@/lib/widget-config'

export function StaticMoon({
  phase,
  size,
  skinId,
}: {
  phase: number
  size: number
  skinId?: MoonSkinId
}) {
  const p = useSharedValue(0)
  useEffect(() => {
    p.value = withTiming(phase, { duration: 1200, easing: Easing.out(Easing.cubic) })
  }, [phase, p])
  const skin = (skinId && MOON_SKINS_BY_ID[skinId]) || SKIN_SILVER
  // Keep the water-ink shadow (the differentiator) but scale its displacement down
  // with size so it stays a fine texture, not big tongues; drop the grain speckle
  // (`clean`) and the halo for a crisp small moon.
  const inkStrength = Math.min(1, size / 120)
  return (
    <MoonPhaseLoader
      size={size}
      phase={p}
      skin={skin}
      clean
      inkStrength={inkStrength}
      halo={false}
    />
  )
}
