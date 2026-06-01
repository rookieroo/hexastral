/**
 * Card — bordered content container (Ink Brutalism: square edges, 0.5px border).
 */
import type { ReactNode } from 'react'
import type { ViewStyle } from 'react-native'
import { View } from 'react-native'

interface IosPalette {
  separator: string
}

interface CardProps {
  children: ReactNode
  style?: ViewStyle
  ios: IosPalette
}

export function Card({ children, style, ios }: CardProps) {
  return (
    <View
      style={[
        {
          borderWidth: 0.5,
          borderColor: ios.separator,
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
