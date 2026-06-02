/**
 * Fate tab — inset section card (Ink Brutalism).
 * Use for dense utility clusters (shortcuts, recent). Not for editorial hero blocks.
 */

import type { ReactNode } from 'react'
import { View, type ViewStyle } from 'react-native'
import { useIosPalette, useTheme } from '@/lib/theme'

export interface FateHomeInsetCardProps {
  children: ReactNode
  /** Space above this card (first card after hero often larger). */
  marginTop?: number
  style?: ViewStyle
}

export function FateHomeInsetCard({ children, marginTop = 12, style }: FateHomeInsetCardProps) {
  const ios = useIosPalette()
  const { colors } = useTheme()

  return (
    <View
      style={[
        {
          alignSelf: 'stretch',
          marginHorizontal: 16,
          marginTop,
          paddingHorizontal: 16,
          paddingVertical: 16,
          backgroundColor: ios.card,
          borderWidth: 0.5,
          borderColor: colors.border,
          borderRadius: 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}
