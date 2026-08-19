/**
 * Empty well — corner brackets + inner frame guide the capture locus.
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
        width: 14,
        height: 14,
        borderColor: color,
        borderTopWidth: flipY ? 0 : 1.5,
        borderBottomWidth: flipY ? 1.5 : 0,
        borderLeftWidth: flipX ? 0 : 1.5,
        borderRightWidth: flipX ? 1.5 : 0,
        opacity: 0.52,
      }}
    />
  )
}

export function PolaroidGhost() {
  const { colors } = useTheme()
  const guide = colors.secondary
  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View
        pointerEvents='none'
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          bottom: 10,
          left: 10,
          borderWidth: 0.5,
          borderColor: colors.separator,
          opacity: 0.85,
        }}
      />
      <Corner color={guide} top={6} left={6} />
      <Corner color={guide} top={6} right={6} flipX />
      <Corner color={guide} bottom={6} left={6} flipY />
      <Corner color={guide} bottom={6} right={6} flipX flipY />
    </View>
  )
}
