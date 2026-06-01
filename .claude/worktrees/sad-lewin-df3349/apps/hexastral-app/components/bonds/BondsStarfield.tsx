/**
 * BondsStarfield — conditional wrapper.
 *
 * @shopify/react-native-skia is not available in Expo Go. This module
 * guards the real Skia implementation behind a runtime isExpoGo check so
 * `expo start --go` works without a native build.
 *
 * In Expo Go → renders a placeholder View.
 * In dev-client / production → renders the full GPU-accelerated force graph.
 */

import type { ComponentType } from 'react'
import { Text, View } from 'react-native'
import type { BondData } from '@/lib/domain/bonds'
import { isExpoGo } from '@/lib/native'

interface Props {
  bonds?: BondData[]
  activeNode?: string | null
  onNodePress?: (id: string) => void
  onClose: () => void
  avatarIndex?: number
  userAvatarUri?: string | null
  isDemo?: boolean
}

// Dynamic require — only executed outside Expo Go so the Skia native module
// factory is never called in a context where it doesn't exist.
// Metro includes BondsStarfieldImpl in the bundle but its module factory
// is not invoked unless this require() runs.
const NativeImpl: ComponentType<Props> | null = isExpoGo
  ? null
  : // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('./BondsStarfieldImpl').BondsStarfield as ComponentType<Props>)

export function BondsStarfield(props: Props) {
  if (!NativeImpl) {
    // Expo Go placeholder — Skia GPU canvas is not available
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#09090B',
        }}
      >
        <Text
          style={{ color: '#A1A1AA', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 }}
        >
          {'Bonds Starfield requires a dev-client build.\nRun: bun run dev:client'}
        </Text>
      </View>
    )
  }

  return <NativeImpl {...props} />
}
