/**
 * Card — bordered content container (Ink Brutalism)
 *
 * borderWidth: 0.5, borderRadius: 0, padding: 20
 * Use for reading sections, archetype cards, dimension panels, etc.
 */

import type { ReactNode } from 'react'
import type { ViewStyle } from 'react-native'
import { View } from 'react-native'
import { useTheme } from '@/lib/theme'

interface CardProps {
  children: ReactNode
  style?: ViewStyle
}

export function Card({ children, style }: CardProps) {
  const { colors } = useTheme()
  return (
    <View
      style={[
        {
          borderWidth: 0.5,
          borderColor: colors.border,
          borderRadius: 0,
          padding: 20,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}
