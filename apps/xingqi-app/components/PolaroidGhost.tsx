/**
 * Empty polaroid well — repeating -18deg stripes at 6% / 3% fg (home-ui-mock.html).
 */

import { useTheme } from '@zhop/core-ui'
import { View } from 'react-native'

export function PolaroidGhost() {
  const { colors } = useTheme()
  return (
    <View style={{ flex: 1, overflow: 'hidden', backgroundColor: colors.card }}>
      {Array.from({ length: 28 }, (_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: i * 8 - 72,
            top: -48,
            width: 8,
            height: 260,
            backgroundColor: colors.text,
            opacity: i % 2 === 0 ? 0.06 : 0.03,
            transform: [{ rotate: '-18deg' }],
          }}
        />
      ))}
    </View>
  )
}
