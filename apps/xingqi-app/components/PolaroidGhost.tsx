/**
 * Empty well — same paper/ink chrome as a filled slot.
 * Corner ticks mark the frame; they sit under a photo when one exists.
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
        width: 10,
        height: 10,
        borderColor: color,
        borderTopWidth: flipY ? 0 : 1,
        borderBottomWidth: flipY ? 1 : 0,
        borderLeftWidth: flipX ? 0 : 1,
        borderRightWidth: flipX ? 1 : 0,
        opacity: 0.22,
      }}
    />
  )
}

export function PolaroidGhost() {
  const { colors } = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Corner color={colors.text} top={7} left={7} />
      <Corner color={colors.text} top={7} right={7} flipX />
      <Corner color={colors.text} bottom={7} left={7} flipY />
      <Corner color={colors.text} bottom={7} right={7} flipX flipY />
    </View>
  )
}
