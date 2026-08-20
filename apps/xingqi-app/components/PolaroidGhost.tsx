/**
 * Empty well — minimal corner brackets only (no inner rect = no double frame).
 */

import { useTheme } from '@zhop/core-ui'
import { View } from 'react-native'

function Corner({
  color,
  top,
  left,
  right,
  bottom,
  flipX,
  flipY,
}: {
  color: string
  top?: number
  left?: number
  right?: number
  bottom?: number
  flipX?: boolean
  flipY?: boolean
}) {
  return (
    <View
      pointerEvents='none'
      style={{
        position: 'absolute',
        top,
        left,
        right,
        bottom,
        width: 11,
        height: 11,
        borderColor: color,
        borderTopWidth: flipY ? 0 : 1,
        borderBottomWidth: flipY ? 1 : 0,
        borderLeftWidth: flipX ? 0 : 1,
        borderRightWidth: flipX ? 1.5 : 0,
        opacity: 0.3,
      }}
    />
  )
}

export function PolaroidGhost() {
  const { colors } = useTheme()
  return (
    <View style={{ flex: 1 }}>
      <Corner color={colors.separator} top={8} left={8} />
      <Corner color={colors.separator} top={8} right={8} flipX />
      <Corner color={colors.separator} bottom={8} left={8} flipY />
      <Corner color={colors.separator} bottom={8} right={8} flipX flipY />
    </View>
  )
}
