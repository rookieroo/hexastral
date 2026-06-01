/**
 * Pill — small label chip. Hairline border + brand-tinted text.
 * Use for status badges, chapter kind labels, filter chips.
 */

import type { ReactNode } from 'react'
import { type StyleProp, View, type ViewStyle } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

export type PillVariant = 'accent' | 'mute' | 'success' | 'warning' | 'danger'

export interface PillProps {
  children: ReactNode
  variant?: PillVariant
  style?: StyleProp<ViewStyle>
}

export function Pill({ children, variant = 'accent', style }: PillProps) {
  const { colors, spacing } = useTheme()

  const color =
    variant === 'accent'
      ? colors.accent
      : variant === 'success'
        ? colors.success
        : variant === 'warning'
          ? colors.warning
          : variant === 'danger'
            ? colors.danger
            : colors.dim

  return (
    <View
      style={[
        {
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
          borderWidth: 0.5,
          borderColor: color,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text variant='label' style={{ color, letterSpacing: 1.6 }}>
        {children}
      </Text>
    </View>
  )
}
