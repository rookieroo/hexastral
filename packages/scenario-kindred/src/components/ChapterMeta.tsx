/**
 * YongshenKey — the 用神 (favourable / bridging element) as a 朱文 chop: a
 * cinnabar-outline seal with the hand-authored element glyph filling the 印面.
 * Sits in the 解法 layer's gutter; its meaning is decoded in the Settings glossary.
 */

import { kindredPaper } from '@zhop/hexastral-tokens/kindred'
import { View } from 'react-native'
import { WUXING_GLYPH } from '../glyphs'
import { AncientSeal } from './AncientSeal'

export function YongshenKey({ element, size = 40 }: { element?: string; size?: number }) {
  const key = element ? WUXING_GLYPH[element] : undefined
  if (!key) return null
  return (
    <View style={{ marginTop: 9 }}>
      <AncientSeal
        glyph={key}
        size={size}
        tile={kindredPaper.cinnabar}
        ink={kindredPaper.cinnabar}
        outline
        inset={0.78}
        strokeWidth={9}
      />
    </View>
  )
}
