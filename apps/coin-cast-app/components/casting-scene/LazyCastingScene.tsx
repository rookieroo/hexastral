import { lazy, Suspense, type ComponentProps } from 'react'
import { ActivityIndicator, View } from 'react-native'

import { useAppTheme } from '@/lib/theme'

const CastingSceneLazy = lazy(() =>
  import('./CastingScene').then((m) => ({ default: m.CastingScene }))
)

type CastingSceneProps = ComponentProps<typeof CastingSceneLazy>

export function LazyCastingScene(props: CastingSceneProps) {
  const { colors } = useAppTheme()

  return (
    <Suspense
      fallback={
        <View
          style={[
            { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
            props.style,
          ]}
        >
          <ActivityIndicator color={colors.secondary} />
        </View>
      }
    >
      <CastingSceneLazy {...props} />
    </Suspense>
  )
}

/** Warm Three.js + procedural textures off the critical path. */
export function preloadCastingScene(): void {
  void import('./CastingScene')
  void import('@/lib/coin-skins').then((m) => {
    m.createCoinSkinMaterials(m.DEFAULT_COIN_SKIN_ID)
  })
  void import('./proceduralAltarWood').then((m) => {
    m.createProceduralAltarWoodTextures()
  })
}
