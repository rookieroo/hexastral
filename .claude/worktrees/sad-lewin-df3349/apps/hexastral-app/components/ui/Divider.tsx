/**
 * Divider — 0.5px horizontal separator line.
 */

import { View, type ViewStyle } from 'react-native'
import { useIosPalette } from '@/lib/theme'

interface DividerProps {
  style?: ViewStyle
}

export function Divider({ style }: DividerProps) {
  const ios = useIosPalette()
  return <View style={[{ height: 0.5, backgroundColor: ios.separator }, style]} />
}
