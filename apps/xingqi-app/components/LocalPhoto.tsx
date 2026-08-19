/**
 * Local / file photo. Prefer expo-image when the native module is linked;
 * otherwise RN Image so an older Syel dev client can still boot.
 */

import type { ReactElement } from 'react'
import { Image as RNImage, type ImageStyle, type StyleProp } from 'react-native'

type ExpoImageComponent = (props: {
  source: { uri: string }
  style?: StyleProp<ImageStyle>
  contentFit?: 'cover' | 'contain'
  cachePolicy?: 'memory-disk' | 'none'
}) => ReactElement

function hasImageExport(mod: object): mod is { Image: unknown } {
  return 'Image' in mod
}

function isExpoImageComponent(value: unknown): value is ExpoImageComponent {
  return typeof value === 'function'
}

function loadExpoImage(): ExpoImageComponent | null {
  try {
    const mod: unknown = require('expo-image')
    if (!mod || typeof mod !== 'object' || !hasImageExport(mod)) return null
    if (!isExpoImageComponent(mod.Image)) return null
    return mod.Image
  } catch {
    return null
  }
}

const ExpoImage = loadExpoImage()

export function LocalPhoto({ uri, style }: { uri: string; style?: StyleProp<ImageStyle> }) {
  if (ExpoImage) {
    return (
      <ExpoImage source={{ uri }} style={style} contentFit='cover' cachePolicy='memory-disk' />
    )
  }
  return <RNImage source={{ uri }} style={style} resizeMode='cover' />
}
