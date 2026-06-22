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
import { MOON_SKINS_BY_ID, SKIN_INK } from '@zhop/hexastral-tokens/moon'
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
  const skinBase = (skinId && MOON_SKINS_BY_ID[skinId]) || SKIN_INK
  const sizeK = Math.min(1, size / 120)
  // Keep the water-ink shadow (the brand differentiator) but scale its edge
  // displacement down with size so it stays a fine texture, not big tongues.
  const inkStrength = sizeK
  // Unify the two faces. Previously `clean` stripped the surface grain entirely,
  // leaving a glossy radial-gradient lit face that clashed with the water-ink
  // shadow edge (光滑 vs 水墨). Instead keep a faint, size-scaled grain across the
  // WHOLE disc so the lit face shares the shadow's material — floored at 0.4 so
  // even small moons read as textured (not plastic), never above the skin default.
  const skin =
    skinBase.surface.kind === 'none'
      ? skinBase
      : {
          ...skinBase,
          surface: {
            ...skinBase.surface,
            opacity: (skinBase.surface.opacity ?? 0.18) * (0.4 + 0.6 * sizeK),
          },
        }
  return (
    <MoonPhaseLoader size={size} phase={p} skin={skin} inkStrength={inkStrength} halo={false} />
  )
}
