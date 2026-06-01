/**
 * Divider — hairline separator. Honors the theme `separator` color.
 */

import { type StyleProp, View, type ViewStyle } from 'react-native'
import { useTheme } from '../theme'

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical'
  style?: StyleProp<ViewStyle>
}

export function Divider({ orientation = 'horizontal', style }: DividerProps) {
  const { colors } = useTheme()
  return (
    <View
      style={[
        orientation === 'horizontal'
          ? { height: 0.5, width: '100%', backgroundColor: colors.separator }
          : { width: 0.5, height: '100%', backgroundColor: colors.separator },
        style,
      ]}
    />
  )
}
