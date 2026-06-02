/**
 * SettingsGroup — flat grouped card (Ink-Brutalism)
 *
 * Separates visual sections in Settings-style screens (profile, language, notifications).
 * Add individual rows as children; separators are handled by each row's borderBottom.
 */

import type { ReactNode } from 'react'
import type { ViewStyle } from 'react-native'
import { View } from 'react-native'
import { useTheme } from '@/lib/theme'

interface SettingsGroupProps {
  children: ReactNode
  style?: ViewStyle
}

export function SettingsGroup({ children, style }: SettingsGroupProps) {
  const { colors } = useTheme()
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 0,
          borderWidth: 0.5,
          borderColor: colors.border,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}
