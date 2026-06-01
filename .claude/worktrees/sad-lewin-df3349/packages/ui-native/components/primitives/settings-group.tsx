/**
 * SettingsGroup — iOS-style rounded grouped card.
 * backgroundColor: ios.card, borderRadius: 12, overflow: hidden.
 */
import type { ReactNode } from 'react'
import type { ViewStyle } from 'react-native'
import { View } from 'react-native'

interface IosPalette {
  card: string
}

interface SettingsGroupProps {
  children: ReactNode
  style?: ViewStyle
  ios: IosPalette
}

export function SettingsGroup({ children, style, ios }: SettingsGroupProps) {
  return (
    <View
      style={[
        {
          backgroundColor: ios.card,
          borderRadius: 12,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}
