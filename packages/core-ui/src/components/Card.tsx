/**
 * Card — surface container with elevation token. Replaces the flat bordered
 * `<View>` rectangles found across apps with proper visual layering.
 */

import type { ElevationKey } from '@zhop/hexastral-tokens/elevation'
import type { ReactNode } from 'react'
import { Platform, type StyleProp, View, type ViewStyle } from 'react-native'
import { useTheme } from '../theme'

export type CardVariant = 'flat' | 'elevated' | 'outlined'

export interface CardProps {
  children: ReactNode
  variant?: CardVariant
  /** Elevation level (defaults: flat→none, elevated→sm, outlined→none). */
  elevation?: ElevationKey
  /** Inner padding scale; defaults to `lg` (16px). */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  style?: StyleProp<ViewStyle>
}

export function Card({
  children,
  variant = 'elevated',
  elevation: elevationOverride,
  padding = 'lg',
  style,
}: CardProps) {
  const { colors, spacing, getElevation } = useTheme()

  const elevKey: ElevationKey = elevationOverride ?? (variant === 'elevated' ? 'sm' : 'none')
  const elev = getElevation(elevKey)

  const paddingValue =
    padding === 'none'
      ? 0
      : padding === 'sm'
        ? spacing.sm
        : padding === 'md'
          ? spacing.md
          : padding === 'xl'
            ? spacing.xl
            : spacing.lg

  const elevationStyle: ViewStyle =
    Platform.OS === 'ios' && elev.iosShadow
      ? elev.iosShadow
      : Platform.OS === 'android'
        ? { elevation: elev.androidElevation }
        : {}

  return (
    <View
      style={[
        {
          backgroundColor: variant === 'elevated' ? colors.cardElevated : colors.card,
          borderWidth: variant === 'outlined' ? 0.5 : 0,
          borderColor: colors.separator,
          padding: paddingValue,
        },
        elevationStyle,
        style,
      ]}
    >
      {children}
    </View>
  )
}
